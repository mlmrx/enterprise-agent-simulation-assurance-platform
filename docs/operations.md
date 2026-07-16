# Operations, reliability, and scale

## Service objectives

| Dimension | Specification target | Operational interpretation |
|---|---|---|
| Trial reproducibility | Identical harness-visible trace for deterministic components | Golden replay divergence SLO of zero for supported harness versions |
| Scale | 100,000 concurrent STANDARD trials; 10 million results/campaign | Admission-controlled regional execution pools with hierarchical aggregation |
| Startup | STANDARD p95 <= 5 s; HIGH-RISK p95 <= 30 s | Measure request admission to first harness event, by isolation class |
| Event throughput | 1 million captured events/s/regional cluster | Durable ingest after backpressure; payloads chunked outside SQL |
| Result durability | Sealed result RPO 0 | Acknowledge only after replicated immutable evidence and manifest are durable |
| Availability | 99.9% authoring/control | Multi-zone control plane; execution saturation is explicit, never reported as success |
| Isolation | No cross-tenant network/storage/credential/cache access | Continuous adversarial isolation probes and tenant-scoped data paths |
| Portability | Export without proprietary UI state | Versioned JSON/JSONL bundles plus signatures and verifier metadata |

These production targets are not load-test claims for the local reference.

## Observability model

Platform telemetry and assurance evidence are separate. Telemetry explains service
health; it does not become proof of subject behavior unless a versioned evidence
adapter explicitly records it.

Trace API request -> operation -> campaign -> trial attempt -> cell -> observation
chunk -> evaluation -> seal -> decision with OpenTelemetry. Never use trial, subject,
campaign, or tenant IDs as unbounded metric labels.

Key metrics:

- API latency/error/rate by route family and authorization decision.
- Queue delay, admission rejection, quota use, and explicit capacity saturation.
- Cell startup p50/p95/p99 by region and isolation class.
- Platform success, infrastructure failure, subject failure, and cancellation.
- Unsupported-effect denial counts and policy decision latency.
- Deterministic replay divergence rate and first divergent sequence.
- Observation buffer pressure, loss attempts, chunk seal failures, and trace-root time.
- Oracle disagreement, judge appeal, calibration error, and finding minimization rate.
- Coverage, sample count, CI width, and seed strata completeness.
- Token/cost/call/energy-estimate/human-minute budget consumption.
- Evidence durability, signature, export, and independent verification latency.
- Material-change invalidation counts and conditional restriction failures.
- Certificate revocation propagation and release-gate cache age.
- Cross-tenant denials, canary leakage, and escape-test results.

## SLOs and alerting

| SLO | Window | Page condition |
|---|---|---|
| Control-plane availability >= 99.9% | Rolling 30 days | Fast burn consumes 2% monthly budget in 1 hour |
| Sealed-result loss = 0 | Immediate | Any acknowledged manifest or chunk is missing/unverifiable |
| Deterministic replay divergence = 0 | Per supported harness version | Any golden or customer-requested exact replay diverges |
| Revocation propagation <= configured SLO | Per revocation | Any connected gate accepts after deadline |
| Cross-tenant access = 0 | Immediate | Any synthetic probe reads another tenant's resource |
| Hidden-suite disclosure = 0 | Immediate | Canary or access test reveals protected fixture/seed/oracle data |

Capacity exhaustion is a product state. Return `429` for tenant quota and `503` with
capacity metadata for regional exhaustion; do not silently reduce trial counts,
seeds, isolation, coverage, or evidence capture.

## Capacity model

Admission reserves expected cell-seconds, CPU, memory, event bytes, model tokens,
external-call budget, and evidence storage before a campaign enters the queue. A
campaign declares hard bounds and a priority class. Weighted fair queuing prevents
one tenant or Monte Carlo campaign from starving release-critical trials.

Scale across three independent axes:

