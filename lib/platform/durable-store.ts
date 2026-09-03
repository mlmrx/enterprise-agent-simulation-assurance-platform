import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  campaigns,
  certificates,
  evidenceEvents,
  findings,
  immutableRecords,
  roleBindings,
  revocations,
  trialAttempts,
} from "@/db/schema";
import { canonicalizeJson, contentAddress } from "@/lib/easap";
import { RequestError } from "./http";

export type RecordKind = "subject" | "world" | "scenario" | "profile" | "result";

export interface ImmutableRecordInput<T> {
  tenantId: string;
  kind: RecordKind;
  externalId: string;
  version: string;
  classification?: string;
  hidden?: boolean;
  payload: T;
  createdBy: string;
}

export async function putImmutableRecord<T>(input: ImmutableRecordInput<T>) {
  const db = getDb();
  const digest = await contentAddress(input.payload);
  const tenantScopedDigest = await contentAddress({ tenantId: input.tenantId, digest });
  const id = `rec_${tenantScopedDigest.slice("sha256:".length, "sha256:".length + 24)}`;
  await db
    .insert(immutableRecords)
    .values({
      id,
      tenantId: input.tenantId,
      kind: input.kind,
      externalId: input.externalId,
      version: input.version,
      digest,
      classification: input.classification ?? "STANDARD",
      hidden: input.hidden ?? false,
      status: "SEALED",
      payload: canonicalizeJson(input.payload),
      createdBy: input.createdBy,
    })
    .onConflictDoNothing();

  const [stored] = await db
    .select()
    .from(immutableRecords)
    .where(
      and(
        eq(immutableRecords.tenantId, input.tenantId),
        eq(immutableRecords.kind, input.kind),
        eq(immutableRecords.externalId, input.externalId),
        eq(immutableRecords.version, input.version),
      ),
    )
    .limit(1);

  if (!stored) throw new RequestError(500, "The immutable record was not persisted.");
  if (stored.digest !== digest) {
    throw new RequestError(
      409,
      `${input.kind} ${input.externalId}@${input.version} is already sealed with another digest.`,
    );
  }
  return { ...stored, payload: JSON.parse(stored.payload) as T };
}

export async function listImmutableRecords(
  tenantId: string,
  kind: RecordKind,
  includeHidden = false,
) {
  const db = getDb();
  const clauses = [
    eq(immutableRecords.tenantId, tenantId),
    eq(immutableRecords.kind, kind),
  ];
  if (!includeHidden) clauses.push(eq(immutableRecords.hidden, false));
  const rows = await db
    .select()
    .from(immutableRecords)
    .where(and(...clauses))
    .orderBy(desc(immutableRecords.createdAt))
    .limit(100);
  return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

export async function getImmutableRecord<T>(tenantId: string, digest: string) {
  const [row] = await getDb()
    .select()
    .from(immutableRecords)
    .where(
      and(
        eq(immutableRecords.tenantId, tenantId),
        eq(immutableRecords.digest, digest),
      ),
    )
    .limit(1);
  return row ? { ...row, payload: JSON.parse(row.payload) as T } : undefined;
}

export async function getImmutableRecordByExternalId<T>(
  tenantId: string,
  kind: RecordKind,
  externalId: string,
) {
  const [row] = await getDb()
    .select()
    .from(immutableRecords)
    .where(
      and(
        eq(immutableRecords.tenantId, tenantId),
        eq(immutableRecords.kind, kind),
        eq(immutableRecords.externalId, externalId),
      ),
    )
    .orderBy(desc(immutableRecords.createdAt))
    .limit(1);
  return row ? { ...row, payload: JSON.parse(row.payload) as T } : undefined;
}

export async function loadPrincipalRoles(tenantId: string, principal: string) {
  const rows = await getDb()
    .select({ role: roleBindings.role })
    .from(roleBindings)
    .where(
      and(
        eq(roleBindings.tenantId, tenantId),
        eq(roleBindings.principal, principal.toLowerCase()),
        eq(roleBindings.active, true),
      ),
    );
  return rows.map((row) => row.role);
}

export interface CampaignProjection {
  id: string;
  tenantId: string;
  subjectDigest: string;
  worldDigest: string;
  scenarioDigest: string;
  mode: string;
  isolationClass: string;
  seeds: number[];
  resourceLimits: Record<string, number>;
  requestedBy: string;
}

export async function putCampaign(input: CampaignProjection) {
  const db = getDb();
  await db
    .insert(campaigns)
    .values({
      id: input.id,
      tenantId: input.tenantId,
      subjectDigest: input.subjectDigest,
      worldDigest: input.worldDigest,
      scenarioDigest: input.scenarioDigest,
      mode: input.mode,
      isolationClass: input.isolationClass,
      seedSchedule: canonicalizeJson(input.seeds),
      resourceLimits: canonicalizeJson(input.resourceLimits),
      totalTrials: input.seeds.length,
      requestedBy: input.requestedBy,
    })
    .onConflictDoNothing();
  return getCampaign(input.tenantId, input.id);
}

export async function getCampaign(tenantId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id)))
    .limit(1);
  if (!row) return undefined;
  return {
    ...row,
    seedSchedule: JSON.parse(row.seedSchedule) as number[],
    resourceLimits: JSON.parse(row.resourceLimits) as Record<string, number>,
  };
}

