# Security and integrity design

This document converts the mandatory controls in EASAP-PS-001 into enforceable
trust boundaries. It distinguishes the runnable STANDARD reference from controls
required before real enterprise data, credentials, or authority are introduced.

## Assets and adversaries

Protected assets include hidden suites and seeds, enterprise fixtures, subject
artifacts, prompts and policies, disposable credentials, causal traces, quarantined
exploit content, result manifests, signing keys, decisions, certificates, and
revocation state.

Assume malicious evaluated subjects, malicious dependencies, prompt/tool-injected
users, colluding agents, compromised scenario artifacts, curious tenant users,
operator error, insider abuse, and compromised execution workers. The assurance service,
execution plane, evidence verifier, and signing service are separate trust domains.

## Roles and separation of duties

| Role | Allowed authority | Server-enforced restriction |
|---|---|---|
| Assurance owner | Define profiles, gates, accepted residual risk | Cannot author and approve the same HIGH-RISK profile |
| Scenario engineer | Publish worlds, scenarios, injectors, oracles, fixtures | Hidden-suite access requires an explicit classified assignment |
| Agent developer | Register immutable subjects, read permitted findings | Cannot mutate scenarios or sealed evidence |
| Red-team operator | Run adversarial campaigns, create exploit artifacts | Cannot issue or promote a release |
| Release authority | Approve, condition, or reject exact subject/result sets | Cannot modify result evidence or original findings |
| Auditor | Read manifests, coverage, signatures, and approval history | Read-only; no execution or decision authority |

Authorization evaluates tenant membership, role, resource classification, action,
purpose, isolation class, and separation-of-duty constraints. UI affordances are not
authorization. Every write is checked server-side and appended to the audit chain.

The localhost all-roles identity is restricted to loopback and labelled
`local-reference`. Hosted traffic requires the platform-authenticated user header;
production replaces this with federated OIDC/SAML, explicit tenant membership, SCIM
lifecycle, phishing-resistant MFA, and privileged access management.

## Isolation classes

| Class | Required production boundary | Data / effect policy |
|---|---|---|
| STANDARD | Rootless ephemeral container with seccomp and default-deny egress | Synthetic data, emulators, no external effects |
| RESTRICTED | Tenant-dedicated compute/storage/cache boundary | Masked enterprise data, tenant keys, denied egress |
| HIGH-RISK | Dedicated node and microVM, measured boot, HSM identity, dual control | Full recording, no shared cache, disposable credentials |
| SHADOW | Read-only event mirror, isolated cell, sink-only write adapters | Production events may enter; all writes are redirected |

The checked-in runtime implements protocol-level STANDARD mediation for supplied
subject adapters. It is not a sandbox for arbitrary untrusted binaries.

## Mandatory threat controls

### Benchmark leakage

- Encrypt hidden suites with a key available only to the execution identity.
- Developers and subjects receive opaque suite handles, not fixture/oracle/seed data.
- Enforce separate author and evaluator views; redact findings that would disclose
  hidden internals.
- Plant canary scenarios and detect subject output that reproduces hidden content.
- Use single-use suite grants bound to the exact campaign and cell attestation.

### Harness escape

- Run each trial in a disposable cell with read-only bundle mounts and bounded
  scratch storage.
- Deny egress by default; allow only harness sockets with mutually authenticated
  workload identities.
- Mediate syscalls, time, entropy, files, tools, model access, network, and human
  gates. Unsupported effects fail closed.
- Inject short-lived synthetic/disposable credentials; never mount production
  secrets into a test subject.
- Remove management-plane routes from cell networks and destroy the cell after seal.

### Result tampering

- Canonicalize and content-address every executable and evidence manifest.
- Hash-chain append-only audit/evidence events and checksum observation chunks.
- Sign results, decisions, and certificates with a key unavailable to API workers.
- Acknowledge a sealed result only after durable evidence and signature persistence.
- Verify exports with a separately deployed verifier and independent trust root.

### Oracle gaming

- Keep oracle code and calibration fixtures independent of subject code.
- Use hidden/metamorphic checks and more than one oracle for consequential gates.
- Version rubrics, calibration sets, judge models, tolerances, and provenance.
- Persist disagreement analysis and immutable appeal/superseding decisions.

### Synthetic-data disclosure

- Track source and transformation provenance for fixtures.
- Run privacy, membership-inference, uniqueness, and secret-pattern tests before seal.
- Use tenant-isolated fixture keys and storage prefixes.
- Require privacy approval before incident-derived scenarios become executable suites.

### False assurance

- Certificates bind the exact subject, suites, world, scenario, harness, and profile.
- Reports show operating envelope, coverage gaps, uncertainty, deviations, waivers,
  residual risk, conditions, and expiry.
- Any material digest change invalidates or explicitly narrows the prior decision.
- Release gates check expiry and revocation online and fail closed for HIGH-RISK use.

