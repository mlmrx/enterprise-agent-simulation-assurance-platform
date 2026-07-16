import { canonicalizeJson, contentAddress, EMPTY_SHA256 } from "./canonical.ts";
import { SeededPrng } from "./prng.ts";
import type {
  Campaign,
  CampaignResult,
  CampaignStatistics,
  Capability,
  CapabilityRequest,
  ContentDigest,
  FaultInjectorSpec,
  Finding,
  JsonObject,
  JsonValue,
  Observation,
  OracleDecision,
  OracleOperator,
  OracleSpec,
  ReplayResult,
  ResultManifest,
  Scenario,
  ScenarioEvent,
  Seed,
  StateMutation,
  SubjectBundle,
  SubjectExecutionOutput,
  SubjectExecutor,
  Trial,
  TrialRunInput,
  WorldModel,
} from "./types.ts";

type MutableJson = null | boolean | number | string | MutableJson[] | { [key: string]: MutableJson };
type MutableObject = { [key: string]: MutableJson };

export class ManifestIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestIntegrityError";
  }
}

export class ResourceLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceLimitError";
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(canonicalizeJson(value)) as T;
}

function pointerSegments(path: string): string[] {
  if (path === "") return [];
  if (!path.startsWith("/")) throw new TypeError(`JSON Pointer must start with '/': ${path}`);
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function assertSafeSegment(segment: string): void {
  if (segment === "__proto__" || segment === "prototype" || segment === "constructor") {
    throw new TypeError(`Unsafe state path segment: ${segment}`);
  }
}

function arrayIndex(segment: string, allowAppend: boolean): number {
  if (allowAppend && segment === "-") return -1;
  if (!/^(0|[1-9][0-9]*)$/u.test(segment)) throw new TypeError(`Invalid array index: ${segment}`);
  const index = Number(segment);
  if (!Number.isSafeInteger(index)) throw new TypeError(`Array index is not safe: ${segment}`);
  return index;
}

function resolveParent(root: MutableJson, path: string): { parent: MutableJson; key: string } {
  const segments = pointerSegments(path);
  if (segments.length === 0) throw new TypeError("Root state mutation is not supported");
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    assertSafeSegment(segment);
    if (Array.isArray(current)) {
      const next = current[arrayIndex(segment, false)];
      if (next === undefined) throw new TypeError(`State path does not exist: ${path}`);
      current = next;
    } else if (current !== null && typeof current === "object") {
      const next = current[segment];
      if (next === undefined) throw new TypeError(`State path does not exist: ${path}`);
      current = next;
    } else {
      throw new TypeError(`State path crosses a scalar: ${path}`);
    }
  }
  const key = segments.at(-1)!;
  assertSafeSegment(key);
  return { parent: current, key };
}

function applyMutation(state: MutableObject, mutation: StateMutation): void {
  const { parent, key } = resolveParent(state, mutation.path);
  const read = (): MutableJson | undefined => {
    if (Array.isArray(parent)) return parent[arrayIndex(key, false)];
    if (parent !== null && typeof parent === "object") return parent[key];
    throw new TypeError(`State mutation parent is a scalar: ${mutation.path}`);
  };
  const write = (value: MutableJson): void => {
    if (Array.isArray(parent)) {
      const index = arrayIndex(key, mutation.op === "append");
      if (index === -1) parent.push(value);
      else parent[index] = value;
    } else if (parent !== null && typeof parent === "object") {
      parent[key] = value;
    } else {
      throw new TypeError(`State mutation parent is a scalar: ${mutation.path}`);
    }
  };

  switch (mutation.op) {
    case "set":
      if (mutation.value === undefined) throw new TypeError("set mutation requires a value");
      write(cloneJson(mutation.value) as MutableJson);
      break;
    case "delete":
      if (Array.isArray(parent)) parent.splice(arrayIndex(key, false), 1);
      else if (parent !== null && typeof parent === "object") delete parent[key];
      else throw new TypeError(`State mutation parent is a scalar: ${mutation.path}`);
      break;
    case "increment": {
      const current = read();
      const amount = mutation.value ?? 1;
      if (typeof current !== "number" || typeof amount !== "number") {
        throw new TypeError("increment mutation requires numeric state and value");
      }
      write(current + amount);
      break;
    }
    case "append": {
      const current = read();
      if (!Array.isArray(current)) throw new TypeError("append mutation target must be an array");
      if (mutation.value === undefined) throw new TypeError("append mutation requires a value");
      current.push(cloneJson(mutation.value) as MutableJson);
      break;
    }
  }
}

