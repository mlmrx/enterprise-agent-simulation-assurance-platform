# EASAP positioning and messaging system

## Category

**Enterprise agent simulation and assurance infrastructure**

Avoid “control plane.” It is crowded language and obscures the product’s actual job. When a category explanation is needed, use:

> The evidence-backed boundary between an AI agent and the authority you give it.

## Core message

**Headline:** Know what your AI agent will do before you let it act.

**Tagline:** Evidence before authority.

**One-line description:** EASAP turns an agent’s real authority, data access, and operating conditions into executable tests, inspectable evidence, and a bounded release decision.

**25-word description:** EASAP helps teams assess, challenge, and release enterprise AI agents with explicit authority boundaries, deterministic simulation, and portable evidence.

**50-word description:** EASAP is open-source enterprise agent assurance infrastructure. Describe what an agent can access and do, generate a release-readiness plan, test an authorized public endpoint, run deterministic adversarial campaigns, and export the evidence behind a bounded ship decision—without moving the agent into a proprietary platform.

**100-word description:** AI agents do more than generate text: they read private data, call tools, change records, spend money, and represent organizations. EASAP gives engineering, security, governance, and release teams one evidence chain for deciding when that authority is justified. Teams can generate an immediate readiness plan, prove control of a public agent endpoint and run a bounded black-box baseline, execute a deterministic open-source reference campaign, inspect causal traces and findings, and export machine-readable evidence. EASAP is portable and Apache-2.0 licensed. It is a reference implementation and decision framework—not a certification or a promise that simulation proves universal safety.

## The problem

Enterprise agent releases are often decided from artifacts that do not match the authority being granted:

- model benchmarks measure a model, not the configured agent, tools, policy, memory, or runtime;
- red-team findings are hard to replay and easy to detach from the release candidate;
- governance reviews get prose and screenshots instead of inspectable evidence;
- product owners cannot see what conditions a pass actually covers;
- a material change can quietly invalidate yesterday’s approval.

The consequence is a false choice between blocking useful agents indefinitely and shipping on confidence that cannot be audited.

## The value proposition

EASAP converts **authority into a testable release contract**.

| Before EASAP | With EASAP | Business value |
|---|---|---|
| “This model scored well.” | “This exact agent candidate passed these scenarios under these conditions.” | A decision tied to the system being released |
| One-off red-team transcript | Replayable scenario, causal trace, digest, and owner | Faster remediation and durable regression coverage |
| Governance memo assembled by hand | Control map, approvals, retention, expiry, and machine-readable gate | Review that is faster and easier to defend |
| Broad “safe/unsafe” claim | APPROVED, CONDITIONAL, or REJECTED inside a named envelope | Honest release authority and clearer accountability |
| Platform lock-in | Open source, JSON evidence, local or preferred hosting | Control of data, deployment, and assurance history |

## What people can use immediately

### 1. Agent Release Readiness Planner

URL: https://easap.dev/assess

Input: authority, data classes, autonomy, users, exposure, deployment stage, and safeguards.

Output: inherent-risk tier, open controls, critical blockers, minimum scenarios, accountable owners, approvals, and a machine-readable release-gate policy.

Best first action for: product, governance, engineering, security, and release leaders.

### 2. Verified public-agent baseline

URL: https://easap.dev/connect

Input: an authorized public HTTPS JSON endpoint and proof that the user controls it.

Output: four bounded observations covering reachability, instruction override, false-action resistance, and sensitive-data refusal, plus response excerpts, hashes, latency, findings, limitations, and downloadable JSON.

Best first action for: AI engineering, application security, red teams, and agent vendors.

### 3. Executable assurance workbench

URL: https://easap.dev/platform

Input: a trial matrix for the seeded synthetic procurement reference agent.

Output: live mediated trials, attack and fault observations, statistical measures, findings, evidence digests, and a release posture.

Best first action for: technical evaluators who want to inspect how the evidence chain works before integration.

### 4. Function-specific operating guides

URL: https://easap.dev/guides

Output: a concrete workflow, checklist, deliverables, and handoff for AI engineering, security/red team, risk/governance, and product/release functions.

## Who it is for

### AI platform and engineering

Job: freeze the candidate, declare capabilities, mediate effects, and run regression gates.

Proof they need: candidate manifest, scenario adapter, replay path, and machine-readable gate.

### Security and red team

Job: turn prompt injection, exfiltration, approval bypass, stale state, and revocation failures into repeatable release blockers.

