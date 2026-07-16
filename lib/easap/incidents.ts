import { canonicalizeJson, contentAddress } from "./canonical.ts";
import type {
  ContentDigest,
  JsonObject,
  JsonValue,
  PrivacyReview,
  RedactedRegression,
  Scenario,
  SyntheticIncident,
} from "./types.ts";

export interface RegressionConversionOptions {
  readonly worldDigest: ContentDigest;
  readonly scenarioVersion?: string;
  readonly additionalSensitiveKeys?: readonly string[];
}

interface RedactionRecord {
  readonly path: string;
  readonly reason: string;
}

const DEFAULT_SENSITIVE_KEYS = [
  "name",
  "email",
  "phone",
  "ssn",
  "address",
  "password",
  "secret",
  "token",
  "credential",
  "apiKey",
] as const;

function escapePointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function redactString(value: string): { value: string; reason?: string } {
  let result = value;
  const reasons: string[] = [];
  const replacements: readonly [RegExp, string, string][] = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "[REDACTED:EMAIL]", "email"],
    [/\b\d{3}-\d{2}-\d{4}\b/gu, "[REDACTED:SSN]", "ssn"],
    [/\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/gu, "[REDACTED:PHONE]", "phone"],
    [/\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/giu, "[REDACTED:TOKEN]", "token"],
  ];
  for (const [pattern, replacement, reason] of replacements) {
    if (pattern.test(result)) {
      pattern.lastIndex = 0;
      result = result.replace(pattern, replacement);
      reasons.push(reason);
    }
  }
  return { value: result, ...(reasons.length === 0 ? {} : { reason: reasons.join(",") }) };
}

function redactValue(
  value: JsonValue,
  path: string,
  protectedPaths: ReadonlySet<string>,
  sensitiveKeys: ReadonlySet<string>,
  redactions: RedactionRecord[],
): JsonValue {
  if (protectedPaths.has(path)) {
    redactions.push({ path, reason: "explicitly-protected-path" });
    return "[REDACTED:PROTECTED]";
  }
  if (typeof value === "string") {
    const redacted = redactString(value);
    if (redacted.reason) redactions.push({ path, reason: redacted.reason });
    return redacted.value;
  }
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      redactValue(entry, `${path}/${index}`, protectedPaths, sensitiveKeys, redactions),
    );
  }
  const result: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}/${escapePointer(key)}`;
    if (sensitiveKeys.has(key.toLowerCase())) {
      result[key] = "[REDACTED:SENSITIVE-FIELD]";
      redactions.push({ path: childPath, reason: "sensitive-field" });
    } else {
      result[key] = redactValue(child, childPath, protectedPaths, sensitiveKeys, redactions);
    }
  }
  return result;
}

/** Convert a synthetic incident into a privacy-reviewed, redacted, content-addressed regression scenario. */
export async function deriveRedactedRegressionScenario(
  incident: SyntheticIncident,
  review: PrivacyReview,
  options: RegressionConversionOptions,
): Promise<RedactedRegression> {
  if (incident.synthetic !== true) throw new Error("Only synthetic incidents are accepted by the STANDARD-reference converter");
  if (!review.approved) throw new Error("Privacy review approval is required before publishing a regression scenario");
  const protectedPaths = new Set(incident.protectedPaths ?? []);
  const sensitiveKeys = new Set(
    [...DEFAULT_SENSITIVE_KEYS, ...(options.additionalSensitiveKeys ?? [])].map((key) => key.toLowerCase()),
  );
  const redactions: RedactionRecord[] = [];
  const initialState = redactValue(
    incident.initialState,
    "/initialState",
    protectedPaths,
    sensitiveKeys,
    redactions,
  ) as JsonObject;
  const events = incident.events.map((event, eventIndex) => ({
    eventId: event.eventId,
    at: event.at,
    actor: event.actor,
    type: event.type,
    payload: redactValue(
      event.payload,
      `/events/${eventIndex}/payload`,
      protectedPaths,
      sensitiveKeys,
      redactions,
    ),
  }));
  const sourceIncidentDigest = await contentAddress(incident);
  const reviewRedactions: RedactionRecord[] = [];
  const sanitizedNotes =
    review.notes === undefined
      ? undefined
      : (redactValue(review.notes, "/review/notes", protectedPaths, sensitiveKeys, reviewRedactions) as string);
  redactions.push(...reviewRedactions);
  const sanitizedReview: PrivacyReview = {
    ...review,
    ...(sanitizedNotes === undefined ? {} : { notes: sanitizedNotes }),
  };
  const actors = [...new Set(events.map((event) => event.actor))].sort().map((actorId) => ({
    actorId,
    kind: actorId === "subject" ? ("subject" as const) : ("service" as const),
  }));
  const scenario: Scenario = {
    scenarioId: `regression-${incident.incidentId}`,
    version: options.scenarioVersion ?? "1.0.0",
    worldDigest: options.worldDigest,
    fixtures: {
      provenance: "synthetic-incident",
      privacyReviewed: true,
      redactionCount: redactions.length,
    },
    actors,
    initialState,
    events,
    objectives: ["Reproduce the privacy-reviewed incident behavior without protected production data"],
    invariants: [],
    expectedObservations: [...new Set(events.map((event) => event.type))].sort(),
    injectors: [],
    oracles: [],
    stopRules: [{ kind: "max-events", value: events.length }],
    classification: "STANDARD",
    dependencyDigests: [sourceIncidentDigest],
  };
  const immutableScenario = JSON.parse(canonicalizeJson(scenario)) as Scenario;
  return {
    sourceIncidentDigest,
    scenario: immutableScenario,
    scenarioDigest: await contentAddress(immutableScenario),
    review: sanitizedReview,
    redactions,
  };
}