function valueAt(root: unknown, path = ""): unknown {
  let current = root;
  for (const segment of pointerSegments(path)) {
    assertSafeSegment(segment);
    if (Array.isArray(current)) current = current[arrayIndex(segment, false)];
    else if (current !== null && typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else return undefined;
  }
  return current;
}

function matchesFault(fault: FaultInjectorSpec, event: ScenarioEvent): boolean {
  const target = fault.target;
  return (
    target === undefined ||
    ((target.eventId === undefined || target.eventId === event.eventId) &&
      (target.eventType === undefined || target.eventType === event.type) &&
      (target.actor === undefined || target.actor === event.actor))
  );
}

function capabilityMatches(grant: Capability, request: CapabilityRequest): boolean {
  if (grant.kind !== request.kind || (grant.resource !== "*" && grant.resource !== request.resource)) return false;
  const operation = request.operation ?? request.operations?.[0];
  return operation === undefined || grant.operations === undefined || grant.operations.includes(operation);
}

function requestIsLost(request: CapabilityRequest, fault: FaultInjectorSpec): boolean {
  if (fault.kind !== "permission-loss") return false;
  if (!fault.capability) return true;
  return capabilityMatches(fault.capability, request);
}

function deniedRequests(
  requests: readonly CapabilityRequest[],
  grants: readonly Capability[],
  activeFaults: readonly FaultInjectorSpec[],
): CapabilityRequest[] {
  return requests.filter(
    (request) =>
      activeFaults.some((fault) => requestIsLost(request, fault)) ||
      !grants.some((grant) => capabilityMatches(grant, request)),
  );
}

function partialPayload(payload: JsonValue | undefined): JsonValue | undefined {
  if (payload === undefined || payload === null || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.slice(0, Math.ceil(payload.length / 2));
  const entries = Object.entries(payload).sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries.slice(0, Math.ceil(entries.length / 2))) as JsonObject;
}

function transformedPayload(
  original: JsonValue | undefined,
  faults: readonly FaultInjectorSpec[],
): JsonValue | undefined {
  let payload = cloneJson(original ?? null) as JsonValue;
  for (const fault of faults) {
    if (fault.replacementPayload !== undefined) payload = cloneJson(fault.replacementPayload);
    else if (fault.kind === "partial-response") payload = partialPayload(payload) ?? null;
  }
  return original === undefined && faults.every((fault) => fault.replacementPayload === undefined) ? undefined : payload;
}

function isBlockingFault(fault: FaultInjectorSpec): boolean {
  return (
    fault.kind === "timeout" ||
    fault.kind === "budget-exhaustion" ||
    fault.kind === "human-non-response"
  );
}

function deterministicEvents(scenario: Scenario): ScenarioEvent[] {
  const ids = new Set<string>();
  for (const event of scenario.events) {
    if (ids.has(event.eventId)) throw new TypeError(`Duplicate scenario event ID: ${event.eventId}`);
    if (!Number.isFinite(event.at) || event.at < 0) throw new TypeError(`Invalid event time: ${event.eventId}`);
    ids.add(event.eventId);
  }
  return [...scenario.events].sort(
    (left, right) =>
      left.at - right.at ||
      (left.phase ?? 0) - (right.phase ?? 0) ||
      left.actor.localeCompare(right.actor) ||
      left.eventId.localeCompare(right.eventId),
  );
}

function defaultExecutor(): SubjectExecutionOutput {
  return {};
}

function equalJson(left: unknown, right: unknown, tolerance?: number): boolean {
  if (typeof left === "number" && typeof right === "number" && tolerance !== undefined) {
    return Math.abs(left - right) <= tolerance;
  }
  try {
    return canonicalizeJson(left) === canonicalizeJson(right);
  } catch {
    return false;
  }
}

function evaluateRule(actual: unknown, operator: OracleOperator, expected: JsonValue | undefined, tolerance?: number): boolean {
  switch (operator) {
    case "equals":
      return equalJson(actual, expected, tolerance);
    case "not-equals":
      return !equalJson(actual, expected, tolerance);
    case "exists":
      return actual !== undefined;
    case "not-exists":
      return actual === undefined;
    case "greater-than":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "greater-than-or-equal":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "less-than":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "less-than-or-equal":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") return actual.includes(expected);
      if (Array.isArray(actual)) return actual.some((entry) => equalJson(entry, expected));
      return false;
  }
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  return cloneJson(value) as JsonValue;
}

function evaluateOracle(
  oracle: OracleSpec,
  state: JsonObject,
  lastOutput: JsonValue | undefined,
  lastObservation: Observation | undefined,
): OracleDecision {
  const source =
    oracle.input.source === "state"
      ? state
      : oracle.input.source === "last-output"
        ? lastOutput
        : lastObservation;
  const actual = valueAt(source, oracle.input.path ?? "");
  return {
    oracleId: oracle.oracleId,
    passed: evaluateRule(actual, oracle.decisionRule, oracle.expected, oracle.tolerance),
    ...(actual === undefined ? {} : { actual: toJsonValue(actual) }),
    ...(oracle.expected === undefined ? {} : { expected: oracle.expected }),
    rule: oracle.decisionRule,
    ...(lastObservation === undefined ? {} : { observationId: lastObservation.observationId }),
  };
}

async function assertManifestBindings(input: TrialRunInput): Promise<void> {
  const [subjectDigest, worldDigest, scenarioDigest] = await Promise.all([
    contentAddress(input.subject),
    contentAddress(input.world),
    contentAddress(input.scenario),
  ]);
  const expected: readonly [string, ContentDigest, ContentDigest][] = [
    ["subject", input.trial.subjectDigest, subjectDigest],
    ["world", input.trial.worldDigest, worldDigest],
    ["scenario", input.trial.scenarioDigest, scenarioDigest],
    ["scenario world", input.scenario.worldDigest, worldDigest],
  ];
  for (const [name, bound, actual] of expected) {
    if (bound !== actual) throw new ManifestIntegrityError(`${name} digest does not match sealed trial inputs`);
  }
}

function blockingFaultReason(faults: readonly FaultInjectorSpec[]): string | undefined {
  const blocking = faults.find(isBlockingFault);
  return blocking ? `Injected ${blocking.kind} fault (${blocking.injectorId})` : undefined;
}

/** Execute a deterministic STANDARD-reference trial. */
export async function runTrial(input: TrialRunInput): Promise<ResultManifest> {
  if (input.trial.isolationClass !== "STANDARD" || input.scenario.classification !== "STANDARD") {
    throw new Error("The in-process reference runner supports STANDARD isolation only");
  }
  await assertManifestBindings(input);

  const events = deterministicEvents(input.scenario);
  const maxEventsRule = input.scenario.stopRules
    .filter((rule) => rule.kind === "max-events" && rule.value !== undefined)
    .map((rule) => rule.value!)
    .reduce((minimum, value) => Math.min(minimum, value), input.trial.resourceLimits.maxEvents);
  const maxLogicalTimeRule = input.scenario.stopRules
    .filter((rule) => rule.kind === "max-logical-time" && rule.value !== undefined)
    .map((rule) => rule.value!)
    .reduce((minimum, value) => Math.min(minimum, value), input.trial.resourceLimits.maxLogicalTimeMs);
  if (events.length > maxEventsRule) {
    throw new ResourceLimitError(`Scenario has ${events.length} events but the sealed limit is ${maxEventsRule}`);
  }

  const state = cloneJson(input.scenario.initialState) as MutableObject;
  const rootPrng = new SeededPrng(input.trial.seed);
  const observations: Observation[] = [];
  const findingDrafts: Array<Omit<Finding, "trace"> & { traceIds?: readonly string[] }> = [];
  let previousDigest = EMPTY_SHA256;
  let lastOutput: JsonValue | undefined;
  let injectedFaultCount = 0;

  for (let sequence = 0; sequence < events.length; sequence += 1) {
    const event = events[sequence]!;
    const activeFaults = input.scenario.injectors.filter(
      (fault) =>
        matchesFault(fault, event) &&
        rootPrng.fork(`fault/${fault.injectorId}/${event.eventId}`).boolean(fault.probability ?? 1),
    );
    injectedFaultCount += activeFaults.length;
    if (
      input.trial.resourceLimits.maxFaults !== undefined &&
      injectedFaultCount > input.trial.resourceLimits.maxFaults
    ) {
      throw new ResourceLimitError("Injected fault count exceeded the sealed resource limit");
    }

    const logicalTime =
      event.at + activeFaults.reduce((total, fault) => total + (fault.kind === "latency" ? fault.latencyMs ?? 0 : 0), 0);
    if (logicalTime > input.trial.resourceLimits.maxLogicalTimeMs) {
      throw new ResourceLimitError(`Event ${event.eventId} exceeded the sealed logical-time limit`);
    }
    if (logicalTime > maxLogicalTimeRule) break;

    const stateBeforeDigest = await contentAddress(state);
    const payload = transformedPayload(event.payload, activeFaults);
    const required = [...(event.requiredCapabilities ?? [])];
    let denied = deniedRequests(required, input.subject.capabilities, activeFaults);
    let denialReason = blockingFaultReason(activeFaults);
    if (denied.length > 0) denialReason = "One or more requested capabilities were not declared or were revoked";

    let execution: SubjectExecutionOutput = {};
    if (denialReason === undefined) {
      try {
        execution = await (input.executor ?? (() => defaultExecutor()))({
          event,
          ...(payload === undefined ? {} : { payload }),
          state: cloneJson(state) as JsonObject,
          random: rootPrng.fork(`event/${event.eventId}`).next(),
        });
        const additional = execution.capabilityRequests ?? [];
        required.push(...additional);
        denied = deniedRequests(additional, input.subject.capabilities, activeFaults);
        if (denied.length > 0) denialReason = "Subject requested an undeclared or revoked capability";
      } catch {
        denialReason = "Subject execution failed at the harness boundary";
      }
    }

    if (denialReason === undefined) {
      for (const mutation of event.mutations ?? []) applyMutation(state, mutation);
      for (const mutation of execution.mutations ?? []) applyMutation(state, mutation);
      lastOutput = execution.output;
    } else {
      lastOutput = { denied: true, reason: denialReason };
    }

    const stateAfterDigest = await contentAddress(state);
    const base = {
      observationId: `obs-${sequence + 1}-${event.eventId}`,
      sequence,
      logicalTime,
      event: { eventId: event.eventId, type: event.type },
      actor: event.actor,
      ...(event.causeId === undefined ? {} : { causeId: event.causeId }),
      ...(event.correlationId === undefined ? {} : { correlationId: event.correlationId }),
      stateBeforeDigest,
      stateAfterDigest,
      payloadDigest: await contentAddress(payload ?? null),
      ...(lastOutput === undefined ? {} : { output: lastOutput }),
      policyDecision: {
        outcome: denialReason === undefined ? ("allow" as const) : ("deny" as const),
        requests: required,
        ...(denialReason === undefined ? {} : { reason: denialReason }),
      },
      injectedFaults: activeFaults.map((fault) => fault.injectorId),
      evidence: execution.evidence ?? [],
    };
    const traceDigest = await contentAddress({ previousDigest, observation: base });
    const observation: Observation = {
      ...base,
      trace: { previousDigest, digest: traceDigest },
    };
    observations.push(observation);
    previousDigest = traceDigest;

    if (denialReason !== undefined) {
      findingDrafts.push({
        findingId: `finding-${input.trial.trialId}-harness-${sequence + 1}`,
        failureClass: denied.length > 0 ? "undeclared-capability" : "injected-or-execution-failure",
        severity: denied.length > 0 ? "HIGH" : "MEDIUM",
        reproducibility: { deterministic: true, seed: input.trial.seed, trialId: input.trial.trialId },
        summary: denialReason,
        sealed: true,
        traceIds: [observation.observationId],
      });
    }
  }

  const finalState = cloneJson(state) as JsonObject;
  const allOracles = [...input.scenario.invariants, ...input.scenario.oracles];
  const oracleDecisions = allOracles.map((oracle) =>
    evaluateOracle(oracle, finalState, lastOutput, observations.at(-1)),
  );
  oracleDecisions.forEach((decision, index) => {
    if (decision.passed) return;
    const oracle = allOracles[index]!;
    findingDrafts.push({
      findingId: `finding-${input.trial.trialId}-oracle-${oracle.oracleId}`,
      failureClass: oracle.failureClass,
      severity: oracle.severity,
      reproducibility: { deterministic: true, seed: input.trial.seed, trialId: input.trial.trialId },
      summary: `Oracle ${oracle.oracleId} failed its ${oracle.decisionRule} rule`,
      sealed: true,
      traceIds: decision.observationId ? [decision.observationId] : [],
    });
  });

  const findings: Finding[] = findingDrafts.map((draft) => {
    const { traceIds = [], ...finding } = draft;
    return { ...finding, trace: { rootDigest: previousDigest, observationIds: traceIds } };
  });
  const deniedCount = observations.filter((observation) => observation.policyDecision.outcome === "deny").length;
  const passed = oracleDecisions.every((decision) => decision.passed) && findings.length === 0;
  const eventTypes = new Set(observations.map((observation) => observation.event.type));
  const expectedTypes = new Set(input.scenario.expectedObservations);
  const coveredExpected = [...expectedTypes].filter((type) => eventTypes.has(type)).length;
  const coverageRatio = expectedTypes.size === 0 ? 1 : coveredExpected / expectedTypes.size;

  return {
    resultId: `result-${input.trial.trialId}-${input.trial.attemptId}`,
    tenantId: input.tenantId,
    trial: input.trial,
    subjectDigest: input.trial.subjectDigest,
    scenarioDigest: input.trial.scenarioDigest,
    worldDigest: input.trial.worldDigest,
    measures: [
      { name: "goal-reliability", dimension: "goal-reliability", value: passed ? 1 : 0, unit: "ratio", passed },
      {
        name: "policy-integrity",
        dimension: "policy-integrity",
        value: observations.length === 0 ? 1 : 1 - deniedCount / observations.length,
        unit: "ratio",
        passed: deniedCount === 0,
      },
      { name: "coverage", dimension: "coverage", value: coverageRatio, unit: "ratio" },
      { name: "evidence-completeness", dimension: "evidence-completeness", value: 1, unit: "ratio", passed: true },
    ],
    oracleDecisions,
    observations,
    trace: { algorithm: "sha256-chain-v1", rootDigest: previousDigest, observationCount: observations.length },
    findings,
    coverage: {
      expectedObservationTypes: expectedTypes.size,
      coveredExpectedObservationTypes: coveredExpected,
      ratio: coverageRatio,
    },
    uncertainty: { deterministic: true, prngAlgorithm: rootPrng.algorithm, seed: String(input.trial.seed) },
    environmentDeviations: [],
    signatures: [],
  };
}

export async function replayTrial(expected: ResultManifest, input: TrialRunInput): Promise<ReplayResult> {
  const result = await runTrial(input);
  return {
    exact: result.trace.rootDigest === expected.trace.rootDigest,
    expectedTraceDigest: expected.trace.rootDigest,
    actualTraceDigest: result.trace.rootDigest,
    result,
  };
}

/** Independently verify an exported causal observation chain without executing the subject. */
export async function verifyCausalTrace(
  observations: readonly Observation[],
  expectedRootDigest?: ContentDigest,
): Promise<boolean> {
  let previousDigest = EMPTY_SHA256;
  for (const observation of observations) {
    if (observation.trace.previousDigest !== previousDigest) return false;
    const { trace, ...base } = observation;
    const actual = await contentAddress({ previousDigest, observation: base });
    if (trace.digest !== actual) return false;
    previousDigest = actual;
  }
  return expectedRootDigest === undefined || previousDigest === expectedRootDigest;
}

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower]!;
  const fraction = position - lower;
  return sorted[lower]! * (1 - fraction) + sorted[upper]! * fraction;
}

