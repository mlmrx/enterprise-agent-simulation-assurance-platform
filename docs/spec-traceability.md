# EASAP-PS-001 v1.0 traceability

Legend:

- **Implemented**: exercised by the runnable STANDARD reference and automated tests.
- **Reference-only**: contract/logic is implemented, but the local trust or scale
  boundary is not a production control.
- **Production gap**: architecture is specified; a production adapter or independent
  validation is still required.

## Acceptance conditions

| ID | Evidence in this repository | Status |
|---|---|---|
| EASAP-A01 | `runTrial`/`replayTrial`, sealed manifests, deterministic seed and trace-root equality tests | Implemented for deterministic STANDARD adapters |
| EASAP-A02 | Capability declarations, deny-by-default harness effects, denial observations/tests | Reference-only; arbitrary binaries require gVisor/Kata/Firecracker |
| EASAP-A03 | Campaign sample count, values/distribution, 95% CI, seed coverage, scenario strata | Implemented |
| EASAP-A04 | Hidden record flag, role-aware reads, opaque suite execution, developer denial tests | Reference-only; production suite vault/KMS required |
| EASAP-A05 | Component digest comparison and material-change invalidation/narrowing logic | Implemented |
| EASAP-A06 | Causal findings and failure-preserving event/payload minimization | Implemented for reference predicates |
| EASAP-A07 | Typed deployment restrictions inside conditional certificates and release-gate enforcement | Implemented |
| EASAP-A08 | Canonical content addresses, signed envelopes, mutation rejection tests, hash-chained evidence projection | Implemented; production uses asymmetric KMS/HSM keys |
| EASAP-A09 | Protected-field redaction, privacy review record, regression scenario derivation | Implemented with synthetic incidents; production ingestion/DLP workflow is a gap |
| EASAP-A10 | Revocation registry, certificate status endpoint, fail-closed gate evaluation | Implemented in-process; distributed 60-second SLO proof is a production gap |

## Functional MUST requirements

| Requirement | Implementation/design evidence | Status |
|---|---|---|
| Common state interface for discrete-event, state-machine, rules, and learned transitions | Scenario/runtime contracts; learned component metadata/fallback validation | Reference-only; learned transition adapter not trained here |
| Learned component declares training boundary, calibration, uncertainty, fallback | Scenario validation contract | Implemented validation; no production learned component |
| World snapshot, fork, merge-by-policy, reset | Immutable world/snapshot contracts and architecture port | Production gap beyond reference snapshots |
| Typed actors/resources/events/actions/invariants/observations/faults/stops | Scenario contract and validator | Implemented |
| Composed scenarios do not inherit undeclared privilege/data | Explicit capability union/validation rule | Implemented in reference compiler |
| Hidden suites conceal fixtures/oracles/seeds | Role-aware redaction and opaque suite handle design | Reference-only |
| Intercept time/random/network/credentials/tools/files/effects | Harness adapter and deny-by-default policy | Reference-only protocol sandbox |
| Unsupported effects fail closed; permitted effects use emulators/disposable dependencies | Capability denial and emulator contract | Implemented for supplied adapters |
| Capture causal event stream sufficient for reproduction | Ordered observations and trace root | Implemented |
| Required fault injector taxonomy | Reference procurement scenario covers representative faults; architecture enumerates full library | Partial; full production library gap |
| Required adversarial taxonomy | Prompt/tool injection and exfiltration reference cases; architecture enumerates full library | Partial; full production library gap |
| Bound campaign resources and contain artifacts | Resource limits and quarantined findings | Reference-only |
| Separate outcome, policy, evidence, cost, latency, robustness, calibration, recoverability, human burden | Result/measure contracts and statistics | Implemented contract; reference fixtures populate core dimensions |
| LLM judge version/rubric/calibration/disagreement/appeal | Judge contract described in architecture/OpenAPI | Production gap; reference uses deterministic oracles |
| Stochastic sample size/CI/distribution/seed coverage | Campaign summary and tests | Implemented |
| Minimization preserves predicate and records transformations | `minimizeFinding` and tests | Implemented |
| Decision evaluates suites/gates/gaps/waivers/residual risk/expiry/conditions | Assurance decision/certificate flow | Implemented for reference profile |
| Material component changes invalidate per profile rules | `assessMaterialChange` and invalidation | Implemented |
| Conditional approval emits machine-enforceable restrictions | Typed restrictions and release gate | Implemented |

## Security controls

| Threat | Reference evidence | Production completion requirement |
|---|---|---|
| Benchmark leakage | Hidden flag, redacted reads, role checks | Encrypted suite vault, execution-only keys, canary detection |
| Harness escape | Capability mediator, fail-closed effects | MicroVM/container boundary, seccomp, egress enforcement, disposable credentials |
| Result tampering | Content addressing, signatures, append chain, verifier | KMS/HSM issuer, WORM storage, independent verifier account |
| Oracle gaming | Independent deterministic oracle interface | Multiple hidden/metamorphic oracles and calibrated judge review |
| Synthetic-data disclosure | Synthetic fixtures and incident redaction | Provenance/DLP/membership testing and tenant-isolated fixture keys |
| False assurance | Envelope, gaps, expiry, invalidation, revocation | Online gate integration and verified propagation SLO |
| Adversarial artifact escape | Quarantined findings | Isolated storage, safe rendering, controlled export/DLP |

## Nonfunctional targets

| Target | Repository evidence | Status |
|---|---|---|
| Deterministic trace reproduction | Golden replay tests | Implemented for reference runtime |
| 100,000 concurrent STANDARD trials | Production partitioning/capacity design | Production gap; not claimed |
| 10 million results/campaign | Hierarchical aggregation design | Production gap; not claimed |
| STANDARD p95 <= 5 seconds | Local bounded demo | Production load test gap |
| HIGH-RISK p95 <= 30 seconds | Dedicated pre-warmed pool design | Production gap |
| 1 million captured events/s/cluster | Chunked event-bus/object-store design | Production load test gap |
| Sealed result RPO 0 | Acknowledge-after-durable design | Production replicated-storage proof gap |
| 99.9% control-plane availability | Multi-zone/SLO design | Production operational proof gap |
| No cross-tenant access | Tenant predicates and auth tests | Production RLS/network/cache adversarial proof gap |
| UI-independent portability | JSON contracts, OpenAPI, verifier functions | Implemented |

## Required production gates before a conformance claim

1. Independent review of manifest schemas, canonicalization, signing profile, and
   verifier interoperability.
2. Federated identity, tenant lifecycle, server-side role bindings, dual control, and
   database row-level security.
3. WORM evidence store, KMS/HSM signing, key rotation/recovery, and independent trust
   root.
4. Rootless/microVM execution isolation, default-deny network, secret broker, syscall
   mediation, and escape testing for every isolation class.
5. Full fault/adversary suite taxonomy, learned-world validation, calibrated judge
   workflow, and failure minimization at production trace scale.
6. Privacy/DLP/membership testing and approved production-incident ingestion.
7. Load tests at every normative concurrency/throughput/startup target with evidence
   durability enabled.
8. Multi-zone availability, RPO-0 boundary definition, backup/restore, regional DR,
   and revocation-propagation evidence.

Passing local tests demonstrates the reference contracts. It does not prove
real-world safety, eliminate human accountability, replace production monitoring,
or certify a model independently of its deployed configuration.
