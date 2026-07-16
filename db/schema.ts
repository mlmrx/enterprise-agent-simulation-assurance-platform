import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * The SQLite/libSQL schema is the durable control-plane projection. High-volume observation
 * payloads belong in the evidence object store in a production deployment; this
 * reference keeps only compact manifests and trace summaries in the database.
 */
export const roleBindings = sqliteTable(
  "role_bindings",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    principal: text("principal").notNull(),
    role: text("role").notNull(),
    maxClassification: text("max_classification").notNull().default("STANDARD"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("role_binding_tenant_principal_role_uq").on(
      table.tenantId,
      table.principal,
      table.role,
    ),
    index("role_binding_principal_idx").on(table.principal, table.active),
  ],
);

export const immutableRecords = sqliteTable(
  "immutable_records",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    kind: text("kind").notNull(),
    externalId: text("external_id").notNull(),
    version: text("version").notNull(),
    digest: text("digest").notNull(),
    classification: text("classification").notNull().default("STANDARD"),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("SEALED"),
    payload: text("payload").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    sealedAt: text("sealed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("record_tenant_kind_external_version_uq").on(
      table.tenantId,
      table.kind,
      table.externalId,
      table.version,
    ),
    uniqueIndex("record_tenant_digest_uq").on(table.tenantId, table.digest),
    index("record_tenant_kind_created_idx").on(
      table.tenantId,
      table.kind,
      table.createdAt,
    ),
  ],
);

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    subjectDigest: text("subject_digest").notNull(),
    worldDigest: text("world_digest").notNull(),
    scenarioDigest: text("scenario_digest").notNull(),
    mode: text("mode").notNull(),
    isolationClass: text("isolation_class").notNull(),
    seedSchedule: text("seed_schedule").notNull(),
    resourceLimits: text("resource_limits").notNull(),
    state: text("state").notNull().default("QUEUED"),
    totalTrials: integer("total_trials").notNull(),
    completedTrials: integer("completed_trials").notNull().default(0),
    failedTrials: integer("failed_trials").notNull().default(0),
    requestedBy: text("requested_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("campaign_tenant_state_created_idx").on(
      table.tenantId,
      table.state,
      table.createdAt,
    ),
  ],
);

export const trialAttempts = sqliteTable(
  "trial_attempts",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    campaignId: text("campaign_id").notNull(),
    attempt: integer("attempt").notNull().default(1),
    seed: integer("seed").notNull(),
    state: text("state").notNull().default("PENDING"),
    harnessVersion: text("harness_version").notNull(),
    environmentAttestation: text("environment_attestation").notNull(),
    traceRoot: text("trace_root"),
    resultDigest: text("result_digest"),
    resultManifest: text("result_manifest"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("trial_campaign_seed_attempt_uq").on(
      table.campaignId,
      table.seed,
      table.attempt,
    ),
    index("trial_tenant_campaign_state_idx").on(
      table.tenantId,
      table.campaignId,
      table.state,
    ),
  ],
);

export const findings = sqliteTable(
  "findings",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    trialId: text("trial_id").notNull(),
    failureClass: text("failure_class").notNull(),
    severity: text("severity").notNull(),
    reproducible: integer("reproducible", { mode: "boolean" }).notNull(),
    traceRoot: text("trace_root").notNull(),
    payload: text("payload").notNull(),
    minimalCase: text("minimal_case"),
    quarantined: integer("quarantined", { mode: "boolean" }).notNull().default(true),
    sealedAt: text("sealed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("finding_tenant_severity_idx").on(table.tenantId, table.severity),
    index("finding_trial_idx").on(table.trialId),
  ],
);

export const evidenceEvents = sqliteTable(
  "evidence_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    payload: text("payload").notNull(),
    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),
    actor: text("actor").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("evidence_aggregate_sequence_uq").on(
      table.tenantId,
      table.aggregateType,
      table.aggregateId,
      table.sequence,
    ),
    uniqueIndex("evidence_event_hash_uq").on(table.eventHash),
    index("evidence_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
);

export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    subjectDigest: text("subject_digest").notNull(),
    profileDigest: text("profile_digest").notNull(),
    resultSetDigest: text("result_set_digest").notNull(),
    decision: text("decision").notNull(),
    conditions: text("conditions").notNull(),
    coverage: text("coverage").notNull(),
    residualRisk: text("residual_risk").notNull(),
    issuer: text("issuer").notNull(),
    approver: text("approver").notNull(),
    digest: text("digest").notNull(),
    signature: text("signature").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    revocationEndpoint: text("revocation_endpoint").notNull(),
    issuedAt: text("issued_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("certificate_tenant_digest_uq").on(table.tenantId, table.digest),
    index("certificate_subject_status_idx").on(
      table.tenantId,
      table.subjectDigest,
      table.status,
    ),
  ],
);

export const revocations = sqliteTable("revocations", {
  certificateId: text("certificate_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  reason: text("reason").notNull(),
  actor: text("actor").notNull(),
  eventHash: text("event_hash").notNull(),
  revokedAt: text("revoked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const idempotencyKeys = sqliteTable(
  "idempotency_keys",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    key: text("key").notNull(),
    requestDigest: text("request_digest").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: text("response_body").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idempotency_tenant_key_uq").on(table.tenantId, table.key),
  ],
);
