import {
  contentAddress,
  decideAssurance,
  issueAssuranceCertificate,
  runCampaign,
  signEnvelope,
  verifyEnvelope,
  type DeploymentRestriction,
  type SignedEnvelope,
  type AssuranceCertificate,
} from "@/lib/easap";
import type { RequestIdentity } from "./auth";
import {
  appendEvidenceEvent,
  completeCampaign,
  putCampaign,
  putCertificate,
  putFinding,
  putImmutableRecord,
  sealTrial,
  startCampaign,
} from "./durable-store";
import { procurementReferenceFixtures } from "./reference-fixtures";

export const LOCAL_REFERENCE_SIGNING_KEY =
  "EASAP-LOCAL-REFERENCE-KEY-NOT-FOR-PRODUCTION-2026";
export const LOCAL_REFERENCE_KEY_ID = "local-reference-issuer-v1";

export interface ReferenceDemoResponse {
  run_id: string;
  mode: "STANDARD-reference";
  summary: {
    trials: number;
    passed: number;
    findings: number;
    duration: string;
    sampleCount: number;
    distribution: unknown;
    confidenceInterval95: unknown;
    seedCoverage: unknown;
  };
  decision: {
    id: string;
    posture: string;
    conditions: readonly DeploymentRestriction[];
    residualRisk: unknown;
    gateSummary: unknown;
  };
  certificate?: SignedEnvelope<AssuranceCertificate>;
  evidence: {
    resultDigests: readonly string[];
    certificateDigest?: string;
    verified: boolean;
  };
}

