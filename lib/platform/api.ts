import {
  contentAddress,
  decideAssurance,
  deriveRedactedRegressionScenario,
  issueAssuranceCertificate,
  minimizeFinding,
  replayTrial,
  runTrial,
  signEnvelope,
  verifyEnvelope,
  type AssuranceCertificate,
  type AssuranceProfile,
  type DeploymentRestriction,
  type Finding,
  type PrivacyReview,
  type ResultManifest,
  type Scenario,
  type SignedEnvelope,
  type SubjectBundle,
  type SyntheticIncident,
  type Trial,
  type TrialRunInput,
  type WorldModel,
} from "@/lib/easap";
import { ensureReferenceSchema } from "@/db/bootstrap";
import {
  assertHighRiskSeparation,
  canReadHiddenSuite,
  identityFromRequest,
  requireAction,
  roles,
  type RequestIdentity,
  type Role,
} from "./auth";
import {
  getCampaign,
  getCertificate,
  getImmutableRecord,
  getImmutableRecordByExternalId,
  getTrial,
  listCampaigns,
  listFindings,
  listImmutableRecords,
  loadPrincipalRoles,
  putCampaign,
  putCertificate,
  putFinding,
  putImmutableRecord,
  revokeCertificate,
  saveFindingMinimum,
  sealTrial,
} from "./durable-store";
import { json, problem, readJson, requestId, RequestError } from "./http";
import {
  LOCAL_REFERENCE_KEY_ID,
  LOCAL_REFERENCE_SIGNING_KEY,
  runReferenceDemo,
} from "./reference-demo";
import { validateScenarioManifest } from "./validation";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestError(400, `${field} is required.`, [
      { path: `/${field}`, message: "A non-empty string is required." },
    ]);
  }
  return value.trim();
}

function int(value: unknown, fallback: number, minimum: number, maximum: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new RequestError(400, "Expected an integer value.");
  }
  return Math.max(minimum, Math.min(maximum, value));
}

async function requestIdentity(request: Request): Promise<RequestIdentity> {
  const identity = identityFromRequest(request);
  if (!identity) throw new RequestError(401, "An authenticated user is required.");
  await ensureReferenceSchema();
  if (identity.source === "external" && identity.roles.length === 0) {
    const storedRoles = await loadPrincipalRoles(identity.tenantId, identity.principal);
    const validRoles = storedRoles.filter((value): value is Role =>
      (roles as readonly string[]).includes(value),
    );
    return { ...identity, roles: validRoles };
  }
  return identity;
}

function response(data: unknown, status = 200, request?: Request) {
  return json(
    { data, meta: { requestId: request ? requestId(request) : crypto.randomUUID() } },
    { status },
  );
}

function endpoint(path: string) {
  return path.replace(/^\/v1\/?/u, "").replace(/\/$/u, "");
}

function immutableFields(kind: "subject" | "world" | "scenario" | "profile", body: JsonRecord) {
  switch (kind) {
    case "subject": {
      const subject = body as unknown as SubjectBundle;
      return { externalId: text(subject.subjectId, "subjectId"), version: text(subject.version, "version") };
    }
    case "world": {
      const world = body as unknown as WorldModel;
      return { externalId: text(world.worldId, "worldId"), version: text(world.version, "version") };
    }
    case "scenario": {
      const scenario = body as unknown as Scenario;
      return { externalId: text(scenario.scenarioId, "scenarioId"), version: text(scenario.version, "version") };
    }
    case "profile": {
      const profile = body as unknown as AssuranceProfile;
      return { externalId: text(profile.profileId, "profileId"), version: text(profile.version, "version") };
    }
  }
}

async function registerImmutable(
  request: Request,
  identity: RequestIdentity,
  kind: "subject" | "world" | "scenario" | "profile",
) {
  const body = await readJson<JsonRecord>(request);
  if (!isRecord(body)) throw new RequestError(400, "A JSON object is required.");
  const fields = immutableFields(kind, body);
  const classification =
    kind === "scenario" && typeof body.classification === "string"
      ? body.classification
      : "STANDARD";
  const stored = await putImmutableRecord({
    tenantId: identity.tenantId,
    kind,
    ...fields,
    classification,
    hidden: kind === "scenario" && Boolean(body.hiddenSuiteDigest),
    payload: body,
    createdBy: identity.principal,
  });
  return response(stored, 201, request);
}

