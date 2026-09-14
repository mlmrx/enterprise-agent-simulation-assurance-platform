# EASAP cross-platform launch copy

Replace bracketed fields before publishing. Keep the first link aligned with the audience: planner for cross-functional buyers, connector for teams with a public agent, workbench for technical evaluators, GitHub for builders.

## Product Hunt

### Listing fields

**Name:** EASAP

**Tagline:** Know what your AI agent will do before you let it act

**Description:** Turn an agent’s authority into an actionable assurance plan, test an authorized public endpoint, run deterministic adversarial campaigns, and export the evidence behind a bounded release decision. Open source and self-hostable.

**Suggested topics:** Artificial Intelligence, Developer Tools, Security, Open Source

**Pricing:** Free

**Primary URL:** https://easap.dev

**Thumbnail:** `assets/easap-thumbnail-240.gif` or a static 240×240 logo if the animation distracts.

### Gallery order and captions

1. `easap-launch-hero.gif` — **Evidence before authority.** See the three working paths from agent description to inspectable release evidence.
2. `readiness-planner.gif` — **Generate the release work.** Risk tier, open controls, scenarios, owners, approvals, and policy from one agent description.
3. `public-agent-connector.gif` — **Test a public agent you control.** EASAP requires an ownership challenge before bounded prompts are sent.
4. `live-assurance-campaign.gif` — **Watch the evidence chain execute.** Seeded trials, mediated effects, findings, uncertainty, and a bounded posture.
5. `role-guides.gif` — **One system, different jobs.** Concrete workflows for engineering, security, governance, and release teams.

### First maker comment

Hi Product Hunt — I built EASAP because enterprise agents are getting authority faster than teams are getting trustworthy release evidence.

An agent is not just a model. It is the model plus prompts, tools, memory, policy, connectors, runtime, data, and operating conditions. Yet release reviews are still often based on a benchmark score, a red-team transcript, and a long meeting.

EASAP turns that authority into a testable release contract. Today you can:

- generate a no-account readiness plan with control gaps, scenarios, owners, approvals, and a machine-readable gate;
- register an authorized public HTTPS JSON endpoint, prove control with a short-lived file challenge, and run a bounded black-box baseline without giving EASAP an API key;
- run a live deterministic reference campaign and inspect the measures, findings, evidence digests, and release posture;
- self-host the Apache-2.0 implementation on your preferred infrastructure.

I also want to be precise about the boundary. EASAP is not a certification body and a passing simulation is not proof of universal safety. The current system is a STANDARD reference implementation; its production gaps are public.

I would value feedback on one question: what is the first agent workflow for which your existing release process cannot produce evidence you would be comfortable defending?

Try the planner: https://easap.dev/assess

Source: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

## Hacker News

### Submission

**Title:** Show HN: EASAP – open-source simulation and release evidence for enterprise AI agents

**URL:** https://easap.dev/platform

### First comment

I built EASAP to explore a specific gap in agent engineering: we often evaluate a base model, but release authority is granted to a configured system with prompts, tools, memory, policy, connectors, data access, and runtime behavior.

The repository is an Apache-2.0 STANDARD reference implementation of an assurance chain:

1. content-addressed subject, world, scenario, and profile manifests;
2. seeded deterministic trials with virtual time and mediated capabilities;
3. injected faults and adversarial inputs;
4. causal traces, oracle evaluation, findings, and statistical context;
5. signed evidence and an APPROVED, CONDITIONAL, or REJECTED posture bound to the tested envelope;
6. material-change invalidation, expiry, and revocation.

There are three things you can try without an account:

- readiness planner: https://easap.dev/assess
- verified public-agent connector: https://easap.dev/connect
- executable reference campaign: https://easap.dev/platform

The connector intentionally has a narrow hosted boundary. It accepts only authorized, unauthenticated public HTTPS JSON endpoints; rejects IP literals, private/reserved destinations, credentials, redirects, and arbitrary headers; and requires an exact short-lived ownership challenge before four read-only probes run. Private/authenticated agents should self-host it.

The main limitation: this is a working reference implementation, not a claim of production HIGH-RISK isolation or universal agent safety. The architecture and production gaps are explicit in the repo.

Code: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

I would especially appreciate critique of the evidence model, candidate invalidation rules, and the line between black-box endpoint tests and full-system assurance.

## LinkedIn

### Founder launch post

AI agents are being given authority faster than organizations are building evidence for that authority.

They read private data. Call tools. Change records. Spend money. Communicate as the company.