export async function listCampaigns(tenantId: string) {
  const rows = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.tenantId, tenantId))
    .orderBy(desc(campaigns.createdAt))
    .limit(50);
  return rows.map((row) => ({
    ...row,
    seedSchedule: JSON.parse(row.seedSchedule),
    resourceLimits: JSON.parse(row.resourceLimits),
  }));
}

export async function startCampaign(tenantId: string, id: string) {
  await getDb()
    .update(campaigns)
    .set({ state: "RUNNING", startedAt: new Date().toISOString() })
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.id, id)));
}

export async function completeCampaign(options: {
  tenantId: string;
  id: string;
  completedTrials: number;
  failedTrials: number;
}) {
  await getDb()
    .update(campaigns)
    .set({
      state: options.failedTrials > 0 ? "COMPLETED_WITH_FINDINGS" : "COMPLETED",
      completedTrials: options.completedTrials,
      failedTrials: options.failedTrials,
      completedAt: new Date().toISOString(),
    })
    .where(and(eq(campaigns.tenantId, options.tenantId), eq(campaigns.id, options.id)));
}

export async function sealTrial(options: {
  id: string;
  tenantId: string;
  campaignId: string;
  seed: number;
  harnessVersion: string;
  environmentAttestation: unknown;
  traceRoot: string;
  resultDigest: string;
  resultManifest: unknown;
}) {
  const now = new Date().toISOString();
  await getDb()
    .insert(trialAttempts)
    .values({
      id: options.id,
      tenantId: options.tenantId,
      campaignId: options.campaignId,
      seed: options.seed,
      state: "SEALED",
      harnessVersion: options.harnessVersion,
      environmentAttestation: canonicalizeJson(options.environmentAttestation),
      traceRoot: options.traceRoot,
      resultDigest: options.resultDigest,
      resultManifest: canonicalizeJson(options.resultManifest),
      startedAt: now,
      completedAt: now,
    })
    .onConflictDoNothing();
}

export async function getTrial(tenantId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(trialAttempts)
    .where(and(eq(trialAttempts.tenantId, tenantId), eq(trialAttempts.id, id)))
    .limit(1);
  if (!row) return undefined;
  return {
    ...row,
    environmentAttestation: JSON.parse(row.environmentAttestation),
    resultManifest: row.resultManifest ? JSON.parse(row.resultManifest) : undefined,
  };
}

export async function putFinding(options: {
  id: string;
  tenantId: string;
  trialId: string;
  failureClass: string;
  severity: string;
  reproducible: boolean;
  traceRoot: string;
  payload: unknown;
  minimalCase?: unknown;
}) {
  await getDb()
    .insert(findings)
    .values({
      id: options.id,
      tenantId: options.tenantId,
      trialId: options.trialId,
      failureClass: options.failureClass,
      severity: options.severity,
      reproducible: options.reproducible,
      traceRoot: options.traceRoot,
      payload: canonicalizeJson(options.payload),
      minimalCase:
        options.minimalCase === undefined ? null : canonicalizeJson(options.minimalCase),
      quarantined: true,
    })
    .onConflictDoNothing();
}

