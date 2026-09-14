---
title: "Why model evals miss the risks that decide an agent release"
description: "Model evaluation remains necessary, but enterprise agent releases also require evidence about tools, policy, memory, state, side effects, and operating conditions."
audience: "AI platform teams, product leaders, evaluation engineers, and release owners"
canonical_url: "[PUBLISHED ARTICLE URL]"
feature_media: "../assets/live-assurance-campaign.gif"
primary_cta: "https://easap.dev/platform"
---

# Why model evals miss the risks that decide an agent release

Model evaluation asks whether a model performs well on a defined distribution of inputs. Agent assurance asks whether a configured system should be trusted with a defined set of effects.

Those questions overlap, but they are not interchangeable.

A model may be accurate, helpful, and resistant to direct jailbreaks while the surrounding agent still fails because it uses stale state, calls the wrong tool, acts after permission is revoked, retries a non-idempotent transaction, leaks data from a tool response, or reports success after a timeout.

These failures live in the system around the model.

## The subject has changed

For an agent release, the evaluated subject should include at least:

- model and version;
- system and developer prompts;
- tool schemas and implementations;
- memory behavior and retained state;
- policy and approval logic;
- connectors and credential boundaries;
- runtime dependencies and retry semantics;
- the users, data, geography, scale, and actions in the operating envelope.

If a team tests the model but releases a changing combination of these components, the result cannot stay bound to the release candidate.

This is why content-addressed manifests matter. They turn “the agent” from a name into a reproducible set of inputs. When a material input changes, the decision can be invalidated or narrowed instead of silently carried forward.

## Effects require mediation

A language-model answer is an observation. A tool call can be an effect.

Once an agent can send email, issue a refund, modify a database, deploy code, or approve a workflow, the assurance system must observe the boundary before the effect occurs. A declared capability should specify the action, resource, data scope, user or service authority, approval conditions, and relevant limits.

Undeclared capabilities should fail closed. Denial should happen before the external action. The trace should record the request, policy decision, simulated or mediated result, and resulting agent behavior.

A test that grades only the final text can miss the most important fact: whether the system crossed the boundary it was supposed to respect.

## State changes the answer

Many agent failures are not single-prompt failures. They appear across a sequence:

1. the agent retrieves a record;
2. authorization changes;
3. a tool returns delayed or conflicting state;
4. the agent retries;
5. an effect is partially applied;
6. the agent reports success.

To investigate this, the test harness needs controllable time, seeded randomness, known world state, injected faults, and causal observations. Otherwise a failure may be impossible to reproduce—or a passing run may say little about the conditions that matter.

Determinism does not require pretending that a model is perfectly deterministic. It requires pinning and recording every controllable input, capturing model outputs as evidence, and making the rest of the system replayable enough to isolate causes.

## A score is not enough

Agent assurance has multiple dimensions that should not be compressed prematurely:

- task reliability;
- policy adherence;
- robustness under attack or fault;
- scenario and seed coverage;
- sample size and distribution;
- uncertainty;
- severity and reproducibility of findings;
- residual risk and release conditions.

An agent might complete 11 of 12 goals while producing one critical unauthorized effect. A scalar average can make that look good. A release gate should not.

The decision logic must preserve thresholds and blockers. If a critical policy finding exists, a high task-completion rate should not average it away. If the sample is small, the interval and limitation should remain visible. If a required suite did not run, the result should not appear complete.

## From result to decision

A useful agent assurance decision is one of three bounded postures:

- **APPROVED** — required suites and thresholds are satisfied, no blocking finding remains, and the named operating envelope is permitted;
- **CONDITIONAL** — release is permitted only under enforceable restrictions, named owners, and defined expiry;
- **REJECTED** — the candidate has a blocking gap or finding and should not receive the requested authority.

The posture should bind to the candidate digest, world, scenarios, profile, evidence, conditions, and expiry. It should have a revocation path. The organization should know which model, prompt, tool, policy, connector, memory, or runtime changes require re-evaluation.

This is not bureaucracy added after evaluation. It is the point at which evaluation becomes a release control.

## See the difference execute

The [EASAP live assurance workbench](https://easap.dev/platform) runs a synthetic procurement agent through a deterministic campaign. The flow seals the candidate and world, pins seeds, mediates external effects, injects faults and prompt/tool attacks, evaluates the resulting traces, reports statistical context, creates findings, and produces a bounded posture with evidence digests.

It is a reference campaign, not proof about another organization’s agent. Its value is that the complete evidence chain is inspectable and the source is open.

Keep your model evals. They remain important. But when the system gains tools, state, policy, and consequences, evaluate the agent that will actually receive the authority.

EASAP is a STANDARD reference implementation. Passing its synthetic campaign is not certification, universal safety evidence, or proof of production HIGH-RISK isolation.