function seedKey(seed: Seed): string {
  return `${typeof seed}:${String(seed)}`;
}

/** Summarize Bernoulli outcomes, including the EASAP-required 95% uncertainty and seed coverage. */
export function summarizeSamples(
  samples: readonly number[],
  executedSeeds: readonly Seed[],
  plannedSeeds: readonly Seed[] = executedSeeds,
): CampaignStatistics {
  if (samples.length !== executedSeeds.length) throw new TypeError("Each sample must bind to exactly one executed seed");
  if (samples.some((sample) => sample !== 0 && sample !== 1)) {
    throw new TypeError("STANDARD-reference campaign samples must be Bernoulli values (0 or 1)");
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const sampleCount = samples.length;
  const mean = sampleCount === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / sampleCount;
  const variance =
    sampleCount === 0
      ? 0
      : samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sampleCount;
  const frequencies = new Map<number, number>();
  for (const sample of samples) frequencies.set(sample, (frequencies.get(sample) ?? 0) + 1);

  const z = 1.959963984540054;
  const denominator = sampleCount === 0 ? 1 : 1 + (z * z) / sampleCount;
  const center = sampleCount === 0 ? 0 : (mean + (z * z) / (2 * sampleCount)) / denominator;
  const margin =
    sampleCount === 0
      ? 0
      : (z * Math.sqrt((mean * (1 - mean)) / sampleCount + (z * z) / (4 * sampleCount * sampleCount))) /
        denominator;

  const executed = new Set(executedSeeds.map(seedKey));
  const planned = new Map(plannedSeeds.map((seed) => [seedKey(seed), seed]));
  const missing = [...planned].filter(([key]) => !executed.has(key)).map(([, seed]) => seed);

  return {
    sampleCount,
    distribution: {
      values: [...frequencies]
        .sort(([left], [right]) => left - right)
        .map(([value, count]) => ({ value, count, probability: sampleCount === 0 ? 0 : count / sampleCount })),
      min: sorted[0] ?? 0,
      max: sorted.at(-1) ?? 0,
      mean,
      standardDeviation: Math.sqrt(variance),
      quantiles: { p05: quantile(sorted, 0.05), p50: quantile(sorted, 0.5), p95: quantile(sorted, 0.95) },
    },
    confidenceInterval95: {
      lower: sampleCount === 0 ? 0 : Math.max(0, center - margin),
      upper: sampleCount === 0 ? 1 : Math.min(1, center + margin),
      method: "wilson-score",
    },
    seedCoverage: {
      planned: plannedSeeds.length,
      executed: executedSeeds.length,
      unique: executed.size,
      ratio: planned.size === 0 ? 1 : (planned.size - missing.length) / planned.size,
      missing,
    },
  };
}

export interface CampaignRunInput {
  readonly tenantId: string;
  readonly campaign: Campaign;
  readonly subject: SubjectBundle;
  readonly world: WorldModel;
  readonly scenario: Scenario;
  readonly executor?: SubjectExecutor;
  readonly trialFactory?: (seed: Seed, index: number) => Trial | Promise<Trial>;
}

async function defaultTrial(campaign: Campaign, scenario: Scenario, seed: Seed, index: number): Promise<Trial> {
  const harnessVersion = "easap-standard-reference-v1";
  const environment: JsonObject = { mode: "STANDARD-reference", network: "denied" };
  return {
    trialId: `${campaign.campaignId}-trial-${index + 1}`,
    attemptId: "attempt-1",
    campaignId: campaign.campaignId,
    subjectDigest: campaign.subjectDigest,
    worldDigest: campaign.worldDigest,
    scenarioDigest: campaign.scenarioDigest,
    seed,
    isolationClass: scenario.classification,
    resourceLimits: campaign.resourceLimits,
    environment,
    state: "SEALED",
    timestamps: { createdAt: "1970-01-01T00:00:00.000Z" },
    harnessVersion,
    attestationDigest: await contentAddress({ harnessVersion, environment }),
  };
}

export async function runCampaign(input: CampaignRunInput): Promise<CampaignResult> {
  if (input.campaign.seeds.length > input.campaign.maxTrials) {
    throw new ResourceLimitError("Campaign seed matrix exceeds its sealed maxTrials bound");
  }
  const [subjectDigest, worldDigest, scenarioDigest] = await Promise.all([
    contentAddress(input.subject),
    contentAddress(input.world),
    contentAddress(input.scenario),
  ]);
  if (
    subjectDigest !== input.campaign.subjectDigest ||
    worldDigest !== input.campaign.worldDigest ||
    scenarioDigest !== input.campaign.scenarioDigest
  ) {
    throw new ManifestIntegrityError("Campaign manifest digests do not bind the supplied artifacts");
  }

  const results: ResultManifest[] = [];
  for (let index = 0; index < input.campaign.seeds.length; index += 1) {
    const seed = input.campaign.seeds[index]!;
    const trial = input.trialFactory
      ? await input.trialFactory(seed, index)
      : await defaultTrial(input.campaign, input.scenario, seed, index);
    if (seedKey(trial.seed) !== seedKey(seed)) {
      throw new ManifestIntegrityError("Campaign trial factory changed a sealed campaign seed");
    }
    if (trial.campaignId !== undefined && trial.campaignId !== input.campaign.campaignId) {
      throw new ManifestIntegrityError("Campaign trial factory returned a trial bound to another campaign");
    }
    results.push(
      await runTrial({
        tenantId: input.tenantId,
        trial,
        subject: input.subject,
        world: input.world,
        scenario: input.scenario,
        ...(input.executor === undefined ? {} : { executor: input.executor }),
      }),
    );
  }
  const samples = results.map(
    (result) => result.measures.find((measure) => measure.name === "goal-reliability")?.value ?? 0,
  );
  return {
    campaign: input.campaign,
    results,
    statistics: summarizeSamples(samples, input.campaign.seeds, input.campaign.seeds),
    findings: results.flatMap((result) => result.findings),
  };
}
