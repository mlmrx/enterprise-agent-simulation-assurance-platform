import assert from "node:assert/strict";
import { test } from "node:test";

import { assessMaterialChange, contentAddress, decideAssurance, evaluateReleaseGate, InMemoryRevocationRegistry, invalidateDecisionForMaterialChange, issueAssuranceCertificate, minimizeFinding, runTrial, signEnvelope } from "../../lib/easap/index.ts";
import type {
  AssuranceProfile,
  ContentDigest,
  ReleaseContext,
  Scenario,
  SubjectBundle,
} from "../../lib/easap/types.ts";
import { makeFixture, ZERO_DIGEST } from "./fixtures.ts";

test("finding minimization preserves the predicate and records accepted and rejected transformations", async () => {
  const fixture = await makeFixture({ oracleExpected: 99 });
  const failed = await runTrial(fixture.input);
  const finding = failed.findings[0]!;
  const scenario: Scenario = {
    ...fixture.scenario,
    initialState: { unused: true },
    fixtures: { unusedFixture: "remove-me" },
    dependencyDigests: [ZERO_DIGEST],
    events: [
      {
        eventId: "noise",
        at: 1,
        actor: "subject",
        type: "noise",
        payload: { ignore: true },
      },
      {
        eventId: "failure-trigger",
        at: 2,
        actor: "subject",
        type: "failure",
        payload: { fail: true, irrelevant: "remove-me" },
      },
    ],
  };
  const predicate = (candidate: Scenario): boolean =>
    candidate.events.some(
      (event) =>
        event.type === "failure" &&
        event.payload !== null &&
        !Array.isArray(event.payload) &&
        typeof event.payload === "object" &&
        (event.payload as Record<string, unknown>).fail === true,
    );

  const minimized = await minimizeFinding(finding, scenario, predicate);
  assert.equal(minimized.verified, true);
  assert.equal(minimized.minimalScenario.events.length, 1);
  assert.deepEqual(minimized.minimalScenario.events[0]!.payload, { fail: true });
  assert.deepEqual(minimized.minimalScenario.initialState, {});
  assert.deepEqual(minimized.minimalScenario.fixtures, {});
  assert.deepEqual(minimized.minimalScenario.dependencyDigests, []);
  assert.equal(minimized.transformations.some((change) => change.preservedFailure), true);
  assert.equal(minimized.transformations.some((change) => !change.preservedFailure), true);
});

function profile(suite: ContentDigest): AssuranceProfile {
  return {
    profileId: "standard-release",
    version: "1",
    riskClass: "MODERATE",
    requiredSuites: [suite],
    measures: ["goal-reliability"],
    thresholds: [{ measure: "goal-reliability", operator: "gte", value: 1 }],
    confidence: 0.95,
    exceptions: [],
    materialityRules: [{ component: "prompt", effect: "narrow" }],
    defaultMaterialityEffect: "invalidate",
    maximumValiditySeconds: 3600,
  };
}

test("material changes invalidate or narrow an exact prior decision", async () => {
  const fixture = await makeFixture();
  const suite = await contentAddress({ suite: "required" });
  const assuranceProfile = profile(suite);
  const baselineDecision = {
    decisionId: "decision-1",
    profileDigest: await contentAddress(assuranceProfile),
    subjectDigest: await contentAddress(fixture.subject),
    resultDigests: [],
    suiteDigests: [suite],
    coverage: { ratio: 1 },
    residualRisk: { accepted: true },
    approver: "release-authority",
    conditions: [],
    outcome: "APPROVED" as const,
    issuedAt: "2026-07-11T00:00:00.000Z",
    expiresAt: "2026-07-11T01:00:00.000Z",
  };

  const modelChanged: SubjectBundle = {
    ...fixture.subject,
    model: { ...fixture.subject.model, version: "2" },
  };
  const invalidation = assessMaterialChange(fixture.subject, modelChanged, assuranceProfile);
  assert.equal(invalidation.effect, "invalidate");
  const invalidated = await invalidateDecisionForMaterialChange(
    baselineDecision,
    fixture.subject,
    modelChanged,
    assuranceProfile,
    "2026-07-11T00:05:00.000Z",
  );
  assert.equal(invalidated.outcome, "INVALIDATED");
  assert.deepEqual(invalidated.invalidation?.changedComponents, ["model"]);

  const promptChanged: SubjectBundle = {
    ...fixture.subject,
    prompts: { system: await contentAddress("new-prompt") },
  };
  assert.equal(assessMaterialChange(fixture.subject, promptChanged, assuranceProfile).effect, "narrow");
});

