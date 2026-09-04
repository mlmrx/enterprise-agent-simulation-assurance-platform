import assert from "node:assert/strict";
import test from "node:test";
import {
  assessAgentReadiness,
  parseReadinessInput,
  readinessSample,
  type ReadinessInput,
} from "../../lib/readiness/assessment.ts";

test("readiness assessment is deterministic for equivalent normalized inputs", async () => {
  const reordered: ReadinessInput = {
    ...readinessSample,
    dataClasses: [...readinessSample.dataClasses].reverse(),
    capabilities: [...readinessSample.capabilities].reverse(),
    safeguards: [...readinessSample.safeguards].reverse(),
  };
  const [first, second] = await Promise.all([
    assessAgentReadiness(readinessSample),
    assessAgentReadiness(reordered),
  ]);
  assert.equal(first.inputDigest, second.inputDigest);
  assert.equal(first.assessmentId, second.assessmentId);
  assert.equal(first.risk.tier, "HIGH");
  assert.equal(first.risk.profile, "ENHANCED");
});

test("critical consequential agents receive blocking controls and targeted scenarios", async () => {
  const input: ReadinessInput = {
    agentName: "Autonomous Treasury Agent",
    description: "Executes treasury operations and manages privileged payment credentials.",
    useCase: "financial_operations",
    deploymentStage: "production",
    autonomy: "autonomous",
    exposure: "public",
    volume: "high_scale",
    dataClasses: ["regulated", "credentials"],
    capabilities: ["financial_transactions", "identity_access", "external_communications"],
    safeguards: ["audit_logging"],
  };
  const result = await assessAgentReadiness(input);
  assert.equal(result.risk.tier, "CRITICAL");
  assert.equal(result.risk.profile, "HIGH-RISK");
  assert.equal(result.readiness.status, "GATE DESIGN INCOMPLETE");
  assert.ok(result.readiness.openCriticalGaps >= 3);
  assert.ok(result.releaseGate.blockingControlGaps.includes("human_approval"));
  assert.ok(result.releaseGate.blockingControlGaps.includes("kill_switch"));
  assert.ok(result.scenarioPack.some((scenario) => scenario.id === "approval-and-replay"));
  assert.ok(result.scenarioPack.some((scenario) => scenario.id === "revoked-authority"));
  assert.ok(result.scenarioPack.some((scenario) => scenario.id === "sensitive-data-exfiltration"));
});

test("a bounded advisory agent can be ready for its baseline assurance campaign", async () => {
  const input: ReadinessInput = {
    agentName: "Internal Knowledge Assistant",
    description: "Answers employee questions from public documentation.",
    useCase: "general_enterprise",
    deploymentStage: "prototype",
    autonomy: "advisory",
    exposure: "internal",
    volume: "limited",
    dataClasses: ["public"],
    capabilities: ["read_records"],
    safeguards: ["immutable_manifests", "least_privilege", "audit_logging"],
  };
  const result = await assessAgentReadiness(input);
  assert.equal(result.risk.tier, "LOW");
  assert.equal(result.readiness.controlCoverage, 100);
  assert.equal(result.readiness.status, "READY FOR ASSURANCE CAMPAIGN");
  assert.equal(result.releaseGate.minimumSeedCount, 8);
});

test("readiness input validation fails closed for unsupported authority values", () => {
  assert.throws(
    () => parseReadinessInput({ ...readinessSample, autonomy: "unlimited" }),
    /autonomy must be one of/i,
  );
  assert.throws(
    () => parseReadinessInput({ ...readinessSample, agentName: "" }),
    /agentName must contain/i,
  );
});
