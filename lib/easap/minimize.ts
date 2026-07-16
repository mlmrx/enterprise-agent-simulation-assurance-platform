import { canonicalizeJson, contentAddress } from "./canonical.ts";
import type {
  Finding,
  JsonObject,
  MinimizationResult,
  MinimizationTransformation,
  Scenario,
  ScenarioEvent,
} from "./types.ts";

export type FailurePredicate = (candidate: Scenario) => boolean | Promise<boolean>;

function clone<T>(value: T): T {
  return JSON.parse(canonicalizeJson(value)) as T;
}

async function recordAttempt(
  transformations: MinimizationTransformation[],
  kind: MinimizationTransformation["kind"],
  description: string,
  before: Scenario,
  candidate: Scenario,
  predicate: FailurePredicate,
): Promise<boolean> {
  const [beforeDigest, afterDigest, preservedFailure] = await Promise.all([
    contentAddress(before),
    contentAddress(candidate),
    predicate(candidate),
  ]);
  transformations.push({ kind, description, beforeDigest, afterDigest, preservedFailure });
  return preservedFailure;
}

function withoutObjectKey(object: JsonObject, key: string): JsonObject {
  const result = { ...object } as Record<string, JsonObject[string]>;
  delete result[key];
  return result;
}

async function minimizeEvents(
  scenario: Scenario,
  predicate: FailurePredicate,
  transformations: MinimizationTransformation[],
): Promise<Scenario> {
  let current = scenario;
  let granularity = 2;
  while (current.events.length > 0) {
    const chunkSize = Math.ceil(current.events.length / granularity);
    let reduced = false;
    for (let start = 0; start < current.events.length; start += chunkSize) {
      const removed = current.events.slice(start, start + chunkSize).map((event) => event.eventId);
      const candidate: Scenario = {
        ...current,
        events: current.events.filter((_, index) => index < start || index >= start + chunkSize),
      };
      if (
        await recordAttempt(
          transformations,
          "remove-events",
          `Removed event chunk: ${removed.join(", ")}`,
          current,
          candidate,
          predicate,
        )
      ) {
        current = candidate;
        granularity = Math.max(2, granularity - 1);
        reduced = true;
        break;
      }
    }
    if (reduced) continue;
    if (granularity >= current.events.length) break;
    granularity = Math.min(current.events.length, granularity * 2);
  }
  return current;
}

async function minimizeObjectSection(
  scenario: Scenario,
  section: "initialState" | "fixtures",
  kind: "remove-state" | "remove-fixture",
  predicate: FailurePredicate,
  transformations: MinimizationTransformation[],
): Promise<Scenario> {
  let current = scenario;
  for (const key of Object.keys(current[section]).sort()) {
    const candidate = { ...current, [section]: withoutObjectKey(current[section], key) } as Scenario;
    if (
      await recordAttempt(transformations, kind, `Removed ${section} key: ${key}`, current, candidate, predicate)
    ) {
      current = candidate;
    }
  }
  return current;
}

async function minimizePayloads(
  scenario: Scenario,
  predicate: FailurePredicate,
  transformations: MinimizationTransformation[],
): Promise<Scenario> {
  let current = scenario;
  for (let eventIndex = 0; eventIndex < current.events.length; eventIndex += 1) {
    const event = current.events[eventIndex]!;
    if (event.payload === null || Array.isArray(event.payload) || typeof event.payload !== "object") continue;
    for (const key of Object.keys(event.payload).sort()) {
      const currentEvent = current.events[eventIndex]!;
      if (
        currentEvent.payload === null ||
        Array.isArray(currentEvent.payload) ||
        typeof currentEvent.payload !== "object" ||
        !(key in currentEvent.payload)
      ) {
        continue;
      }
      const replacement: ScenarioEvent = {
        ...currentEvent,
        payload: withoutObjectKey(currentEvent.payload as JsonObject, key),
      };
      const events = [...current.events];
      events[eventIndex] = replacement;
      const candidate: Scenario = { ...current, events };
      if (
        await recordAttempt(
          transformations,
          "remove-payload",
          `Removed payload key ${key} from event ${event.eventId}`,
          current,
          candidate,
          predicate,
        )
      ) {
        current = candidate;
      }
    }
  }
  return current;
}

async function minimizeDependencies(
  scenario: Scenario,
  predicate: FailurePredicate,
  transformations: MinimizationTransformation[],
): Promise<Scenario> {
  let current = scenario;
  for (const digest of [...current.dependencyDigests]) {
    const candidate: Scenario = {
      ...current,
      dependencyDigests: current.dependencyDigests.filter((value) => value !== digest),
    };
    if (
      await recordAttempt(
        transformations,
        "remove-dependency",
        `Removed dependency ${digest}`,
        current,
        candidate,
        predicate,
      )
    ) {
      current = candidate;
    }
  }
  return current;
}

/** Hierarchical delta minimization with an evidence record for every attempted transformation. */
export async function minimizeFinding(
  finding: Finding,
  scenario: Scenario,
  preservesFailure: FailurePredicate,
): Promise<MinimizationResult> {
  let current = clone(scenario);
  const transformations: MinimizationTransformation[] = [];
  if (!(await preservesFailure(current))) {
    return {
      findingId: finding.findingId,
      minimalScenario: current,
      minimalScenarioDigest: await contentAddress(current),
      transformations,
      verified: false,
    };
  }

  current = await minimizeEvents(current, preservesFailure, transformations);
  current = await minimizeObjectSection(current, "initialState", "remove-state", preservesFailure, transformations);
  current = await minimizePayloads(current, preservesFailure, transformations);
  current = await minimizeObjectSection(current, "fixtures", "remove-fixture", preservesFailure, transformations);
  current = await minimizeDependencies(current, preservesFailure, transformations);
  const verified = await preservesFailure(current);
  return {
    findingId: finding.findingId,
    minimalScenario: current,
    minimalScenarioDigest: await contentAddress(current),
    transformations,
    verified,
  };
}