Proof they need: causal traces, minimized findings, response evidence, owners, and regression scenarios.

### Risk, governance, compliance, and audit

Job: define what evidence is required, who approves, how long it remains valid, and what change revokes it.

Proof they need: risk classification, control register, approval matrix, retention, expiry, and evidence lineage.

### Product and release authority

Job: make a bounded ship decision with enforceable conditions and a live stop path.

Proof they need: APPROVED/CONDITIONAL/REJECTED posture, residual risk, conditions, rollback triggers, and candidate identity.

## Companies that benefit

The best-fit organization has at least one agent that can affect something more consequential than a draft response.

- financial services: underwriting assistance, fraud operations, payments, customer servicing, research, and trade operations;
- healthcare and life sciences: patient navigation, clinical operations, benefits, prior authorization, and regulated document workflows;
- software and cloud: coding agents, support agents, incident response, infrastructure change, and admin automation;
- retail, logistics, and manufacturing: procurement, inventory, supplier communication, routing, maintenance, and operational planning;
- professional services: research, case or engagement workflows, document handling, and client-facing automation;
- public sector and education: citizen or student services, eligibility workflows, records, and high-accountability decisions;
- agent vendors and consultancies: portable proof for customer evaluations and repeatable acceptance testing.

Strong qualification signals include tool use, private or regulated data, consequential external communication, money movement, record mutation, cross-system workflows, high user scale, or a formal release authority.

## Differentiation

EASAP is not another prompt playground, benchmark leaderboard, policy document repository, or generic observability dashboard.

Its differentiated unit is the **bounded decision backed by portable evidence**:

1. identify the exact candidate;
2. define the world, authority, and operating envelope;
3. execute seeded scenarios through mediated capabilities;
4. preserve causal traces, measures, findings, and digests;
5. decide with explicit conditions and expiry;
6. invalidate or narrow the decision when the candidate materially changes.

## Proof hierarchy

Use the strongest accurate language available:

1. **Runtime proof:** a request was executed and the returned evidence is inspectable.
2. **Measured evidence:** a stated measure is backed by sample size, distribution, uncertainty, and seed coverage.
3. **Configured control:** the repository or deployment declares a control; runtime enforcement must still be verified.
4. **Source capability:** code exists and has tests; this is not evidence about an arbitrary production deployment.
5. **Planned capability:** roadmap only; never phrase as shipped.

## Claims to use

- “Generate an actionable assurance plan without an account.”
- “Test an authorized public HTTPS agent endpoint without sending API keys to EASAP.”
- “Run a live deterministic reference campaign and inspect its evidence.”
- “Export JSON and Markdown artifacts.”
- “Self-host the Apache-2.0 reference implementation.”
- “Bind a decision to the tested candidate, scenarios, conditions, and expiry.”

## Claims to avoid

- “certifies your agent”;
- “proves your agent is safe”;
- “guarantees compliance”;
- “production-grade HIGH-RISK isolation” for the current reference worker;
- “tests any agent” without stating the hosted connector boundary;
- “real-time monitoring” unless a continuous runtime integration is actually configured;
- customer or partner claims without permission;
- performance or risk-reduction percentages not backed by measured data.

## Objection reframes

**“We already run model evals.”** Model evals are useful inputs. EASAP asks a different question: whether the exact configured agent, with its tools, policy, data, memory, and runtime, has earned a defined operating authority.

**“We already have observability.”** Observability explains what happened in operation. EASAP creates a pre-release challenge and evidence contract, with deterministic replay and a bounded decision. The two systems should complement each other.

**“We cannot send our agent or data to a vendor.”** Start with the planner and reference campaign, then self-host the open connector and engine inside the enterprise boundary. EASAP’s artifact formats are designed to remain portable.

**“A simulation cannot prove safety.”** Correct. EASAP explicitly avoids that claim. It provides scoped evidence about a tested candidate and operating envelope, with limitations, expiry, and material-change rules.

## CTA ladder

| Intent | CTA | Destination |
|---|---|---|
| Curious | See how the evidence chain works | `/what-is-easap` |
| Problem-aware | Generate an assurance plan | `/assess` |
| Has public agent | Test an authorized endpoint | `/connect` |
| Technical evaluator | Run the live campaign | `/platform` |
| Builder | Audit and self-host | GitHub repository |
| Enterprise buyer | Bring one bounded workflow | `[CONTACT EMAIL]` |

