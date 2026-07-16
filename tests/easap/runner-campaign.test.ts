import assert from "node:assert/strict";
import { test } from "node:test";

import { contentAddress, ManifestIntegrityError, replayTrial, runCampaign, runTrial, SeededPrng, verifyCausalTrace } from "../../lib/easap/index.ts";
import { makeFixture } from "./fixtures.ts";

test("seeded runner produces a causal trace that replays exactly", async () => {
  const fixture = await makeFixture();
  const first = await runTrial(fixture.input);
  const replay = await replayTrial(first, fixture.input);

  assert.equal(replay.exact, true);
  assert.equal(first.trace.rootDigest, replay.actualTraceDigest);
  assert.equal(first.observations.length, 1);
  assert.equal(first.observations[0]!.trace.previousDigest.endsWith("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"), true);
  assert.equal(first.oracleDecisions[0]!.passed, true);
  assert.equal(first.measures.find((measure) => measure.name === "goal-reliability")!.value, 1);
  assert.equal(await verifyCausalTrace(first.observations, first.trace.rootDigest), true);
  assert.equal(
    await verifyCausalTrace([{ ...first.observations[0]!, actor: "tampered" }], first.trace.rootDigest),
    false,
  );

  const randomA = new SeededPrng("same-seed");
  const randomB = new SeededPrng("same-seed");
  assert.deepEqual(
    [randomA.next(), randomA.next(), randomA.fork("oracle").next()],
    [randomB.next(), randomB.next(), randomB.fork("oracle").next()],
  );
});

test("undeclared capability and injected timeout fail closed at the harness boundary", async () => {
  const deniedFixture = await makeFixture({ deniedEvent: true });
  const denied = await runTrial(deniedFixture.input);
  const observation = denied.observations.find((entry) => entry.event.eventId === "exfiltrate")!;
  assert.equal(observation.policyDecision.outcome, "deny");
  assert.equal((observation.output as { denied: boolean }).denied, true);
  assert.equal(denied.findings.some((finding) => finding.failureClass === "undeclared-capability"), true);
  assert.equal(
    observation.stateAfterDigest,
    await contentAddress({ counter: 1, score: 0, secretWritten: false }),
  );

  const timeoutFixture = await makeFixture({ timeoutFault: true });
  const timedOut = await runTrial(timeoutFixture.input);
  assert.equal(timedOut.observations[0]!.policyDecision.outcome, "deny");
  assert.deepEqual(timedOut.observations[0]!.injectedFaults, ["timeout-1"]);
  assert.equal(timedOut.oracleDecisions[0]!.passed, false);
});

test("sealed digest mutation is rejected before execution", async () => {
  const fixture = await makeFixture();
  const changedScenario = { ...fixture.scenario, objectives: ["mutated objective"] };
  await assert.rejects(
    runTrial({ ...fixture.input, scenario: changedScenario }),
    ManifestIntegrityError,
  );
  assert.notEqual(await contentAddress(changedScenario), fixture.trial.scenarioDigest);
});

test("stochastic campaign reports distribution, sample count, 95% CI, and seed coverage", async () => {
  const fixture = await makeFixture({ oracleExpected: 1 });
  const scenario = {
    ...fixture.scenario,
    events: fixture.scenario.events.map((event) => ({ ...event, mutations: [] })),
  };
  const scenarioDigest = await contentAddress(scenario);
  const campaign = { ...fixture.campaign, scenarioDigest };
  const campaignResult = await runCampaign({
    tenantId: "tenant-a",
    campaign,
    subject: fixture.subject,
    world: fixture.world,
    scenario,
    executor: ({ random }) => ({
      mutations: [{ op: "set", path: "/counter", value: random < 0.5 ? 0 : 1 }],
    }),
  });

  assert.equal(campaignResult.statistics.sampleCount, campaign.seeds.length);
  assert.equal(
    campaignResult.statistics.distribution.values.reduce((sum, entry) => sum + entry.count, 0),
    campaign.seeds.length,
  );
  assert.equal(campaignResult.statistics.confidenceInterval95.method, "wilson-score");
  assert.ok(campaignResult.statistics.confidenceInterval95.lower >= 0);
  assert.ok(campaignResult.statistics.confidenceInterval95.upper <= 1);
  assert.equal(campaignResult.statistics.seedCoverage.ratio, 1);
  assert.deepEqual(campaignResult.statistics.seedCoverage.missing, []);
});
