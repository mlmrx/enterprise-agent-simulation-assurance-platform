---
title: "The enterprise AI agent release-readiness checklist"
description: "A practical cross-functional checklist for authority, candidate identity, controls, scenarios, evidence, approval, deployment conditions, and revocation."
audience: "Product, release management, AI governance, security, and engineering"
canonical_url: "[PUBLISHED ARTICLE URL]"
feature_media: "../assets/readiness-planner.gif"
primary_cta: "https://easap.dev/assess"
---

# The enterprise AI agent release-readiness checklist

An agent release review should not begin with “is the model good enough?” It should begin with “what authority are we about to grant, to which exact system, under which enforceable conditions?”

Use this checklist before a pilot, production launch, material change, or expansion of authority. A checked box should point to evidence—not only a statement in a meeting.

## 1. Authority and consequences

- [ ] We have named every action the agent can take, not only the tools it can call.
- [ ] Each action has a resource, data scope, user or service authority, and relevant limit.
- [ ] We have identified the most expensive, harmful, or difficult-to-reverse effect.
- [ ] We know whether the agent drafts, recommends, executes with approval, or executes autonomously.
- [ ] We have documented who can use the agent and who is affected by its decisions.
- [ ] We have named prohibited actions that must fail closed.

Why it matters: scenario priority and release authority should follow consequences. A drafting assistant and an autonomous payment agent should not inherit the same evidence profile.

## 2. Data and exposure

- [ ] Data classes are explicit: public, internal, confidential, personal, regulated, credential, payment, or equivalent organization-specific categories.
- [ ] Retrieval, memory, logs, traces, and exported evidence have separate handling rules.
- [ ] Geographic, tenant, and customer boundaries are documented.
- [ ] Internet exposure and third-party integrations are known.
- [ ] Test data is synthetic or otherwise approved for the test environment.
- [ ] Redaction preserves the causal value of findings without copying protected values.

Why it matters: the same behavior has different risk when the agent can access secrets, identity records, health information, or financial data.

## 3. Candidate identity

- [ ] The release candidate binds the model and version.
- [ ] System and developer prompts are versioned.
- [ ] Tool schemas and implementations are identified.
- [ ] Memory behavior and retained state are included.
- [ ] Policy, connector, and runtime dependencies are identified.
- [ ] The tested candidate and the release candidate have the same digest or an explained, reviewed difference.

Why it matters: evidence cannot support a release if the subject changes underneath it.

## 4. Control enforcement

- [ ] Undeclared capabilities fail closed.
- [ ] Authorization is checked at the effect boundary, not only when the session begins.
- [ ] Approval is tied to the exact action, inputs, and expiry.
- [ ] Denial occurs before a side effect.
- [ ] Retries and timeouts do not duplicate non-idempotent actions.
- [ ] Revocation reaches active sessions, memory, tokens, and queued work.
- [ ] A kill switch and rollback owner are available during operation.

Why it matters: a written rule is not a control until the runtime can enforce it and the evidence can show that it did.

## 5. Scenario coverage

- [ ] Happy-path goal completion is tested.
- [ ] Direct and indirect prompt injection are tested where applicable.
- [ ] Stale, missing, conflicting, and poisoned data are tested.
- [ ] Permission loss and approval revocation are tested mid-workflow.
- [ ] Tool timeout, partial failure, duplicate delivery, and malformed response cases are tested.
- [ ] Data exfiltration and cross-tenant boundary attempts are tested.
- [ ] Budget, rate, and resource exhaustion are tested.
- [ ] Incidents and known failures have privacy-safe regression cases.

Why it matters: agent failures often emerge from state and sequence, not from one prompt.

## 6. Evidence quality

- [ ] World state, virtual time, seeds, and controllable inputs are pinned or recorded.
- [ ] Tool requests, policy decisions, results, and side effects form a causal trace.
- [ ] Findings have minimized reproducers and accountable owners.
- [ ] Measures expose sample size and outcome distribution.
- [ ] Uncertainty and seed coverage are visible.
- [ ] Evidence is bound to the candidate and scenario digests.
- [ ] Limitations and missing suites are explicit.
- [ ] An independent verifier or equivalent integrity check can inspect the artifact.

Why it matters: a score without lineage, coverage, or limitations cannot carry a high-consequence decision.

## 7. Decision and approval

- [ ] The decision is APPROVED, CONDITIONAL, or REJECTED—not a vague “looks good.”
- [ ] Required approvers match the risk and authority profile.
- [ ] Author and approver separation exists where required.
- [ ] Critical findings block release or reduce authority.
- [ ] Every condition is technically enforceable and observable.
- [ ] Residual risk is stated in terms the accountable owner understands.
- [ ] The decision names the exact operating envelope.

Why it matters: an assurance campaign creates evidence; an accountable release process decides what authority that evidence can justify.

## 8. Expiry, change, and revocation

- [ ] The decision has an expiry.
- [ ] Material changes to model, prompts, tools, policy, memory, connectors, or runtime trigger the appropriate re-test.
- [ ] Incident and telemetry signals can trigger review or revocation.
- [ ] Operators can check the current decision status at the release gate.
- [ ] A revoked or expired decision fails closed.
- [ ] Rollback, containment, and stakeholder notification paths are tested.

Why it matters: agent assurance is not a one-time ceremony. Authority must remain connected to current evidence.

## Turn the checklist into work

A checklist is useful for review. A generated plan is more useful for execution.

The [EASAP Agent Release Readiness Planner](https://easap.dev/assess) asks for the agent’s authority, data, autonomy, exposure, stage, and existing safeguards. It returns an inherent-risk tier, open control map, critical blockers, minimum scenario pack, named owners, approval requirements, and a machine-readable release-gate policy.

Start with one real agent. Declare only controls that exist. Export the plan. Assign the gaps. Then design the campaign against the exact candidate.

The planner creates a deterministic readiness artifact. It does not prove implementation, certify the agent, provide legal advice, or replace the execution of the required scenarios.

