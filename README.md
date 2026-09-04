# Enterprise Agent Simulation and Assurance Platform

This repository is an end-to-end **STANDARD reference implementation** of
EASAP-PS-001 v1.0. It turns immutable agent, world, and scenario manifests into
repeatable seeded trials, causal traces, findings, statistical measures, signed
assurance decisions, and revocable release certificates.

The reference system is intentionally honest about its boundary: it demonstrates
the control, simulation, evaluation, and evidence contracts on a single local
worker. It does not claim the microVM isolation, hardware-backed signing,
100,000-trial concurrency, or regional event throughput required for a fully
conformant HIGH-RISK production deployment.

## What works end to end

- Content-addressed, immutable subject, world, scenario, profile, and result records.
- Typed scenario validation and hidden-suite access controls.
- A deterministic virtual clock, seeded PRNG, fail-closed capability mediation,
  fault injection, causal observations, and exact trace replay.
- Multi-seed campaigns with sample count, distribution, 95% confidence interval,
  seed coverage, and separated reliability/policy/robustness measures.
- Sealed findings, hierarchical failure minimization, and quarantined exploit data.
- Material-change invalidation across model, prompts, tools, policy, memory,
  connectors, and runtime dependencies.
- Signed result/certificate envelopes, independent verification, typed conditional
  deployment restrictions, expiry, revocation, and fail-closed release-gate checks.
- Privacy-reviewed incident-to-regression conversion with protected values redacted.
- A role-aware assurance console and the normative `/v1` API surface.
- A public live workbench that executes the real STANDARD campaign engine and
  returns verifiable evidence rather than substituting a canned result.
- A deterministic Agent Release Readiness Planner that converts an agent's
  authority, data exposure, autonomy, deployment stage, and existing safeguards
  into an inherent-risk tier, open control map, targeted scenario pack,
  role-specific actions, and a machine-readable release-gate policy.
- An enterprise product surface with technical insights, a primary-source news
  desk, and a deterministic daily operator brief.

## Public product surfaces

- `/` — enterprise landing page and embedded live campaign proof.
- `/what-is-easap` — category explainer: what EASAP is, what it is not, and how its evidence chain works.
- `/guides` — function-based guide hub for engineering, security, governance, and release teams.
- `/guides/{role}` — role-specific workflow, outputs, checklist, and handoff instructions.
- `/assess` — immediate release-readiness utility with downloadable JSON and
  Markdown assurance plans; no account or production connection required.
- `/platform` — executable assurance workbench with downloadable evidence JSON.
- `/insights` — original technical field notes for release and risk teams.
- `/news` — source-linked agent security, standards, and evaluation intelligence.
- `/daily/YYYY-MM-DD` — archived daily operator brief generated from verified feeds.

The scheduled workflow in `.github/workflows/daily-intelligence.yml` runs every
day at 12:15 UTC. It retrieves configured NIST, OWASP, MCP, and A2A feeds, keeps
only relevant items with resolvable source URLs, generates a deterministic
control-room brief, verifies the full platform, and commits the content. If no
sources can be verified, it preserves the prior desk instead of inventing news.
The public site reads those versioned JSON records from the public repository
through a 15-minute cache, so daily updates do not require unattended production
deployment credentials.
Run the same pipeline anywhere with:

```bash
npm run content:daily
```

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open the URL printed by the development server. The local preview provisions an
isolated SQLite database at `data/easap.db`. On localhost, the API uses a clearly
marked all-roles reference identity so the complete flow can be exercised without
an external identity provider. Copy `.env.example` when you need to override the
database, public URL, or remote authentication mode.

Run the same build in a portable container:

```bash
docker compose -f deploy/docker-compose.yml up --build
```

The image stores SQLite under `/data`. Stateless hosts can use a remote libSQL
database by setting `DATABASE_URL` and `DATABASE_AUTH_TOKEN`. See
[deployment options](docs/deployment.md) for Docker, Node, Kubernetes, and
identity-proxy configuration.

Run the complete verification suite:

```bash
npm test
```

Run just the domain and acceptance tests:

```bash
npm run test:domain
```

## Reference flow

