# EASAP demo, FAQ, and sales enablement

## 90-second launch demo

**0:00–0:10 — The consequence**

“Agents now read private data, call tools, update systems, and speak for companies. A model score does not tell you whether that authority should be released.”

Show: `https://easap.dev`

**0:10–0:30 — Immediate utility**

“Start with the agent you are actually planning. Describe its autonomy, data, users, and effects. EASAP returns its inherent-risk tier, the controls still missing, the scenarios you must run, accountable owners, approvals, and a machine-readable release gate.”

Show: `/assess`, generate the plan, then open Controls and Policy.

**0:30–0:51 — Bring your own public agent**

“If your agent already exposes an authorized public HTTPS JSON endpoint, register it without giving EASAP a key. Prove control with a short-lived file challenge. Then run four bounded, read-only baseline prompts and export exactly what the endpoint returned.”

Show: `/connect`, form, attestations, ownership challenge. Do not imply the challenge has been verified unless it has.

**0:51–1:16 — Inspect the evidence chain**

“For full-system assurance, run the open reference campaign. The harness seals the candidate and world, pins seeds, mediates effects, injects faults and attacks, evaluates the traces, estimates uncertainty, and signs the resulting decision evidence.”

Show: `/platform`, run 12 seeds, point to posture, findings, interval, and digest.

**1:16–1:30 — Boundary and call to action**

“A pass is not universal safety and EASAP is not a certification body. A decision applies only to the exact candidate, scenarios, conditions, and expiry. Try the planner now, or self-host the Apache-2.0 system from GitHub. Evidence before authority.”

## Five-minute technical demo

### 1. Frame the unit of evaluation — 40 seconds

Open `/what-is-easap`. Explain that the subject is not a base model. It is the model plus prompts, tools, memory, policy, connectors, and runtime configuration. Explain the bounded decision envelope.

### 2. Generate the work — 75 seconds

Open `/assess`.

- Use a representative agent name.
- Choose consequential capabilities such as record mutation or external communication.
- Choose the real data classes and exposure.
- Declare only controls actually implemented.
- Generate the plan.
- Show Overview, Controls, Scenarios, Owners, and Policy.
- Download Markdown or JSON.

Key line: “The planner does not certify the agent; it creates assignable release work.”

### 3. Demonstrate boundary verification — 65 seconds

Open `/connect`.

- Explain public HTTPS and the supported JSON contracts.
- Enter an authorized test endpoint.
- Check both attestations.
- Create the ownership challenge.
- Explain that EASAP will not send probe prompts until the exact short-lived value is available at `/.well-known/easap-verification.txt`.
- If a prepared endpoint is owned and verified, run the four-check baseline and download the evidence. Otherwise stop at the challenge and say why.

Key line: “No bearer token, cookie, or API key is accepted by this hosted connector.”

### 4. Run a complete reference campaign — 90 seconds

Open `/platform`.

- Point out sealed subject, world, scenario, and profile manifests.
- Select 12 seeds and run the campaign.
- Narrate the five execution phases.
- Inspect release posture, outcomes, findings, 95% interval, elapsed time, and evidence digest.
- Download the JSON.

Key line: “The UI does not replace failure with a successful canned result.”

### 5. Show portability and the enterprise path — 50 seconds

Open GitHub and `/guides`.

- Show Apache-2.0 source, deployment docs, OpenAPI, tests, and traceability.
- Explain that private or authenticated agents should use a self-hosted connector inside their network boundary.
- Choose the guide matching the audience in the room.

### 6. Close — 20 seconds

“Pick one bounded agent workflow. We will define its authority, required evidence, release conditions, and stop path. The goal is not a safety slogan; it is a decision your engineering, security, governance, and product owners can inspect together.”

## Demo preparation

- Keep a local build ready in case the hosted site is unavailable.
- Never demo a third party’s endpoint without explicit authorization.
- Use synthetic data.
- Pre-open the four product tabs.
- Record the current tested commit SHA.
- Keep downloaded JSON visible for the evidence discussion.
- If a run fails, show the failure honestly; the absence of a fabricated fallback is itself part of the design.

## FAQ

### What is EASAP?

EASAP is open-source infrastructure and a decision framework for enterprise agent simulation and assurance. It helps teams define an agent’s authority, execute relevant scenarios, preserve evidence, and make a bounded release decision.

### What can I do without integrating anything?

Use the Agent Release Readiness Planner. In a few minutes it generates a risk classification, control gaps, scenarios, owners, approvals, and a machine-readable release gate. No account is required.

### Can EASAP test my existing agent?

The hosted connector can test an authorized, unauthenticated public HTTPS JSON endpoint after file-based ownership verification. It supports OpenAI-compatible chat JSON and a generic JSON message webhook. Private, authenticated, or browser-only agents require the connector to be self-hosted inside your environment.

### Does EASAP store my API key?

The hosted public connector does not accept arbitrary headers, bearer tokens, cookies, or API keys. A self-hosted enterprise integration remains under the operator’s data and credential controls.

### Is this a certification?

No. EASAP creates scoped assurance evidence and a bounded decision. It does not certify universal safety, legal compliance, or fitness outside the tested candidate and operating envelope.

### How is this different from model evals?

Model evals characterize model behavior. EASAP binds evidence to the configured agent system: model, prompts, tools, memory, policy, connectors, runtime, scenarios, and release conditions.

### How is this different from red teaming?

Red teaming discovers failures. EASAP gives those failures a durable path into minimized scenarios, deterministic replay, evidence, owners, and release gates. It can incorporate red-team work rather than replace it.

### How is this different from observability?

Observability records production behavior. EASAP focuses on pre-release and change-triggered assurance with controlled scenarios and explicit decision criteria. Production telemetry can later trigger re-evaluation or revocation.

### Can simulation prove an agent is safe?

No. Simulation provides evidence within a declared test envelope. EASAP keeps sample size, uncertainty, seed coverage, limitations, expiry, and material-change invalidation visible so teams do not mistake evidence for a universal guarantee.

### Is the reference engine production-ready for high-risk workloads?

It is a working STANDARD reference implementation. It does not claim the microVM isolation, hardware-backed signing, scale, or regional throughput expected of a fully conformant HIGH-RISK deployment. The repository documents the production adapter boundaries.

### Can we run it locally or on our preferred host?

Yes. The repository includes local Node, Docker Compose, and Kubernetes reference paths. The domain contracts and evidence formats are portable. Deployment owners remain responsible for production identity, isolation, durable storage, signing, policy, and telemetry controls.

### Who should own EASAP?

No single team should own the decision alone. Engineering owns the candidate and integration boundary; security owns adversarial coverage and findings; governance owns evidence and approval requirements; product or release authority owns the bounded ship decision.

### Where should a company start?

Choose one consequential but bounded workflow. Run the planner, close critical control gaps, define an acceptance scenario pack, and then decide whether the public connector or a self-hosted campaign is appropriate.

## Enterprise discovery prompts

- What can this agent read, change, send, approve, buy, or operate?
- Which action would be most expensive to reverse?
- What evidence is currently shown to the person who approves release?
- Can a production incident be replayed without exposing private values?
- Which material changes force re-testing today?
- Who owns revocation and the emergency stop?
- Must the agent and evidence remain inside a private network or region?
- What would make a conditional approval technically enforceable?

## Design-partner offer

“Bring one agent workflow with a clear authority boundary. In one working session we will produce the candidate scope, minimum control map, adversarial scenario pack, evidence requirements, approval roles, and revocation triggers. If the workflow is eligible, we will also map the correct hosted or self-hosted integration path.”

Do not promise a certification, compliance conclusion, or production integration during the discovery session.