async function createCampaign(request: Request, identity: RequestIdentity) {
  const body = await readJson<JsonRecord>(request);
  const subjectDigest = text(body.subjectDigest, "subjectDigest");
  const worldDigest = text(body.worldDigest, "worldDigest");
  const scenarioDigest = text(body.scenarioDigest, "scenarioDigest");
  const [subject, world, scenario] = await Promise.all([
    getImmutableRecord(identity.tenantId, subjectDigest),
    getImmutableRecord(identity.tenantId, worldDigest),
    getImmutableRecord(identity.tenantId, scenarioDigest),
  ]);
  if (!subject || subject.kind !== "subject") throw new RequestError(404, "Subject digest not found.");
  if (!world || world.kind !== "world") throw new RequestError(404, "World digest not found.");
  if (!scenario || scenario.kind !== "scenario") throw new RequestError(404, "Scenario digest not found.");

  const seeds = Array.isArray(body.seeds) ? body.seeds.filter((seed): seed is number => Number.isSafeInteger(seed)) : [];
  if (seeds.length === 0) throw new RequestError(400, "At least one integer seed is required.");
  if (seeds.length > 10_000) throw new RequestError(400, "Reference campaigns are bounded to 10,000 trials.");
  const isolationClass = typeof body.isolationClass === "string" ? body.isolationClass : "STANDARD";
  if (isolationClass !== "STANDARD") {
    throw new RequestError(422, "The in-process reference runner supports STANDARD isolation only.");
  }
  const resourceLimits = isRecord(body.resourceLimits)
    ? Object.fromEntries(
        Object.entries(body.resourceLimits).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
      ) as Record<string, number>
    : { maxEvents: 100, maxLogicalTimeMs: 60_000 };
  const campaignId =
    typeof body.campaignId === "string"
      ? body.campaignId
      : `campaign_${(await contentAddress({ subjectDigest, worldDigest, scenarioDigest, seeds, resourceLimits })).slice(7, 31)}`;
  const campaign = await putCampaign({
    id: campaignId,
    tenantId: identity.tenantId,
    subjectDigest,
    worldDigest,
    scenarioDigest,
    mode: typeof body.mode === "string" ? body.mode : "seeded-stochastic",
    isolationClass,
    seeds,
    resourceLimits,
    requestedBy: identity.principal,
  });
  return response(
    {
      campaign,
      operation: {
        id: `operation-${campaignId}`,
        state: "ACCEPTED",
        statusUrl: `/v1/campaigns/${campaignId}`,
      },
    },
    202,
    request,
  );
}

async function runTrialEndpoint(request: Request, identity: RequestIdentity, id: string) {
  const body = await readJson<TrialRunInput>(request);
  if (!isRecord(body)) throw new RequestError(400, "A trial run object is required.");
  if (body.trial?.trialId !== id) throw new RequestError(409, "Route trial ID does not match the sealed trial manifest.");
  const result = await runTrial({ ...body, tenantId: identity.tenantId });
  const envelope = await signEnvelope(
    result,
    LOCAL_REFERENCE_SIGNING_KEY,
    LOCAL_REFERENCE_KEY_ID,
  );
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
    campaignId: result.trial.campaignId ?? "ad-hoc",
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
  return response({ result, envelope }, 201, request);
}

async function replayTrialEndpoint(request: Request, identity: RequestIdentity, id: string) {
  const body = await readJson<{ expected: ResultManifest; trial: Trial; subject: SubjectBundle; world: WorldModel; scenario: Scenario }>(request);
  if (body.trial?.trialId !== id) throw new RequestError(409, "Route trial ID does not match the sealed trial manifest.");
  const replay = await replayTrial(body.expected, {
    tenantId: identity.tenantId,
    trial: body.trial,
    subject: body.subject,
    world: body.world,
    scenario: body.scenario,
  });
  return response(replay, 200, request);
}

async function minimizeFindingEndpoint(request: Request, identity: RequestIdentity, id: string) {
  const body = await readJson<{ finding: Finding; scenario: Scenario; failureEventId: string }>(request);
  if (body.finding?.findingId !== id) throw new RequestError(409, "Route finding ID does not match the sealed finding.");
  const failureEventId = text(body.failureEventId, "failureEventId");
  const minimum = await minimizeFinding(
    body.finding,
    body.scenario,
    (candidate) => candidate.events.some((event) => event.eventId === failureEventId),
  );
  await saveFindingMinimum(identity.tenantId, id, minimum);
  return response(minimum, 200, request);
}

interface DecisionRequest {
  decisionId: string;
  profile: AssuranceProfile;
  profileAuthor: string;
  subjectDigest: string;
  results: ResultManifest[];
  executedSuiteDigests: string[];
  coverage: Record<string, never>;
  residualRisk: Record<string, never>;
  conditions?: DeploymentRestriction[];
  issueCertificate?: boolean;
}