But too many release decisions still come down to a model benchmark, a red-team transcript, and a meeting where every function is holding a different artifact.

Today I’m launching EASAP: the Enterprise Agent Simulation and Assurance Platform.

EASAP helps teams answer a more useful question:

**Has this exact agent earned this exact authority under conditions we can inspect?**

The working platform lets you:

→ generate an agent release-readiness plan with control gaps, scenarios, owners, approvals, and a machine-readable gate;

→ prove control of an authorized public endpoint and run a bounded black-box baseline without handing EASAP an API key;

→ execute a deterministic reference campaign and inspect the evidence behind its release posture;

→ self-host the Apache-2.0 system locally or on your preferred infrastructure.

This is not a certification and it is not a promise that simulation proves universal safety. Decisions remain bound to the candidate, scenarios, operating envelope, conditions, and expiry.

Try the planner: https://easap.dev/assess

Run the workbench: https://easap.dev/platform

Audit the source: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

If your team is releasing a consequential agent, what evidence does the final approver actually see today?

#AIAgents #AISecurity #AIGovernance #OpenSource

### Company-page post

**Evidence before authority.**

EASAP is now public: open-source infrastructure for assessing, challenging, and releasing enterprise AI agents with inspectable evidence.

Start where you are:

- Planning an agent? Generate the control map and scenario pack at https://easap.dev/assess
- Operating a public agent? Verify ownership and run the bounded baseline at https://easap.dev/connect
- Evaluating the architecture? Execute the live reference campaign at https://easap.dev/platform
- Need to keep the system private? Self-host from https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

EASAP is a STANDARD reference implementation, not a certification or universal safety guarantee. The evidence tells you what was tested, what happened, where the result applies, and when it should expire.

### Technical follow-up post

What changes when you evaluate an **agent system** instead of a model?

The subject becomes:

model + prompts + tools + memory + policy + connectors + runtime.

The evaluation must then answer more than “was the response correct?”

- Was the requested effect declared and authorized?
- Did denial occur before the side effect?
- Can the failure be replayed with the same state, seed, and virtual time?
- Is the finding attached to the exact candidate that produced it?
- Does the decision expose sample size, uncertainty, conditions, and expiry?
- Which material change invalidates the result?

That is the evidence chain EASAP’s open reference system executes.

Try it: https://easap.dev/platform

Read the architecture: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform/blob/main/docs/architecture.md

## X

### Launch thread

**1/8**

AI agents are getting authority faster than teams are getting evidence.

Today I’m launching EASAP—open-source infrastructure to assess, challenge, and release enterprise agents with a bounded, inspectable decision.

Evidence before authority. https://easap.dev

**2/8**

The unit of evaluation is not the base model.

It is the configured agent:
model + prompts + tools + memory + policy + connectors + runtime + operating conditions.

**3/8**

Start with the free readiness planner.

Describe the agent’s authority, data, autonomy, users, and safeguards. Get control gaps, critical blockers, scenarios, owners, approvals, and a machine-readable release gate.

https://easap.dev/assess

**4/8**

Already have a public agent endpoint?

Prove you control it with a short-lived file challenge, then run four bounded read-only probes. The hosted connector accepts no API keys, cookies, or arbitrary headers.

https://easap.dev/connect

**5/8**

Want the full evidence chain?

Run seeded deterministic trials against a synthetic procurement agent. Inspect mediated effects, fault and attack findings, uncertainty, digests, and the release posture.

https://easap.dev/platform

**6/8**

The important boundary:

A pass is not universal safety. EASAP is not a certification body. A decision applies to the exact candidate, scenario pack, operating envelope, conditions, and expiry.

**7/8**

EASAP is Apache-2.0 and portable.

Run locally, with Docker, on Kubernetes, or adapt the domain contracts to your infrastructure. Keep authenticated and private agents inside your own boundary.

https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

**8/8**

If you release agents, I want your hardest question:

What evidence would your engineering, security, governance, and product owners all trust enough to make the same ship decision?

### Single-post variants

**Utility:** Describe an enterprise agent. Get its risk tier, open controls, minimum scenarios, accountable owners, approvals, and a machine-readable release gate. No account. No invented “safety score.” https://easap.dev/assess

**Connector:** Test a public agent you are authorized to assess—without giving EASAP its API key. Ownership challenge first; four bounded read-only probes second; portable evidence at the end. https://easap.dev/connect

**Technical:** A model eval is not an agent release decision. EASAP binds seeded trials, mediated effects, traces, findings, uncertainty, and signed evidence to the exact candidate and operating envelope. Run it: https://easap.dev/platform