export async function runReferenceDemo(
  identity: RequestIdentity,
  requestedTrialCount: number,
): Promise<ReferenceDemoResponse> {
  const fixtures = await procurementReferenceFixtures(requestedTrialCount);
  const issuedAt = "2026-07-15T12:00:00.000Z";

  await Promise.all([
    putImmutableRecord({
      tenantId: identity.tenantId,
      kind: "subject",
      externalId: fixtures.subject.subjectId,
      version: fixtures.subject.version,
      payload: fixtures.subject,
      createdBy: identity.principal,
    }),
    putImmutableRecord({
      tenantId: identity.tenantId,
      kind: "world",
      externalId: fixtures.world.worldId,
      version: fixtures.world.version,
      payload: fixtures.world,
      createdBy: identity.principal,
    }),
    putImmutableRecord({
      tenantId: identity.tenantId,
      kind: "scenario",
      externalId: fixtures.scenario.scenarioId,
      version: fixtures.scenario.version,
      payload: fixtures.scenario,
      classification: fixtures.scenario.classification,
      hidden: true,
      createdBy: identity.principal,
    }),
    putImmutableRecord({
      tenantId: identity.tenantId,
      kind: "profile",
      externalId: fixtures.profile.profileId,
      version: fixtures.profile.version,
      payload: fixtures.profile,
      classification: "STANDARD",
      createdBy: identity.principal,
    }),
  ]);

  await putCampaign({
    id: fixtures.campaign.campaignId,
    tenantId: identity.tenantId,
    subjectDigest: fixtures.subjectDigest,
    worldDigest: fixtures.worldDigest,
    scenarioDigest: fixtures.scenarioDigest,
    mode: "seeded-stochastic",
    isolationClass: "STANDARD",
    seeds: fixtures.campaign.seeds as number[],
    resourceLimits: fixtures.campaign.resourceLimits as unknown as Record<string, number>,
    requestedBy: identity.principal,
  });
  await startCampaign(identity.tenantId, fixtures.campaign.campaignId);

  const campaignResult = await runCampaign({
    tenantId: identity.tenantId,
    campaign: fixtures.campaign,
    subject: fixtures.subject,
    world: fixtures.world,
    scenario: fixtures.scenario,
  });

  const signedResults = await Promise.all(
    campaignResult.results.map((result) =>
      signEnvelope(result, LOCAL_REFERENCE_SIGNING_KEY, LOCAL_REFERENCE_KEY_ID, issuedAt),
    ),
  );
  for (let index = 0; index < campaignResult.results.length; index += 1) {
    const result = campaignResult.results[index]!;
    const envelope = signedResults[index]!;
    await putImmutableRecord({
      tenantId: identity.tenantId,
      kind: "result",
      externalId: result.resultId,
      version: "1",
      payload: envelope,
      createdBy: identity.principal,
    });
    await sealTrial({
      id: result.trial.trialId,
      tenantId: identity.tenantId,
      campaignId: fixtures.campaign.campaignId,
      seed: Number(result.trial.seed),
      harnessVersion: result.trial.harnessVersion,
      environmentAttestation: {
        digest: result.trial.attestationDigest,
        environment: result.trial.environment,
      },
      traceRoot: result.trace.rootDigest,
      resultDigest: envelope.payloadDigest,
      resultManifest: envelope,
    });
    for (const finding of result.findings) {
      await putFinding({
        id: finding.findingId,
        tenantId: identity.tenantId,
        trialId: result.trial.trialId,
        failureClass: finding.failureClass,
        severity: finding.severity,
        reproducible: finding.reproducibility.deterministic,
        traceRoot: finding.trace.rootDigest,
        payload: finding,
      });
    }
  }

  await completeCampaign({
    tenantId: identity.tenantId,
    id: fixtures.campaign.campaignId,
    completedTrials: campaignResult.results.length,
    failedTrials: campaignResult.findings.length,
  });

  const restrictions: readonly DeploymentRestriction[] = [
    { kind: "allowed-environments", environments: ["reference", "staging"] },
    { kind: "isolation-class", classes: ["STANDARD"] },
    { kind: "maximum-authority", authority: 25_000 },
    { kind: "required-human-gates", gates: ["bank-detail-change", "high-value-purchase"] },
    { kind: "deny-network", except: [] },
  ];
  const residualRisk = {
    rating: campaignResult.findings.length > 0 ? "MODERATE" : "LOW",
    openFindings: campaignResult.findings.length,
    limitations: fixtures.world.limitations,
  };
  const decision = await decideAssurance({
    decisionId: `decision-${fixtures.campaign.campaignId}`,
    profile: fixtures.profile,
    subjectDigest: fixtures.subjectDigest,
    results: campaignResult.results,
    executedSuiteDigests: [fixtures.scenarioDigest],
    coverage: {
      operatingEnvelopeRatio: 1,
      coveredPartitions: 4,
      uncoveredPartitions: 0,
      unreachablePartitions: 0,
    },
    residualRisk,
    approver: identity.principal,
    conditions: restrictions,
    issuedAt,
  });
  const gateSummary = {
    requiredSuitesSatisfied: fixtures.profile.requiredSuites.every((suite) =>
      [fixtures.scenarioDigest].includes(suite),
    ),
    thresholds: fixtures.profile.thresholds.map((threshold) => {
      const values = campaignResult.results.flatMap((result) =>
        result.measures
          .filter((measure) => measure.name === threshold.measure)
          .map((measure) => measure.value),
      );
      const aggregate =
        values.length === 0
          ? null
          : values.reduce((total, value) => total + value, 0) / values.length;
      return {
        ...threshold,
        aggregate,
        passed:
          aggregate !== null &&
          (threshold.operator === "gte"
            ? aggregate >= threshold.value
            : aggregate <= threshold.value),
      };
    }),
    criticalFindings: campaignResult.findings.filter(
      (finding) => finding.severity === "CRITICAL",
    ).length,
  };

  let signedCertificate: SignedEnvelope<AssuranceCertificate> | undefined;
  if (decision.outcome === "APPROVED" || decision.outcome === "CONDITIONAL") {
    const certificate = await issueAssuranceCertificate({
      certificateId: `certificate-${fixtures.campaign.campaignId}`,
      tenantId: identity.tenantId,
      decision,
      issuer: "EASAP STANDARD reference issuer",
      revocationEndpoint: `/v1/certificates/certificate-${fixtures.campaign.campaignId}:revoke`,
    });
    signedCertificate = await signEnvelope(
      certificate,
      LOCAL_REFERENCE_SIGNING_KEY,
      LOCAL_REFERENCE_KEY_ID,
      issuedAt,
    );
    await putCertificate({
      id: certificate.certificateId,
      tenantId: identity.tenantId,
      subjectDigest: certificate.subjectDigest,
      profileDigest: certificate.profileDigest,
      resultSetDigest: await contentAddress(decision.resultDigests),
      decision: certificate.decision,
      conditions: certificate.conditions,
      coverage: decision.coverage,
      residualRisk: decision.residualRisk,
      issuer: certificate.issuer,
      approver: decision.approver,
      digest: signedCertificate.payloadDigest,
      signature: signedCertificate.signature,
      revocationEndpoint: certificate.revocationEndpoint,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
    });
  }

  const verifiedResults = await Promise.all(
    signedResults.map((envelope) =>
      verifyEnvelope(envelope, LOCAL_REFERENCE_SIGNING_KEY, LOCAL_REFERENCE_KEY_ID),
    ),
  );
  const certificateVerified = signedCertificate
    ? await verifyEnvelope(
        signedCertificate,
        LOCAL_REFERENCE_SIGNING_KEY,
        LOCAL_REFERENCE_KEY_ID,
      )
    : true;
  await appendEvidenceEvent({
    tenantId: identity.tenantId,
    aggregateType: "campaign",
    aggregateId: fixtures.campaign.campaignId,
    eventType: "campaign.assurance-sealed",
    payload: {
      resultDigests: signedResults.map((envelope) => envelope.payloadDigest),
      decisionDigest: await contentAddress(decision),
      certificateDigest: signedCertificate?.payloadDigest ?? null,
      verified: verifiedResults.every(Boolean) && certificateVerified,
    },
    actor: identity.principal,
  });

  const passed = campaignResult.results.filter(
    (result) => result.measures.find((measure) => measure.name === "goal-reliability")?.value === 1,
  ).length;
  return {
    run_id: fixtures.campaign.campaignId,
    mode: "STANDARD-reference",
    summary: {
      trials: campaignResult.results.length,
      passed,
      findings: campaignResult.findings.length,
      duration: `${campaignResult.results.length * fixtures.scenario.events.length} logical events`,
      sampleCount: campaignResult.statistics.sampleCount,
      distribution: campaignResult.statistics.distribution,
      confidenceInterval95: campaignResult.statistics.confidenceInterval95,
      seedCoverage: campaignResult.statistics.seedCoverage,
    },
    decision: {
      id: decision.decisionId,
      posture: decision.outcome,
      conditions: decision.conditions,
      residualRisk: decision.residualRisk,
      gateSummary,
    },
    ...(signedCertificate ? { certificate: signedCertificate } : {}),
    evidence: {
      resultDigests: signedResults.map((envelope) => envelope.payloadDigest),
      ...(signedCertificate ? { certificateDigest: signedCertificate.payloadDigest } : {}),
      verified: verifiedResults.every(Boolean) && certificateVerified,
    },
  };
}