export async function listFindings(tenantId: string) {
  const rows = await getDb()
    .select()
    .from(findings)
    .where(eq(findings.tenantId, tenantId))
    .orderBy(desc(findings.sealedAt))
    .limit(100);
  return rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload),
    minimalCase: row.minimalCase ? JSON.parse(row.minimalCase) : undefined,
  }));
}

export async function saveFindingMinimum(
  tenantId: string,
  findingId: string,
  minimalCase: unknown,
) {
  const updated = await getDb()
    .update(findings)
    .set({ minimalCase: canonicalizeJson(minimalCase) })
    .where(and(eq(findings.tenantId, tenantId), eq(findings.id, findingId)))
    .returning({ id: findings.id });
  if (updated.length === 0) {
    throw new RequestError(404, "Finding not found in the durable projection.");
  }
}

export async function appendEvidenceEvent(options: {
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  actor: string;
}) {
  const db = getDb();
  const [previous] = await db
    .select()
    .from(evidenceEvents)
    .where(
      and(
        eq(evidenceEvents.tenantId, options.tenantId),
        eq(evidenceEvents.aggregateType, options.aggregateType),
        eq(evidenceEvents.aggregateId, options.aggregateId),
      ),
    )
    .orderBy(desc(evidenceEvents.sequence))
    .limit(1);
  const sequence = (previous?.sequence ?? 0) + 1;
  const payloadDigest = await contentAddress(options.payload);
  const eventHash = await contentAddress({
    tenantId: options.tenantId,
    aggregateType: options.aggregateType,
    aggregateId: options.aggregateId,
    sequence,
    eventType: options.eventType,
    payloadDigest,
    previousHash: previous?.eventHash ?? null,
  });
  const id = `evt_${eventHash.slice("sha256:".length, "sha256:".length + 24)}`;
  await db.insert(evidenceEvents).values({
    id,
    tenantId: options.tenantId,
    aggregateType: options.aggregateType,
    aggregateId: options.aggregateId,
    sequence,
    eventType: options.eventType,
    payloadDigest,
    payload: canonicalizeJson(options.payload),
    previousHash: previous?.eventHash ?? null,
    eventHash,
    actor: options.actor,
  });
  return { id, sequence, payloadDigest, eventHash, previousHash: previous?.eventHash ?? null };
}

export async function putCertificate(options: {
  id: string;
  tenantId: string;
  subjectDigest: string;
  profileDigest: string;
  resultSetDigest: string;
  decision: string;
  conditions: unknown;
  coverage: unknown;
  residualRisk: unknown;
  issuer: string;
  approver: string;
  digest: string;
  signature: string;
  revocationEndpoint: string;
  issuedAt: string;
  expiresAt: string;
}) {
  await getDb()
    .insert(certificates)
    .values({
      ...options,
      conditions: canonicalizeJson(options.conditions),
      coverage: canonicalizeJson(options.coverage),
      residualRisk: canonicalizeJson(options.residualRisk),
      status: "ACTIVE",
    })
    .onConflictDoNothing();
}

export async function getCertificate(tenantId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(certificates)
    .where(and(eq(certificates.tenantId, tenantId), eq(certificates.id, id)))
    .limit(1);
  return row
    ? {
        ...row,
        conditions: JSON.parse(row.conditions),
        coverage: JSON.parse(row.coverage),
        residualRisk: JSON.parse(row.residualRisk),
      }
    : undefined;
}

export async function revokeCertificate(options: {
  tenantId: string;
  certificateId: string;
  reason: string;
  actor: string;
}) {
  const certificate = await getCertificate(options.tenantId, options.certificateId);
  if (!certificate) throw new RequestError(404, "Certificate not found.");
  if (certificate.status === "REVOKED") return certificate;
  const revokedAt = new Date().toISOString();
  const eventHash = await contentAddress({ ...options, revokedAt });
  const db = getDb();
  await db.batch([
    db
      .update(certificates)
      .set({ status: "REVOKED", revokedAt })
      .where(
        and(
          eq(certificates.tenantId, options.tenantId),
          eq(certificates.id, options.certificateId),
        ),
      ),
    db
      .insert(revocations)
      .values({
        certificateId: options.certificateId,
        tenantId: options.tenantId,
        reason: options.reason,
        actor: options.actor,
        eventHash,
        revokedAt,
      })
      .onConflictDoNothing(),
  ]);
  return getCertificate(options.tenantId, options.certificateId);
}