**Open source:** EASAP is Apache-2.0 enterprise agent simulation and assurance infrastructure. Run locally or on your preferred host; keep private agents and data inside your boundary. Source: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

## Reddit

Choose only a community where the submission is on-topic and permitted. Disclose that you built EASAP. Do not cross-post the same promotional text or ask for votes.

### Technical communities

**Title:** I built an open-source reference system for testing the configured AI agent—not just its model

**Body:**

I built EASAP, an Apache-2.0 reference implementation for enterprise agent simulation and assurance.

The problem I’m trying to solve is the gap between model evaluation and agent release authority. A deployed agent includes prompts, tools, memory, policy, connectors, runtime, and operating conditions. A model score alone does not tell a release owner whether that configured system should be allowed to change records, access private data, communicate externally, or execute transactions.

The current implementation supports content-addressed manifests, deterministic seeded trials, virtual time, fail-closed capability mediation, fault/adversarial injection, causal traces, findings, statistical context, signed evidence, bounded release decisions, and material-change invalidation.

There is a live synthetic campaign at https://easap.dev/platform and the code is at https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform.

There is also a deliberately narrow public endpoint connector. It requires file-based ownership proof, rejects private/reserved destinations and credentials, and only runs fixed read-only prompts. Private/authenticated agents should self-host it.

This is not a certification or a claim that simulation proves universal safety. I would value criticism of the evidence schema and what you would need to integrate this into an actual release pipeline.

### Governance and risk communities

**Title:** What artifact should an AI agent release authority actually approve?

**Body:**

I’m the builder of EASAP, an open-source project exploring a practical governance problem: the final agent launch decision is often made from artifacts that do not describe the same system or decision boundary.

I built a no-account readiness planner that turns an agent’s authority, data access, autonomy, exposure, and existing safeguards into separate outputs: inherent-risk classification, open controls, critical blockers, scenario requirements, owners, approvals, retention, and a machine-readable gate.

You can try it at https://easap.dev/assess.

The planner is not a certification or legal conclusion. It creates assignable work and an explicit review boundary. I would appreciate feedback from people who own model risk, privacy, compliance, internal audit, or release governance: which required evidence is missing, and which output would actually help your review?

## Dev.to / Hashnode

### Launch note

**Title:** I built an open-source evidence chain for enterprise AI agent releases

**Subtitle:** Why the configured agent—not only its model—needs deterministic tests, mediated effects, and a bounded decision.

**Opening:**

The moment an AI system can call a tool, update a record, reveal private data, or communicate as an organization, “the model tested well” stops being a sufficient release argument. The unit being released is now an agent system. EASAP is my open-source attempt to make the evidence for that system inspectable, replayable, and portable.

Use `articles/01-evidence-before-authority.md` as the complete body.

**Tags:** ai, opensource, security, devtools

**Canonical URL:** `[PUBLISHED ARTICLE URL]`

## GitHub release

### Title

**EASAP public launch — evidence before authority**

### Release notes

EASAP is now available as a working Apache-2.0 STANDARD reference implementation and public utility for enterprise agent simulation and assurance.

### Try it now

- Generate an agent release-readiness plan: https://easap.dev/assess
- Verify and baseline an authorized public agent: https://easap.dev/connect
- Execute the live deterministic campaign: https://easap.dev/platform
- Follow a function-specific guide: https://easap.dev/guides

### What the reference system includes

- immutable, content-addressed candidate, world, scenario, profile, and result records;
- deterministic seeded trials, virtual time, capability mediation, and exact replay;
- fault and adversarial injection with causal observations and minimized findings;
- sample count, outcome distribution, confidence interval, and seed coverage;
- signed evidence envelopes and bounded APPROVED, CONDITIONAL, or REJECTED decisions;
- expiry, revocation, material-change invalidation, and release-gate verification;
- portable Node, Docker Compose, and Kubernetes deployment paths;
- a verified public-endpoint connector with SSRF controls and no credential intake.

### Boundary

This release is not a certification or a claim of universal agent safety. It is a STANDARD reference implementation. The local worker and reference signing path do not provide the isolation, trust root, or scale expected of every HIGH-RISK production deployment. Review `docs/security.md`, `docs/deployment.md`, and `docs/spec-traceability.md` before using it with real systems or data.

## Launch email

### Subject options

- Evidence before authority: EASAP is live
- A working release-readiness system for enterprise AI agents
- Is your agent ready to act? Generate the evidence plan