async function decideEndpoint(request: Request, identity: RequestIdentity) {
  const body = await readJson<DecisionRequest>(request);
  assertHighRiskSeparation({
    profileAuthor: text(body.profileAuthor, "profileAuthor"),
    approver: identity.principal,
    riskClass: body.profile?.riskClass,
  });
  const decision = await decideAssurance({
    decisionId: text(body.decisionId, "decisionId"),
    profile: body.profile,
    subjectDigest: body.subjectDigest as `sha256:${string}`,
    results: body.results,
    executedSuiteDigests: body.executedSuiteDigests as `sha256:${string}`[],
    coverage: body.coverage,
    residualRisk: body.residualRisk,
    approver: identity.principal,
    conditions: body.conditions,
  });
  const decisionEnvelope = await signEnvelope(
    decision,
    LOCAL_REFERENCE_SIGNING_KEY,
    LOCAL_REFERENCE_KEY_ID,
  );
  let certificateEnvelope: SignedEnvelope<AssuranceCertificate> | undefined;
  if (
    body.issueCertificate !== false &&
    (decision.outcome === "APPROVED" || decision.outcome === "CONDITIONAL")
  ) {
    const certificate = await issueAssuranceCertificate({
      certificateId: `certificate-${decision.decisionId}`,
      tenantId: identity.tenantId,
      decision,
      issuer: "EASAP STANDARD reference issuer",
      revocationEndpoint: `/v1/certificates/certificate-${decision.decisionId}:revoke`,
    });
    certificateEnvelope = await signEnvelope(
      certificate,
      LOCAL_REFERENCE_SIGNING_KEY,
      LOCAL_REFERENCE_KEY_ID,
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
      approver: identity.principal,
      digest: certificateEnvelope.payloadDigest,
      signature: certificateEnvelope.signature,
      revocationEndpoint: certificate.revocationEndpoint,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
    });
  }
  return response(
    { decision, decisionEnvelope, ...(certificateEnvelope ? { certificateEnvelope } : {}) },
    201,
    request,
  );
}

async function exportResult(request: Request, identity: RequestIdentity, id: string) {
  const record = await getImmutableRecordByExternalId<SignedEnvelope<ResultManifest>>(
    identity.tenantId,
    "result",
    id,
  );
  if (!record) throw new RequestError(404, "Result not found.");
  const envelope = record.payload;
  const verified = await verifyEnvelope(
    envelope,
    LOCAL_REFERENCE_SIGNING_KEY,
    LOCAL_REFERENCE_KEY_ID,
  );
  return response(
    {
      manifest: envelope.payload,
      envelope,
      verification: {
        verified,
        verifier: "easap-reference-verifier-v1",
        limitations: ["HMAC reference issuer is not a production trust root"],
      },
    },
    200,
    request,
  );
}

async function deriveIncidentScenario(request: Request, identity: RequestIdentity) {
  const body = await readJson<{
    incident: SyntheticIncident;
    review: PrivacyReview;
    worldDigest: `sha256:${string}`;
    scenarioVersion?: string;
  }>(request);
  if (body.incident?.tenantId !== identity.tenantId) {
    throw new RequestError(403, "Incident tenant does not match the authenticated tenant.");
  }
  const regression = await deriveRedactedRegressionScenario(
    body.incident,
    body.review,
    {
      worldDigest: body.worldDigest,
      ...(body.scenarioVersion ? { scenarioVersion: body.scenarioVersion } : {}),
    },
  );
  const stored = await putImmutableRecord({
    tenantId: identity.tenantId,
    kind: "scenario",
    externalId: regression.scenario.scenarioId,
    version: regression.scenario.version,
    payload: regression.scenario,
    classification: regression.scenario.classification,
    createdBy: identity.principal,
  });
  return response({ regression, stored }, 201, request);
}

