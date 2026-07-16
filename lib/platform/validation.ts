import {
  contentAddress,
  type CapabilityRequest,
  type Scenario,
  type WorldModel,
} from "@/lib/easap";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ScenarioValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  scenarioDigest?: string;
  isolationClass?: string;
  requiredCapabilities: CapabilityRequest[];
}

const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const floatingVersions = new Set(["latest", "main", "master", "head", "stable"]);

export async function validateScenarioManifest(
  scenario: Scenario,
  world?: WorldModel,
): Promise<ScenarioValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const requiredCapabilities: CapabilityRequest[] = [];

  const requireText = (value: unknown, path: string) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push({ path, code: "required", message: "A non-empty string is required." });
    }
  };

  requireText(scenario?.scenarioId, "/scenarioId");
  requireText(scenario?.version, "/version");
  if (floatingVersions.has(scenario?.version?.trim().toLowerCase())) {
    errors.push({
      path: "/version",
      code: "mutable-reference",
      message: "Executable scenario versions cannot use floating aliases.",
    });
  }
  if (!digestPattern.test(scenario?.worldDigest ?? "")) {
    errors.push({ path: "/worldDigest", code: "digest", message: "worldDigest must be a SHA-256 content address." });
  }
  scenario?.dependencyDigests?.forEach((digest, index) => {
    if (!digestPattern.test(digest)) {
      errors.push({
        path: `/dependencyDigests/${index}`,
        code: "digest",
        message: "Dependencies must be immutable SHA-256 content addresses.",
      });
    }
  });

  const actorIds = new Set<string>();
  scenario?.actors?.forEach((actor, index) => {
    requireText(actor.actorId, `/actors/${index}/actorId`);
    if (actorIds.has(actor.actorId)) {
      errors.push({ path: `/actors/${index}/actorId`, code: "duplicate", message: "Actor IDs must be unique." });
    }
    actorIds.add(actor.actorId);
  });

  const eventIds = new Set<string>();
  scenario?.events?.forEach((event, index) => {
    requireText(event.eventId, `/events/${index}/eventId`);
    if (eventIds.has(event.eventId)) {
      errors.push({ path: `/events/${index}/eventId`, code: "duplicate", message: "Event IDs must be unique." });
    }
    eventIds.add(event.eventId);
    if (!actorIds.has(event.actor)) {
      errors.push({
        path: `/events/${index}/actor`,
        code: "unknown-actor",
        message: `Event actor ${event.actor} is not declared.`,
      });
    }
    if (!Number.isFinite(event.at) || event.at < 0) {
      errors.push({ path: `/events/${index}/at`, code: "time", message: "Logical event time must be a non-negative number." });
    }
    requiredCapabilities.push(...(event.requiredCapabilities ?? []));
  });

  scenario?.injectors?.forEach((injector, index) => {
    if (
      injector.probability !== undefined &&
      (!Number.isFinite(injector.probability) || injector.probability < 0 || injector.probability > 1)
    ) {
      errors.push({
        path: `/injectors/${index}/probability`,
        code: "probability",
        message: "Injector probability must be between 0 and 1.",
      });
    }
    if (injector.target?.eventId && !eventIds.has(injector.target.eventId)) {
      errors.push({
        path: `/injectors/${index}/target/eventId`,
        code: "unknown-event",
        message: "Injector targets an event that is not declared.",
      });
    }
  });

  if (world) {
    const digest = await contentAddress(world);
    if (scenario.worldDigest !== digest) {
      errors.push({
        path: "/worldDigest",
        code: "binding",
        message: "Scenario worldDigest does not bind the supplied world manifest.",
      });
    }
    world.transitionComponents.forEach((component, index) => {
      if (component.kind !== "learned") return;
      const base = `/world/transitionComponents/${index}`;
      if (!component.trainingDataBoundary) {
        errors.push({ path: `${base}/trainingDataBoundary`, code: "learned-component", message: "Learned components must declare a training-data boundary." });
      }
      if (!component.calibrationEvidenceDigest) {
        errors.push({ path: `${base}/calibrationEvidenceDigest`, code: "learned-component", message: "Learned components must bind calibration evidence." });
      }
      if (component.emitsUncertainty !== true) {
        errors.push({ path: `${base}/emitsUncertainty`, code: "learned-component", message: "Learned components must emit uncertainty." });
      }
      if (!component.deterministicFallbackDigest) {
        warnings.push({ path: `${base}/deterministicFallbackDigest`, code: "fallback", message: "No deterministic fallback is declared; profiles requiring exact replay must reject this world." });
      }
    });
  } else {
    warnings.push({
      path: "/worldDigest",
      code: "world-not-supplied",
      message: "World fidelity and learned-transition declarations were not checked.",
    });
  }

  if ((scenario?.events?.length ?? 0) === 0) {
    warnings.push({ path: "/events", code: "empty", message: "The scenario contains no executable events." });
  }
  if ((scenario?.oracles?.length ?? 0) + (scenario?.invariants?.length ?? 0) === 0) {
    warnings.push({ path: "/oracles", code: "no-oracle", message: "Only harness failures will affect the task outcome." });
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    ...(valid ? { scenarioDigest: await contentAddress(scenario) } : {}),
    ...(scenario?.classification ? { isolationClass: scenario.classification } : {}),
    requiredCapabilities,
  };
}
