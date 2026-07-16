import { getDatabaseClient } from "@/db";

let referenceSchemaPromise: Promise<void> | undefined;

const referenceSchema = [
  `CREATE TABLE IF NOT EXISTS role_bindings (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    principal text NOT NULL,
    role text NOT NULL,
    max_classification text DEFAULT 'STANDARD' NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS immutable_records (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    kind text NOT NULL,
    external_id text NOT NULL,
    version text NOT NULL,
    digest text NOT NULL,
    classification text DEFAULT 'STANDARD' NOT NULL,
    hidden integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'SEALED' NOT NULL,
    payload text NOT NULL,
    created_by text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sealed_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS record_tenant_kind_external_version_uq
    ON immutable_records (tenant_id, kind, external_id, version)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS record_tenant_digest_uq
    ON immutable_records (tenant_id, digest)`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    subject_digest text NOT NULL,
    world_digest text NOT NULL,
    scenario_digest text NOT NULL,
    mode text NOT NULL,
    isolation_class text NOT NULL,
    seed_schedule text NOT NULL,
    resource_limits text NOT NULL,
    state text DEFAULT 'QUEUED' NOT NULL,
    total_trials integer NOT NULL,
    completed_trials integer DEFAULT 0 NOT NULL,
    failed_trials integer DEFAULT 0 NOT NULL,
    requested_by text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at text,
    completed_at text
  )`,
  `CREATE TABLE IF NOT EXISTS trial_attempts (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    campaign_id text NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    seed integer NOT NULL,
    state text DEFAULT 'PENDING' NOT NULL,
    harness_version text NOT NULL,
    environment_attestation text NOT NULL,
    trace_root text,
    result_digest text,
    result_manifest text,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at text,
    completed_at text
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS trial_campaign_seed_attempt_uq
    ON trial_attempts (campaign_id, seed, attempt)`,
  `CREATE TABLE IF NOT EXISTS findings (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    trial_id text NOT NULL,
    failure_class text NOT NULL,
    severity text NOT NULL,
    reproducible integer NOT NULL,
    trace_root text NOT NULL,
    payload text NOT NULL,
    minimal_case text,
    quarantined integer DEFAULT 1 NOT NULL,
    sealed_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS evidence_events (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    sequence integer NOT NULL,
    event_type text NOT NULL,
    payload_digest text NOT NULL,
    payload text NOT NULL,
    previous_hash text,
    event_hash text NOT NULL,
    actor text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS evidence_aggregate_sequence_uq
    ON evidence_events (tenant_id, aggregate_type, aggregate_id, sequence)`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    subject_digest text NOT NULL,
    profile_digest text NOT NULL,
    result_set_digest text NOT NULL,
    decision text NOT NULL,
    conditions text NOT NULL,
    coverage text NOT NULL,
    residual_risk text NOT NULL,
    issuer text NOT NULL,
    approver text NOT NULL,
    digest text NOT NULL,
    signature text NOT NULL,
    status text DEFAULT 'ACTIVE' NOT NULL,
    revocation_endpoint text NOT NULL,
    issued_at text NOT NULL,
    expires_at text NOT NULL,
    revoked_at text
  )`,
  `CREATE TABLE IF NOT EXISTS revocations (
    certificate_id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    reason text NOT NULL,
    actor text NOT NULL,
    event_hash text NOT NULL,
    revoked_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS idempotency_keys (
    id text PRIMARY KEY NOT NULL,
    tenant_id text NOT NULL,
    key text NOT NULL,
    request_digest text NOT NULL,
    response_status integer NOT NULL,
    response_body text NOT NULL,
    expires_at text NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idempotency_tenant_key_uq
    ON idempotency_keys (tenant_id, key)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS role_binding_tenant_principal_role_uq
    ON role_bindings (tenant_id, principal, role)`,
  `CREATE INDEX IF NOT EXISTS role_binding_principal_idx
    ON role_bindings (principal, active)`,
  `CREATE INDEX IF NOT EXISTS record_tenant_kind_created_idx
    ON immutable_records (tenant_id, kind, created_at)`,
  `CREATE INDEX IF NOT EXISTS campaign_tenant_state_created_idx
    ON campaigns (tenant_id, state, created_at)`,
  `CREATE INDEX IF NOT EXISTS trial_tenant_campaign_state_idx
    ON trial_attempts (tenant_id, campaign_id, state)`,
  `CREATE INDEX IF NOT EXISTS finding_tenant_severity_idx
    ON findings (tenant_id, severity)`,
  `CREATE INDEX IF NOT EXISTS finding_trial_idx
    ON findings (trial_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS evidence_event_hash_uq
    ON evidence_events (event_hash)`,
  `CREATE INDEX IF NOT EXISTS evidence_tenant_created_idx
    ON evidence_events (tenant_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS certificate_tenant_digest_uq
    ON certificates (tenant_id, digest)`,
  `CREATE INDEX IF NOT EXISTS certificate_subject_status_idx
    ON certificates (tenant_id, subject_digest, status)`,
] as const;

/**
 * The reference runtime bootstraps its portable SQLite/libSQL projection on
 * first authenticated API use. Production operators may instead apply the
 * checked-in Drizzle migration as part of their normal release process.
 */
export function ensureReferenceSchema() {
  referenceSchemaPromise ??= getDatabaseClient()
    .executeMultiple(referenceSchema.join(";\n"))
    .then(() => undefined);
  return referenceSchemaPromise;
}