async function dispatch(request: Request) {
  const url = new URL(request.url);
  const route = endpoint(url.pathname);
  if (request.method === "GET" && route === "health") {
    return json({
      status: "ok",
      mode: "STANDARD-reference",
      conformance: "reference-only",
      version: "1.0.0",
    });
  }

  const identity = await requestIdentity(request);

  if (request.method === "POST" && route === "demo:run") {
    requireAction(identity, "campaign.create");
    const body = await readJson<JsonRecord>(request);
    const trialCount = int(body.trial_count ?? body.trialCount, 24, 1, 200);
    return response(await runReferenceDemo(identity, trialCount), 201, request);
  }

  if (route === "subjects") {
    if (request.method === "GET") {
      requireAction(identity, "evidence.read");
      return response(await listImmutableRecords(identity.tenantId, "subject"), 200, request);
    }
    if (request.method === "POST") {
      requireAction(identity, "subject.register");
      return registerImmutable(request, identity, "subject");
    }
  }
  if (route === "worlds") {
    if (request.method === "GET") {
      requireAction(identity, "evidence.read");
      return response(await listImmutableRecords(identity.tenantId, "world"), 200, request);
    }
    if (request.method === "POST") {
      requireAction(identity, "world.publish");
      return registerImmutable(request, identity, "world");
    }
  }
  if (request.method === "POST" && route === "scenarios:validate") {
    requireAction(identity, "scenario.validate");
    const body = await readJson<{ scenario: Scenario; world?: WorldModel }>(request);
    const validation = await validateScenarioManifest(body.scenario, body.world);
    return response(validation, validation.valid ? 200 : 422, request);
  }
  if (route === "scenarios") {
    if (request.method === "GET") {
      requireAction(identity, "evidence.read");
      return response(
        await listImmutableRecords(
          identity.tenantId,
          "scenario",
          canReadHiddenSuite(identity),
        ),
        200,
        request,
      );
    }
    if (request.method === "POST") {
      requireAction(identity, "scenario.publish");
      return registerImmutable(request, identity, "scenario");
    }
  }
  if (route === "profiles" && request.method === "POST") {
    requireAction(identity, "profile.publish");
    return registerImmutable(request, identity, "profile");
  }
  if (route === "campaigns") {
    if (request.method === "GET") {
      requireAction(identity, "evidence.read");
      return response(await listCampaigns(identity.tenantId), 200, request);
    }
    if (request.method === "POST") {
      requireAction(identity, "campaign.create");
      return createCampaign(request, identity);
    }
  }
  const campaignMatch = /^campaigns\/([^/]+)$/u.exec(route);
  if (request.method === "GET" && campaignMatch) {
    requireAction(identity, "evidence.read");
    const campaign = await getCampaign(identity.tenantId, campaignMatch[1]!);
    if (!campaign) throw new RequestError(404, "Campaign not found.");
    return response(campaign, 200, request);
  }
  const runMatch = /^trials\/([^/]+):run$/u.exec(route);
  if (request.method === "POST" && runMatch) {
    requireAction(identity, "trial.run");
    return runTrialEndpoint(request, identity, runMatch[1]!);
  }
  const replayMatch = /^trials\/([^/]+):replay$/u.exec(route);
  if (request.method === "POST" && replayMatch) {
    requireAction(identity, "trial.replay");
    return replayTrialEndpoint(request, identity, replayMatch[1]!);
  }
  const trialMatch = /^trials\/([^/]+)$/u.exec(route);
  if (request.method === "GET" && trialMatch) {
    requireAction(identity, "evidence.read");
    const trial = await getTrial(identity.tenantId, trialMatch[1]!);
    if (!trial) throw new RequestError(404, "Trial not found.");
    return response(trial, 200, request);
  }
  if (route === "findings" && request.method === "GET") {
    requireAction(identity, "evidence.read");
    return response(await listFindings(identity.tenantId), 200, request);
  }
  const minimizeMatch = /^findings\/([^/]+):minimize$/u.exec(route);
  if (request.method === "POST" && minimizeMatch) {
    requireAction(identity, "finding.minimize");
    return minimizeFindingEndpoint(request, identity, minimizeMatch[1]!);
  }
  if (request.method === "POST" && route === "assurance:decide") {
    requireAction(identity, "assurance.decide");
    return decideEndpoint(request, identity);
  }
  const statusMatch = /^certificates\/([^/]+)\/status$/u.exec(route);
  if (request.method === "GET" && statusMatch) {
    requireAction(identity, "evidence.read");
    const certificate = await getCertificate(identity.tenantId, statusMatch[1]!);
    if (!certificate) throw new RequestError(404, "Certificate not found.");
    return response(
      {
        certificate,
        status: certificate.status,
        revoked: certificate.status === "REVOKED",
        expired: Date.parse(certificate.expiresAt) <= Date.now(),
      },
      200,
      request,
    );
  }
  const revokeMatch = /^certificates\/([^/]+):revoke$/u.exec(route);
  if (request.method === "POST" && revokeMatch) {
    requireAction(identity, "certificate.revoke");
    const body = await readJson<{ reason?: string }>(request);
    return response(
      await revokeCertificate({
        tenantId: identity.tenantId,
        certificateId: revokeMatch[1]!,
        reason: text(body.reason, "reason"),
        actor: identity.principal,
      }),
      200,
      request,
    );
  }
  const exportMatch = /^results\/([^/]+)\/export$/u.exec(route);
  if (request.method === "GET" && exportMatch) {
    requireAction(identity, "evidence.read");
    return exportResult(request, identity, exportMatch[1]!);
  }
  if (request.method === "POST" && route === "incidents:derive-scenario") {
    requireAction(identity, "incident.derive");
    return deriveIncidentScenario(request, identity);
  }

  throw new RequestError(404, `No ${request.method} handler exists for /v1/${route}.`);
}

export async function handleV1(request: Request) {
  try {
    return await dispatch(request);
  } catch (error) {
    return problem(error, request);
  }
}
