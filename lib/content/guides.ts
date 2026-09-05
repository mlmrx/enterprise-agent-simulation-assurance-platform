export interface AudienceGuide {
  slug: string;
  eyebrow: string;
  title: string;
  dek: string;
  audience: string;
  outcome: string;
  firstAction: string;
  outputs: string[];
  steps: Array<{ title: string; copy: string }>;
  checklist: string[];
  boundary: string;
}

export const audienceGuides: AudienceGuide[] = [
  {
    slug: "ai-engineering",
    eyebrow: "Guide 01 · AI platform & engineering",
    title: "Turn an agent build into an executable candidate.",
    dek: "Use EASAP to bind the exact system, declare its authority, and give every later test a stable subject.",
    audience: "AI platform engineers, application engineers, and quality teams",
    outcome: "A version-bound candidate manifest and an executable assurance campaign.",
    firstAction: "If the agent already has a public endpoint, verify it in the connector and run the live baseline. For a pre-release agent, start with the Readiness Planner.",
    outputs: ["Candidate manifest", "Capability boundary", "Scenario adapter", "Regression gate"],
    steps: [
      { title: "Describe the authority", copy: "Capture autonomy, exposure, data, scale, and actions. Treat this as the system contract, not a product description." },
      { title: "Freeze the candidate", copy: "Bind model, prompts, tools, memory, policy, connectors, and runtime to immutable digests so a result cannot drift underneath you." },
      { title: "Connect the boundary", copy: "Route tool requests through a mediated adapter. Undeclared effects must fail closed before they reach an external system." },
      { title: "Run and regress", copy: "Execute the generated scenario pack, retain traces and digests, and re-run the same gate whenever a material input changes." },
    ],
    checklist: ["Every capability has an owner and data scope", "The candidate can be reproduced from its manifest", "External effects are mediated and observable", "Failures have a deterministic replay path"],
    boundary: "The planner creates the release work; it does not prove the integrated agent is safe until the campaign runs.",
  },
  {
    slug: "security-red-team",
    eyebrow: "Guide 02 · Security & red team",
    title: "Turn adversarial findings into repeatable release evidence.",
    dek: "Use EASAP to attack the authority boundary, minimize failures, and show exactly what must be fixed before release.",
    audience: "Application security, product security, red teams, and incident responders",
    outcome: "A prioritized scenario pack, replayable findings, and evidence-backed blockers.",
    firstAction: "Verify the public agent endpoint and capture the four-check live baseline. Then expand from observed responses into the broader threat-driven campaign.",
    outputs: ["Threat-driven scenarios", "Causal traces", "Minimized regression", "Blocking findings"],
    steps: [
      { title: "Start from consequences", copy: "Map what the agent can change, disclose, transact, or operate—not only which prompts it can answer." },
      { title: "Select attack paths", copy: "Use injection, revoked authority, exfiltration, approval bypass, stale state, sandbox escape, and replay scenarios where they apply." },
      { title: "Challenge fail-closed behavior", copy: "Verify that policy denial happens before the effect, that partial failure does not create orphaned state, and that revocation propagates." },
      { title: "Minimize and publish", copy: "Reduce a failure to the smallest reproducing trace, redact protected values, and publish it as a regression with an owner." },
    ],
    checklist: ["Attacks enter through user, retrieval, and tool-response channels", "Unauthorized effects are blocked before execution", "Revocation is tested across memory, tokens, and queued work", "A finding can be replayed without private values"],
    boundary: "A red-team pass is evidence about the tested envelope. It is not a universal safety claim.",
  },
  {
    slug: "risk-governance",
    eyebrow: "Guide 03 · Risk, governance & audit",
    title: "Make agent governance reviewable instead of interpretive.",
    dek: "Use EASAP to define the required evidence, accountable owners, approvals, retention, expiry, and revocation before a launch meeting.",
    audience: "AI governance, model risk, privacy, compliance, internal audit, and legal operations",
    outcome: "A review packet that explains what was tested, why it matters, and what conditions govern release.",
    firstAction: "Use the planner to generate a profile and control map, then verify that each required control has a named accountable owner.",
    outputs: ["Risk classification", "Control register", "Approval matrix", "Evidence retention policy"],
    steps: [
      { title: "Set the decision boundary", copy: "Define the operating envelope: subject digest, permitted data, tools, users, geography, scale, expiry, and prohibited effects." },
      { title: "Separate inherent risk from control coverage", copy: "A safeguard does not erase the authority an agent receives. Track exposure and implemented controls as distinct facts." },
      { title: "Require inspectable evidence", copy: "Ask for sample size, uncertainty, traces, signatures, findings, approvals, and decision conditions—not a single benchmark score." },
      { title: "Govern change", copy: "Material changes should invalidate or narrow an earlier decision and trigger the appropriate regression suite." },
    ],
    checklist: ["The risk tier is tied to a documented authority model", "Control owners and approval roles are explicit", "Evidence retention and expiry are agreed before release", "Revocation and material-change rules are documented"],
    boundary: "EASAP structures evidence and accountability; it does not replace legal advice, policy ownership, or independent audit judgment.",
  },
  {
    slug: "product-release",
    eyebrow: "Guide 04 · Product & release authority",
    title: "Replace launch debate with a bounded ship decision.",
    dek: "Use EASAP to understand what you are approving, what remains conditional, and what must stop the rollout.",
    audience: "Product leaders, release managers, service owners, and accountable executives",
    outcome: "A clear APPROVED, CONDITIONAL, or REJECTED decision with conditions and an owner for every exception.",
    firstAction: "Describe the agent as it will operate in production, then review the planner’s critical blockers before asking for a campaign.",
    outputs: ["Decision posture", "Release conditions", "Residual risk summary", "Rollback and revocation triggers"],
    steps: [
      { title: "Ask what authority is being granted", copy: "Frame the launch around effects: money, records, identity, private data, external representation, or physical operations." },
      { title: "Review the minimum proof", copy: "Confirm the required scenarios, seed count, control coverage, approval roles, and evidence retention for the profile." },
      { title: "Choose a bounded posture", copy: "Ship only within the tested envelope. Conditional means conditions are enforceable and observable, not merely written in a ticket." },
      { title: "Keep the stop path live", copy: "Agree on kill-switch ownership, rollback, incident response, expiry, and the exact changes that force re-evaluation." },
    ],
    checklist: ["The tested candidate matches the release candidate", "Conditions are enforceable at runtime", "A rollback and emergency stop owner is on-call", "The next material change already has a re-test path"],
    boundary: "A release posture is only as strong as the system boundary and operating conditions it names.",
  },
];

export function guideForSlug(slug: string) {
  return audienceGuides.find((guide) => guide.slug === slug);
}
