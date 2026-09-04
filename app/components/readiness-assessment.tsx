"use client";

import { useState, type FormEvent } from "react";
import type {
  ReadinessAssessment,
  ReadinessInput,
  SafeguardId,
  DataClass,
  Capability,
} from "@/lib/readiness/assessment";

type AssessmentResponse = {
  data: ReadinessAssessment;
  meta: { execution: string; persisted: boolean };
};

type ResultView = "overview" | "controls" | "scenarios" | "owners" | "policy";

const useCaseOptions = [
  ["customer_service", "Customer service"],
  ["financial_operations", "Financial operations"],
  ["security_operations", "Security operations"],
  ["software_operations", "Software & infrastructure"],
  ["workforce", "Workforce & HR"],
  ["healthcare_operations", "Healthcare operations"],
  ["general_enterprise", "General enterprise"],
] as const;

const stageOptions = [
  ["prototype", "Prototype", "No real users or production effects"],
  ["pilot", "Pilot", "Limited users and bounded operations"],
  ["production", "Production", "Live users or business operations"],
] as const;

const autonomyOptions = [
  ["advisory", "Advisory only", "Recommends; a person performs the action"],
  ["approval_required", "Approval required", "Prepares actions; a person authorizes"],
  ["autonomous", "Autonomous", "Can execute without per-action review"],
] as const;

const exposureOptions = [
  ["internal", "Internal", "Employees and internal systems"],
  ["customer_facing", "Customer-facing", "Directly serves customers or partners"],
  ["public", "Public", "Open access or public-facing output"],
] as const;

const volumeOptions = [
  ["limited", "Limited", "Occasional or tightly bounded runs"],
  ["operational", "Operational", "Recurring day-to-day workflow"],
  ["high_scale", "High scale", "Large volume or broad deployment"],
] as const;

const dataOptions: Array<[DataClass, string, string]> = [
  ["public", "Public", "Publicly available information"],
  ["internal", "Internal", "Non-public company information"],
  ["confidential", "Confidential", "Customer, employee, or business-sensitive data"],
  ["regulated", "Regulated", "Financial, health, legal, or protected records"],
  ["credentials", "Credentials", "Tokens, secrets, or authentication material"],
];

const capabilityOptions: Array<[Capability, string, string]> = [
  ["read_records", "Read records", "Search and retrieve enterprise data"],
  ["write_records", "Change records", "Create, update, or delete business data"],
  ["external_communications", "Communicate externally", "Email, message, publish, or represent the company"],
  ["financial_transactions", "Move money", "Purchase, refund, invoice, trade, or commit funds"],
  ["identity_access", "Change access", "Grant, revoke, or use privileged identity"],
  ["code_infrastructure", "Change code or infrastructure", "Deploy, configure, execute, or remediate systems"],
  ["physical_operations", "Affect physical operations", "Control equipment, facilities, or real-world processes"],
];