### Email

Hi [FIRST NAME],

AI agents are beginning to read private data, call tools, change records, and represent organizations. The evidence used to release them has not kept pace with that authority.

I built EASAP to make that release decision concrete.

You can use it today to:

- generate an agent’s risk tier, open controls, scenario pack, owners, approvals, and machine-readable release gate;
- test an authorized public HTTPS agent endpoint after proving control, without sharing an API key;
- run a deterministic reference campaign and inspect the evidence behind its release posture;
- self-host the Apache-2.0 implementation on your preferred infrastructure.

Start with the readiness planner: https://easap.dev/assess

Or inspect the source: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

EASAP is not a certification or a universal safety guarantee. It is a way to make the tested candidate, scenarios, findings, conditions, and limitations inspectable.

If you are working on a consequential agent, reply with the one workflow whose release evidence is hardest to defend. I’m selecting a small number of bounded workflows for design reviews.

[FOUNDER NAME]

### T+3 follow-up

Subject: The most useful first step is not an integration

Hi [FIRST NAME],

You do not need to connect a production agent to find value in EASAP.

The readiness planner turns a short description of authority, data, autonomy, exposure, and safeguards into the work four teams need: engineering boundaries, security scenarios, governance controls, and a release gate.

It takes a few minutes and requires no account: https://easap.dev/assess

If the output misses a control or scenario your organization requires, reply with it. That feedback is more valuable than a generic product reaction.

[FOUNDER NAME]

## Slack / Teams community post

I’ve launched EASAP, an open-source system for turning enterprise-agent authority into executable tests and inspectable release evidence.

The fastest way to evaluate it is the no-account readiness planner: https://easap.dev/assess

There is also an ownership-verified public-agent baseline at https://easap.dev/connect and a live deterministic reference campaign at https://easap.dev/platform.

It is a STANDARD reference implementation—not a certification or a universal safety claim—and can be self-hosted from https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform.

I’d welcome one concrete critique: what evidence is missing from the artifact your team would use to approve an agent release?

## YouTube / demo page

**Title:** EASAP in 90 seconds: evidence before authority for enterprise AI agents

**Description:**

EASAP helps engineering, security, governance, and product teams turn an AI agent’s authority into an actionable assurance plan, bounded tests, portable evidence, and a release decision.

Try the readiness planner: https://easap.dev/assess

Test an authorized public agent: https://easap.dev/connect

Run the live reference campaign: https://easap.dev/platform

Source and self-hosting: https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

EASAP is an Apache-2.0 STANDARD reference implementation. It is not a certification, universal safety guarantee, or claim of production HIGH-RISK isolation.

**Chapters:**

- 00:00 Why agent authority needs evidence
- 00:10 Generate the readiness plan
- 00:30 Verify a public agent boundary
- 00:51 Run the assurance campaign
- 01:16 Boundaries and self-hosting

## Alt text library

- **Readiness planner:** “EASAP Agent Release Readiness Planner showing high-risk classification, open control gaps, required scenarios, approvals, and export actions.”
- **Connector:** “EASAP verified public-agent connector showing a short-lived ownership challenge required before bounded testing.”
- **Campaign:** “EASAP live assurance workbench showing completed seeded trials, findings, uncertainty interval, and verified evidence digest.”
- **Role guides:** “EASAP guide hub with separate operating paths for AI engineering, security and red team, risk and governance, and product and release.”
- **Hero:** “Animated sequence of EASAP’s readiness planner, verified public-agent connector, and executable assurance campaign.”

## Platform implementation notes

- Product Hunt currently recommends a square 240×240 thumbnail under 3 MB and 1270×760 gallery images; it discourages strobing, quick cuts, and unreadable GIF text.
- X currently accepts looping GIFs up to 15 MB on the web and 5 MB on mobile. Keep the shared GIF under 5 MB for portability.
- LinkedIn may convert animated GIFs to static images. Publish the included MP4 variant or a carousel there.
- A Show HN must be something people can try, ideally without signup. Link the runnable workbench or planner, and have the maker present to discuss it.
- Recheck each platform’s current requirements immediately before upload.

Official references:

- Product Hunt posting guide: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- X media guide: https://help.x.com/en/using-x/posting-gifs-and-pictures
- LinkedIn media guidance: https://business.linkedin.com/content/dam/me/business/en-us/marketing-solutions/resources/pdfs/lms-admin-getting-started-guide.pdf
- Show HN guidelines: https://news.ycombinator.com/showhn.html