```mermaid
flowchart LR
  A["Register immutable subject"] --> B["Publish world and validate scenario"]
  B --> C["Create bounded seed campaign"]
  C --> D["Run mediated deterministic trials"]
  D --> E["Evaluate oracles and minimize findings"]
  E --> F["Seal and sign result evidence"]
  F --> G["Approve, condition, or reject release"]
  G --> H["Verify certificate at release gate"]
  H --> I["Revoke and propagate status"]
```

The live workbench's **Run live campaign** action performs this vertical slice with
a procurement agent exposed to stale vendor data, permission loss, latency,
prompt/tool injection, budget exhaustion, and attempted data exfiltration.

## Architecture

The local build is a modular control plane with a replaceable execution boundary:

- `app/` - operator console and HTTP route adapter.
- `lib/easap/` - portable domain contracts, deterministic runtime, evaluation,
  evidence signing, assurance, revocation, and incident regression.
- `lib/platform/` - identity, authorization, HTTP, and durable SQLite/libSQL projections.
- `db/` and `drizzle/` - append-friendly control-plane schema and migration.
- `openapi/` - versioned external API contract.
- `docs/` - production architecture, security, operations, and spec traceability.
- `deploy/` - local dependency topology and production Kubernetes reference manifests.
- `tools/` - independent evidence verifier and release-gate examples.
- `tests/` - acceptance-aligned unit, integration, and rendered-output checks.

Production replaces local adapters without changing the domain contracts:

| Port | Reference mode | Production target |
|---|---|---|
| Metadata | SQLite / remote libSQL | HA relational store with tenant RLS |
| Evidence blobs | Compact database manifests | WORM object storage with retention lock |
| Work orchestration | In-process bounded runner | Temporal plus Kafka/Redpanda |
| Execution cell | Protocol-level deterministic sandbox | gVisor/Kata/Firecracker cell |
| Signing | Web Crypto reference issuer | KMS/HSM-backed issuer hierarchy |
| Policy | Typed in-process authorization | OPA/Cedar-compatible policy service |
| Telemetry | Structured local events | OpenTelemetry collector and SIEM |

See [architecture](docs/architecture.md), [security](docs/security.md),
[operations](docs/operations.md), [deployment](docs/deployment.md), and
[spec traceability](docs/spec-traceability.md).

## API

The implementation preserves the reference endpoints from EASAP-PS-001 and adds
read/status operations needed by an actual console:

- `POST /api/readiness/assess` — public, non-persistent readiness planning endpoint.
- `POST /api/demo/run` — bounded public execution of the real reference campaign.
- `POST /v1/subjects`
- `POST /v1/worlds`
- `POST /v1/scenarios:validate`
- `POST /v1/scenarios`
- `POST /v1/campaigns` and `GET /v1/campaigns/{id}`
- `POST /v1/trials/{id}:run` and `POST /v1/trials/{id}:replay`
- `POST /v1/findings/{id}:minimize`
- `POST /v1/assurance:decide`
- `GET /v1/certificates/{id}/status`
- `POST /v1/certificates/{id}:revoke`
- `GET /v1/results/{id}/export`
- `POST /v1/incidents:derive-scenario`

Long-running enterprise adapters should return `202 Accepted` and an operation
resource. The local reference executes bounded campaigns synchronously to keep the
full assurance chain inspectable. See `openapi/easap.v1.yaml` for schemas, problem
responses, idempotency, and authorization expectations.

## Security posture

All runtime effects are capability-declared. Undeclared network, credential,
filesystem, and tool access fails closed and is recorded as evidence. Manifests are
canonicalized before hashing; immutable evidence is chained; signatures bind exact
subject/world/scenario/profile/result digests. Hidden suites are redacted from
developer-facing reads, findings remain quarantined, and HIGH-RISK decisions enforce
author/approver separation.

The local all-roles identity, in-memory execution cell, and reference signing key are
development conveniences and are rejected as production controls. Follow
`docs/security.md` before connecting real enterprise data, credentials, or subjects.

## Conformance statement

The checked-in traceability matrix distinguishes **implemented**, **reference-only**,
and **production-gap** controls. Passing this repository's tests is evidence that the
reference contracts behave as described; it is not a claim that simulation proves
real-world safety, eliminates human accountability, or replaces production
monitoring and governance.

## License

Apache License 2.0. See [LICENSE](LICENSE).