### Adversarial artifact escape

- Findings are quarantined and rendered as untrusted content with active content
  disabled, strict CSP, output encoding, and size limits.
- Copy/export requires purpose-bound authorization and visible warning/watermark.
- Direct promotion into production prompts, policies, tools, or memories is forbidden.

### Public-target connector abuse and SSRF

- Accept only HTTPS URLs with public DNS hostnames; reject IP literals, credentials
  in URLs, localhost-style names, and any DNS answer in private, loopback,
  link-local, documentation, multicast, or reserved ranges.
- Re-resolve and re-check the target before ownership verification and before every
  probe request. Never follow redirects from either the well-known challenge or the
  agent endpoint.
- Require an exact, short-lived challenge at
  `/.well-known/easap-verification.txt` before issuing a signed probe token.
- Keep setup and verified-target tokens short-lived, HMAC-signed, stateless, and
  free of API keys, cookies, bearer values, or other endpoint credentials.
- Permit only fixed, read-only JSON probe contracts with response-size and timeout
  bounds. Do not accept caller-defined headers, request bodies, or prompts on the
  hosted public connector.
- Treat the current DNS validation as a bounded public reference control. A
  production enterprise connector should additionally pin resolution at a
  controlled egress proxy to close the DNS-rebinding race between validation and
  socket establishment.

## Capability security model

A trial capability is an unforgeable, short-lived grant binding:

`tenant + trial + subject digest + adapter + operation + resource + budget + expiry`.

The harness verifies the grant at every boundary. A denied attempt creates a causal
observation and a policy-integrity finding when applicable. Resource counters cover
CPU, memory, time, tokens, cost, calls, file bytes, event count, and human wait time.
Budget exhaustion is a deterministic terminal or injected condition, never an
untracked infrastructure exception.

## Tenant isolation

- Every metadata query contains an explicit tenant predicate; production PostgreSQL
  repeats the rule with row-level security.
- Object keys start with an opaque tenant partition and use per-tenant envelope keys.
- Queues, caches, rate limits, metrics exemplars, and temporary files are tenant-aware.
- No tenant-controlled identifier becomes an object path, metric label, topic name,
  or SQL fragment without normalization.
- Cross-tenant denial tests run in CI and continuously against each isolation class.

## Signing and key management

The local Web Crypto HMAC issuer exists only to demonstrate deterministic envelope
verification. Production uses asymmetric keys in KMS/HSM:

1. Separate result, decision, and certificate issuer hierarchies.
2. Key IDs and algorithms are inside the signed envelope; trust policy is external.
3. API workers request signing through authenticated service identity and never read
   private key material.
4. Rotation produces a new active key while prior public keys remain for the longest
   evidence retention period.
5. Key compromise triggers issuer-key revocation, certificate status updates,
   re-verification, and incident response.
6. HIGH-RISK issuance requires dual authorization and hardware-backed attestation.

## Data protection and retention

- TLS 1.3/mTLS in transit between service identities; platform-managed encryption at
  rest plus per-tenant envelope encryption for protected payloads.
- Keep searchable metadata separate from encrypted trace payloads.
- Retention is profile-defined and enforced by object lock. Sealed findings are never
  silently deleted.
- A valid privacy-deletion requirement crypto-shreds protected payload keys while
  retaining tombstoned digests, provenance, and the audit event.
- Logs contain identifiers and digests, not prompts, credentials, fixtures, or trace
  payloads. Security exports use a reviewed disclosure channel.

## Supply chain

- Pin dependencies and base images; generate SBOM and provenance for assurance services,
  workers, scenario plug-ins, and subject bundles.
- Sign artifacts and verify signature/provenance at admission.
- Run SAST, dependency review, secret scanning, image scanning, and isolated dynamic
  escape tests in CI.
- Deterministic plug-ins are signed WASM with a fixed import set; arbitrary code is
  not accepted into scenario manifests.

## Security verification gates

- A02: attempt undeclared network, credentials, files, and tools; require denial and
  causal evidence.
- A04: prove developer APIs and subject cells cannot retrieve hidden fixtures/seeds.
- A08: flip one byte in every manifest/envelope and require independent rejection.
- A10: revoke a certificate and measure release-gate rejection within the configured
  SLO (reference default: 60 seconds; stricter for HIGH-RISK).
- Run tenant escape, role escalation, canary leakage, malicious artifact, sybil,
  exfiltration, cache bleed, secret broker, and microVM escape tests continuously.

## Production readiness blockers

Do not connect protected data or consequential authority until federated identity,
tenant RLS, WORM storage, KMS/HSM signing, executable sandboxing, egress policy,
secret brokerage, privacy review, audit export, DR, vulnerability management, and
independent penetration/escape testing are implemented and evidenced.