const safeguardOptions: Array<[SafeguardId, string]> = [
  ["immutable_manifests", "Version-bound candidate manifest"],
  ["least_privilege", "Least-privilege tool permissions"],
  ["human_approval", "Human approval and escalation"],
  ["audit_logging", "Complete action and decision logs"],
  ["kill_switch", "Emergency stop / authority revocation"],
  ["sandboxing", "Isolated tool execution"],
  ["data_controls", "Sensitive-data policy controls"],
  ["regression_suite", "Automated regression suite"],
  ["rollback", "Idempotency and tested rollback"],
  ["incident_response", "Agent incident response playbook"],
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function markdownFor(result: ReadinessAssessment) {
  const gaps = result.requiredControls.filter((item) => !item.implemented);
  return `# EASAP Agent Release Readiness Plan

Assessment: ${result.assessmentId}
Subject: ${result.subject.name}
Inherent risk: ${result.risk.tier} (${result.risk.score}/100)
Assurance profile: ${result.risk.profile}
Planning status: ${result.readiness.status}
Control coverage: ${result.readiness.controlCoverage}%

## Risk drivers
${result.risk.drivers.map((item) => `- ${item}`).join("\n")}

## Open control gaps
${gaps.length ? gaps.map((item) => `- **${item.priority} — ${item.title}** (${item.owner}): ${item.reason}`).join("\n") : "- No required control gaps declared."}

## Required scenario pack
${result.scenarioPack.map((item) => `- **${item.title}:** ${item.objective}\n  - Pass: ${item.passCriterion}`).join("\n")}

## Role actions
${result.roleActions.map((item) => `- **${item.role}:** ${item.nextAction}\n  - Deliverable: ${item.deliverable}`).join("\n")}

## Release gate
- Minimum seeds: ${result.releaseGate.minimumSeedCount}
- Required approvals: ${result.releaseGate.requiredApprovals.join(", ")}
- Evidence retention: ${result.releaseGate.evidenceRetentionDays} days
- Blocking gaps: ${result.releaseGate.blockingControlGaps.join(", ") || "None declared"}

## Important boundary
${result.limitations.map((item) => `- ${item}`).join("\n")}
`;
}

export function ReadinessAssessment({
  initialInput,
  initialResult,
}: {
  initialInput: ReadinessInput;
  initialResult: ReadinessAssessment;
}) {
  const [input, setInput] = useState<ReadinessInput>(initialInput);
  const [result, setResult] = useState(initialResult);
  const [view, setView] = useState<ResultView>("overview");
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof ReadinessInput>(key: K, value: ReadinessInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setError(null);
  };

  const toggle = <T extends DataClass | Capability | SafeguardId>(key: "dataClasses" | "capabilities" | "safeguards", value: T) => {
    const current = input[key] as T[];
    update(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as ReadinessInput[typeof key]);
  };

  const assess = async (event: FormEvent) => {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/readiness/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as AssessmentResponse | { error?: string };
      if (!response.ok || !("data" in payload)) throw new Error("error" in payload && payload.error ? payload.error : "Assessment could not be completed.");
      setResult(payload.data);
      setDirty(false);
      setView("overview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assessment could not be completed.");
    } finally {
      setRunning(false);
    }
  };

  const openGaps = result.requiredControls.filter((item) => !item.implemented);
  const criticalGaps = openGaps.filter((item) => item.priority === "CRITICAL");
  const policyJson = JSON.stringify({
    schemaVersion: result.schemaVersion,
    assessmentId: result.assessmentId,
    subject: result.subject,
    inputDigest: result.inputDigest,
    risk: result.risk,
    releaseGate: result.releaseGate,
  }, null, 2);

  const copyPolicy = async () => {
    await navigator.clipboard.writeText(policyJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="readiness-workspace" aria-label="Agent release readiness planner">
      <form className="readiness-inputs" onSubmit={assess}>
        <div className="planner-panel-head">
          <div><span>01</span><div><strong>Describe the authority</strong><small>Nothing entered here is persisted.</small></div></div>
          <span className="privacy-pill">LOCAL INPUT · NO ACCOUNT</span>
        </div>

        <div className="planner-form-scroll">
          <fieldset className="planner-fieldset identity-fields">
            <legend>Agent context</legend>
            <label>Agent or system name<input required minLength={2} maxLength={80} value={input.agentName} onChange={(event) => update("agentName", event.target.value)} /></label>
            <label>Primary use case<select value={input.useCase} onChange={(event) => update("useCase", event.target.value as ReadinessInput["useCase"])}>{useCaseOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="wide-field">What does it do?<textarea maxLength={280} rows={2} value={input.description} onChange={(event) => update("description", event.target.value)} /></label>
          </fieldset>

          <RadioGroup legend="Deployment stage" name="stage" options={stageOptions} value={input.deploymentStage} onChange={(value) => update("deploymentStage", value as ReadinessInput["deploymentStage"])} />
          <RadioGroup legend="Action autonomy" name="autonomy" options={autonomyOptions} value={input.autonomy} onChange={(value) => update("autonomy", value as ReadinessInput["autonomy"])} />
          <RadioGroup legend="Who is exposed?" name="exposure" options={exposureOptions} value={input.exposure} onChange={(value) => update("exposure", value as ReadinessInput["exposure"])} />
          <RadioGroup legend="Execution volume" name="volume" options={volumeOptions} value={input.volume} onChange={(value) => update("volume", value as ReadinessInput["volume"])} />

          <CheckboxGroup legend="Data it can access" options={dataOptions} selected={input.dataClasses} onToggle={(value) => toggle("dataClasses", value as DataClass)} />
          <CheckboxGroup legend="Actions it can take" options={capabilityOptions} selected={input.capabilities} onToggle={(value) => toggle("capabilities", value as Capability)} />
          <CheckboxGroup legend="Controls already implemented" options={safeguardOptions.map(([value, label]) => [value, label, "Declare only controls that are operating today"])} selected={input.safeguards} onToggle={(value) => toggle("safeguards", value as SafeguardId)} />
        </div>

        <div className="planner-submit">
          <div><span className={dirty ? "dirty-dot" : "clean-dot"} />{dirty ? "Inputs changed · refresh the plan" : `Plan current · ${result.assessmentId}`}</div>
          <button className="button button-accent" type="submit" disabled={running}>{running ? "Building assurance plan…" : "Generate assurance plan"}<span>↗</span></button>
          {error && <p role="alert">{error}</p>}
        </div>
      </form>

      <div className="readiness-results">
        <div className="planner-panel-head result-head">
          <div><span>02</span><div><strong>Act on the plan</strong><small>Deterministic rules · EASAP-RP-1.0</small></div></div>
          <span className={`risk-badge risk-${result.risk.tier.toLowerCase()}`}>{result.risk.tier} RISK</span>
        </div>

        <div className="result-summary">
          <div className="risk-score"><strong>{result.risk.score}</strong><span>/ 100<br />inherent risk</span></div>
          <div><small>MINIMUM ASSURANCE PROFILE</small><h2>{result.risk.profile}</h2><p>{result.readiness.status}</p></div>
          <div className="coverage-stat"><small>CONTROL COVERAGE</small><strong>{result.readiness.controlCoverage}%</strong><div><span style={{ width: `${result.readiness.controlCoverage}%` }} /></div></div>
        </div>

        <div className="result-boundary"><strong>Planning result—not a production approval.</strong><span>The exact integrated agent must still pass its executable assurance campaign.</span></div>

        <div className="result-tabs" role="tablist" aria-label="Assessment result views">
          {(["overview", "controls", "scenarios", "owners", "policy"] as ResultView[]).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>

        <div className="result-view" aria-live="polite">
          {view === "overview" && <Overview result={result} openGaps={openGaps.length} criticalGaps={criticalGaps.length} />}
          {view === "controls" && <Controls result={result} />}
          {view === "scenarios" && <Scenarios result={result} />}
          {view === "owners" && <Owners result={result} />}
          {view === "policy" && <Policy policyJson={policyJson} copied={copied} onCopy={copyPolicy} />}
        </div>

        <div className="result-actions">
          <button type="button" className="button button-dark" onClick={() => download(`${result.assessmentId}.json`, JSON.stringify(result, null, 2), "application/json")}>Download complete JSON</button>
          <button type="button" className="button button-outline" onClick={() => download(`${result.assessmentId}.md`, markdownFor(result), "text/markdown")}>Download review brief</button>
        </div>
      </div>
    </section>
  );
}

function RadioGroup({ legend, name, options, value, onChange }: { legend: string; name: string; options: ReadonlyArray<readonly [string, string, string]>; value: string; onChange: (value: string) => void }) {
  return <fieldset className="planner-fieldset"><legend>{legend}</legend><div className="choice-grid">{options.map(([optionValue, label, detail]) => <label className="choice-card" key={optionValue}><input type="radio" name={name} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</div></fieldset>;
}

function CheckboxGroup({ legend, options, selected, onToggle }: { legend: string; options: ReadonlyArray<readonly [string, string, string]>; selected: readonly string[]; onToggle: (value: string) => void }) {
  return <fieldset className="planner-fieldset"><legend>{legend}</legend><div className="check-grid">{options.map(([optionValue, label, detail]) => <label className="check-card" key={optionValue}><input type="checkbox" checked={selected.includes(optionValue)} onChange={() => onToggle(optionValue)} /><span className="check-indicator">✓</span><span><strong>{label}</strong><small>{detail}</small></span></label>)}</div></fieldset>;
}

function Overview({ result, openGaps, criticalGaps }: { result: ReadinessAssessment; openGaps: number; criticalGaps: number }) {
  return <div className="overview-view"><div className="result-kpis"><article><small>OPEN CONTROL GAPS</small><strong>{openGaps}</strong><span>{criticalGaps} critical blocker{criticalGaps === 1 ? "" : "s"}</span></article><article><small>REQUIRED SCENARIOS</small><strong>{result.scenarioPack.length}</strong><span>{result.releaseGate.minimumSeedCount} minimum seeds</span></article><article><small>REQUIRED APPROVALS</small><strong>{result.releaseGate.requiredApprovals.length}</strong><span>{result.releaseGate.requiredApprovals.join(" · ")}</span></article></div><div className="driver-list"><small>WHY THIS CLASSIFICATION</small><div>{result.risk.drivers.map((driver) => <span key={driver}>{driver}</span>)}</div></div><div className="next-decision"><span>IMMEDIATE NEXT DECISION</span><strong>{criticalGaps ? `Assign owners for ${criticalGaps} critical control gaps before campaign design.` : openGaps ? `Close or formally accept ${openGaps} control gaps before executing the release gate.` : `Freeze the candidate manifest and execute the ${result.risk.profile} scenario pack.`}</strong></div></div>;
}

function Controls({ result }: { result: ReadinessAssessment }) {
  return <div className="control-list"><div className="list-intro"><strong>{result.readiness.implementedControls} of {result.readiness.requiredControls} required controls declared</strong><span>Implementation must be evidenced during the campaign.</span></div>{result.requiredControls.map((item) => <article key={item.id} className={item.implemented ? "implemented" : "gap"}><span>{item.implemented ? "✓" : "!"}</span><div><small>{item.priority} · {item.owner}</small><h3>{item.title}</h3><p>{item.reason}</p></div><strong>{item.implemented ? "DECLARED" : "OPEN GAP"}</strong></article>)}</div>;
}

function Scenarios({ result }: { result: ReadinessAssessment }) {
  return <div className="scenario-list"><div className="list-intro"><strong>{result.scenarioPack.length} minimum scenarios · {result.releaseGate.minimumSeedCount} seeds</strong><span>Extend this pack with organization-specific incidents and policies.</span></div>{result.scenarioPack.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.owners.join(" · ")}</small><h3>{item.title}</h3><p>{item.objective}</p><strong>PASS · {item.passCriterion}</strong></div></article>)}</div>;
}

function Owners({ result }: { result: ReadinessAssessment }) {
  return <div className="owner-list">{result.roleActions.map((item, index) => <article key={item.role}><span>0{index + 1}</span><div><small>{item.objective}</small><h3>{item.role}</h3><p>{item.nextAction}</p><strong>DELIVERABLE · {item.deliverable}</strong></div></article>)}</div>;
}

function Policy({ policyJson, copied, onCopy }: { policyJson: string; copied: boolean; onCopy: () => void }) {
  return <div className="policy-view"><div><div><strong>Machine-readable release gate</strong><span>Commit this policy beside the agent candidate.</span></div><button type="button" onClick={onCopy}>{copied ? "Copied ✓" : "Copy JSON"}</button></div><pre>{policyJson}</pre></div>;
}