test("conditional certificate restrictions and revocation are enforced by the release gate", async () => {
  const fixture = await makeFixture();
  const result = await runTrial(fixture.input);
  const suite = await contentAddress({ suite: "required" });
  const conditions = [
    { kind: "allowed-environments" as const, environments: ["staging"] },
    { kind: "allowed-tools" as const, tools: ["calculator"] },
    { kind: "required-human-gates" as const, gates: ["manager-approval"] },
    { kind: "maximum-authority" as const, authority: 2 },
    { kind: "deny-network" as const, except: [] },
  ];
  const decision = await decideAssurance({
    decisionId: "decision-conditional",
    profile: profile(suite),
    subjectDigest: fixture.trial.subjectDigest,
    results: [result],
    executedSuiteDigests: [suite],
    coverage: { ratio: 1 },
    residualRisk: { accepted: true },
    approver: "release-authority",
    conditions,
    issuedAt: "2026-07-11T00:00:00.000Z",
  });
  assert.equal(decision.outcome, "CONDITIONAL");
  const certificate = await issueAssuranceCertificate({
    certificateId: "certificate-1",
    tenantId: "tenant-a",
    decision,
    issuer: "easap-test-issuer",
    revocationEndpoint: "https://assurance.invalid/v1/certificates/certificate-1/status",
  });
  const key = "conditional-certificate-test-key-with-entropy";
  const signed = await signEnvelope(certificate, key, "issuer-key-1", certificate.issuedAt);
  const revocations = new InMemoryRevocationRegistry();
  const context: ReleaseContext = {
    tenantId: "tenant-a",
    subjectDigest: fixture.trial.subjectDigest,
    environment: "staging",
    tools: ["calculator"],
    authority: 2,
    satisfiedHumanGates: ["manager-approval"],
    isolationClass: "STANDARD",
    networkDestinations: [],
    now: "2026-07-11T00:30:00.000Z",
  };

  const allowed = await evaluateReleaseGate({
    certificate: signed,
    key,
    context,
    revocations,
    expectedKeyId: "issuer-key-1",
    trustedIssuers: ["easap-test-issuer"],
  });
  assert.equal(allowed.allowed, true);

  const tampered = await evaluateReleaseGate({
    certificate: { ...signed, payload: { ...signed.payload, issuer: "attacker" } },
    key,
    context,
    revocations,
  });
  assert.equal(tampered.allowed, false);
  assert.deepEqual(tampered.reasons, ["Certificate signature or content digest is invalid"]);

  const restricted = await evaluateReleaseGate({
    certificate: signed,
    key,
    context: { ...context, environment: "production", tools: ["shell"] },
    revocations,
  });
  assert.equal(restricted.allowed, false);
  assert.ok(restricted.reasons.length >= 2);

  revocations.revoke({
    tenantId: "tenant-a",
    certificateId: certificate.certificateId,
    reason: "material production incident",
    effectiveAt: "2026-07-11T00:20:00.000Z",
    revokedBy: "release-authority",
  });
  const revoked = await evaluateReleaseGate({ certificate: signed, key, context, revocations });
  assert.equal(revoked.allowed, false);
  assert.equal(revoked.reasons.includes("Certificate is revoked"), true);
});