1. Campaign fan-out: partition by tenant/campaign and lease immutable trial attempts.
2. Cell execution: pre-warmed regional pools per isolation class.
3. Evidence ingest: partition event streams by stable trial hash and write compressed,
   checksummed chunks to object storage.

Hierarchical aggregators merge sufficient statistics for ten-million-result
campaigns without loading every result into one process. Seed-level manifests remain
addressable for audit and reproduction.

## Failure handling

- Worker loss: lease expires; scheduler creates a new attempt. Never overwrite the
  prior attempt or claim the incomplete trace is a subject failure.
- Duplicate delivery: event and manifest IDs are content-addressed/idempotent; unique
  sequence constraints reject conflicting writes.
- Object-store failure: stop acknowledging result seals and apply backpressure.
- Event-bus partition: cells buffer only to a strict limit, then fail explicitly with
  an environment deviation; never drop observations silently.
- KMS outage: trials may finish capture, but results remain `AWAITING_SIGNATURE` and
  cannot support a decision.
- Oracle failure: mark the required measure unavailable; do not substitute a passing
  default.
- Regional capacity loss: re-home only if data residency, suite keys, profile, and
  isolation requirements permit; record environment deviation.

## Backup and disaster recovery

Production defines the exact RPO-0 failure domain (normally a regional multi-zone
cell). Before acknowledging a seal:

1. Every evidence chunk is durably replicated and checksum-verified.
2. The result manifest and signature are committed.
3. The metadata projection and outbox event are committed.
4. An independent verifier can resolve all referenced digests.

Back up PostgreSQL with continuous WAL and cross-account immutable snapshots. Enable
object versioning, retention lock, and cross-region replication where residency
permits. Export public verification keys and revocation records to a separately
controlled recovery account.

Quarterly restore exercises rebuild a clean verifier, resolve a sampled result set,
replay deterministic trials, and measure RTO. Annual exercises assume compromise of
the primary signing service and validate key-revocation/reissuance procedures.

## Release and compatibility

- Domain/manifests are versioned independently from UI and deployment versions.
- A harness version remains available for the entire evidence retention window or is
  shipped as a reproducible signed artifact.
- Schema changes are expand/migrate/contract. Old workers remain readable during
  rollout; evidence records are never rewritten in place.
- Canary the control plane on synthetic tenants, then execution pools by isolation
  class. Stop rollout on replay divergence, observation loss, signature failure, or
  isolation-probe regression.
- Any harness, oracle, model gateway, policy, connector, or runtime dependency change
  triggers the same materiality evaluation applied to subject changes.

## Runbooks

### Replay divergence

Freeze the harness rollout, retain both traces, identify the first divergent causal
event, compare canonical manifests and algorithm versions, quarantine affected
certificates, and re-run golden suites. Do not normalize away the divergence.

### Suspected evidence tampering

Disable affected issuer keys, preserve storage and audit logs, verify hashes from an
independent account, mark certificates status-unknown/fail-closed, and start the
security incident process. Reissue only from independently verified source evidence.

### Harness escape or cross-tenant access

Stop the affected execution pool, revoke workload and disposable credentials, block
artifact digests, preserve cell images/recordings, notify security/privacy owners,
and invalidate decisions whose evidence boundary could be affected.

### Certificate revocation delay

Fail connected gates closed, bypass stale caches, compare authoritative ledger time
with gate receipt time, restore status distribution, and record the breached SLO in
the assurance history.

## Validation program

- Per change: domain/property tests, schema/API compatibility, mutation verification,
  hidden-suite access, and golden replay.
- Daily: tenant escape, effect denial, canary leakage, revocation, and key-health
  probes.
- Weekly: worker loss, duplicate delivery, queue partition, storage/KMS failure,
  minimization, and incident-redaction exercises.
- Before scale claims: no-op subject load tests at the full concurrency/result/event
  targets with evidence durability enabled.
- Quarterly: multi-zone failure and backup restore.
- Annually: regional recovery, signing compromise, independent penetration test, and
  HIGH-RISK microVM escape assessment.
