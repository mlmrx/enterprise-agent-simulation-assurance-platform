"use client";

import { useState, type FormEvent } from "react";

type Protocol = "openai_chat" | "json_message";
type ProbeStatus = "PASS" | "REVIEW" | "FAIL";

type Registration = {
  setupToken: string;
  agentName: string;
  endpoint: string;
  protocol: Protocol;
  challenge: string;
  verificationUrl: string;
  expiresAt: string;
};

type Verification = {
  verifiedTargetToken: string;
  verifiedAt: string;
  expiresAt: string;
};

type ProbeCheck = {
  id: string;
  title: string;
  category: string;
  status: ProbeStatus;
  observed: string;
  expected: string;
  latencyMs: number;
  responseExcerpt: string;
  responseDigest: string;
};

type ProbeReport = {
  schemaVersion: string;
  reportId: string;
  agent: { name: string; endpointOrigin: string; protocol: Protocol; model?: string };
  startedAt: string;
  completedAt: string;
  overall: ProbeStatus;
  summary: { tests: number; passed: number; review: number; failed: number; medianLatencyMs: number };
  checks: ProbeCheck[];
  limitations: string[];
};

const steps = ["Register", "Verify ownership", "Run probe", "Review evidence"];

function downloadReport(report: ProbeReport) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.reportId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AgentConnector() {
  const [step, setStep] = useState(1);
  const [agentName, setAgentName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [protocol, setProtocol] = useState<Protocol>("openai_chat");
  const [model, setModel] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [safeTarget, setSafeTarget] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const request = async <T,>(path: string, body: unknown) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json() as { data?: T; error?: string; detail?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error || payload.detail || "The request could not be completed.");
    return payload.data;
  };

  const register = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await request<Registration>("/api/targets/register", { agentName, endpointUrl, protocol, model, authorized, safeTarget });
      setRegistration(data);
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The target could not be registered.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!registration) return;
    setBusy(true);
    setError(null);
    try {
      const data = await request<Verification>("/api/targets/verify", { setupToken: registration.setupToken });
      setVerification(data);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ownership could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!verification) return;
    setBusy(true);
    setError(null);
    try {
      const data = await request<ProbeReport>("/api/targets/run", { verifiedTargetToken: verification.verifiedTargetToken });
      setReport(data);
      setStep(4);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The probe could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const copyChallenge = async () => {
    if (!registration) return;
    await navigator.clipboard.writeText(registration.challenge);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="connector-workspace" aria-label="Connect and test an enterprise agent">
      <ol className="connector-steps">
        {steps.map((label, index) => {
          const number = index + 1;
          return <li key={label} className={step === number ? "active" : step > number ? "complete" : ""}><span>{step > number ? "✓" : `0${number}`}</span><strong>{label}</strong></li>;
        })}
      </ol>

      <div className="connector-grid">
        <div className="connector-main">
          {step === 1 && (
            <form onSubmit={register} className="connector-form">
              <div className="connector-panel-heading"><span>01</span><div><small>REGISTER THE BOUNDARY</small><h2>Where can EASAP reach your agent?</h2></div></div>
              <div className="connector-fields">
                <label>Agent name<input required minLength={2} maxLength={80} value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="Customer support agent" /></label>
                <label>Public HTTPS endpoint<input required type="url" value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder="https://agent.example.com/v1/chat" /></label>
                <label>Request contract<select value={protocol} onChange={(event) => setProtocol(event.target.value as Protocol)}><option value="openai_chat">OpenAI-compatible chat JSON</option><option value="json_message">Generic JSON message webhook</option></select></label>
                <label>Model or agent ID <small>Optional</small><input maxLength={100} value={model} onChange={(event) => setModel(event.target.value)} placeholder="support-agent-production" /></label>
              </div>
              <div className="connector-attestations">
                <label><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required /><span><strong>I own or am explicitly authorized to test this endpoint.</strong><small>EASAP will require a file-based ownership challenge before sending probe prompts.</small></span></label>
                <label><input type="checkbox" checked={safeTarget} onChange={(event) => setSafeTarget(event.target.checked)} required /><span><strong>This endpoint is safe for bounded, read-only evaluation prompts.</strong><small>The probe does not request tool calls, transactions, record changes, or production data.</small></span></label>
              </div>
              <div className="connector-submit"><span>No API keys or credentials are accepted by this connector.</span><button className="button button-accent" type="submit" disabled={busy}>{busy ? "Creating challenge…" : "Create ownership challenge"}<b>↗</b></button></div>
            </form>
          )}

          {step === 2 && registration && (
            <div className="verification-panel">
              <div className="connector-panel-heading"><span>02</span><div><small>PROVE AUTHORIZATION</small><h2>Publish one temporary challenge.</h2></div></div>
              <p>Place the exact value below at the verification URL. EASAP checks it directly and does not follow redirects.</p>
              <div className="verification-block"><small>VERIFICATION URL</small><code>{registration.verificationUrl}</code></div>
              <div className="verification-block challenge-block"><small>EXPECTED FILE CONTENT</small><code>{registration.challenge}</code><button type="button" onClick={copyChallenge}>{copied ? "Copied ✓" : "Copy"}</button></div>
              <div className="verification-notes"><span>Challenge expires {new Date(registration.expiresAt).toLocaleString()}</span><span>Remove the file after verification</span></div>
              <div className="connector-submit"><button className="button button-quiet" type="button" onClick={() => setStep(1)}>Edit target</button><button className="button button-accent" type="button" onClick={verify} disabled={busy}>{busy ? "Checking ownership…" : "Verify ownership"}<b>↗</b></button></div>
            </div>
          )}

          {step === 3 && registration && verification && (
            <div className="probe-ready-panel">
              <div className="connector-panel-heading"><span>03</span><div><small>VERIFIED TARGET</small><h2>Run the bounded public-agent baseline.</h2></div></div>
              <div className="verified-banner"><span>✓</span><div><strong>Ownership verified</strong><small>{registration.endpoint}</small></div></div>
              <div className="probe-manifest">
                <article><span>01</span><div><strong>Contract handshake</strong><small>Response shape and instruction following</small></div></article>
                <article><span>02</span><div><strong>Override resistance</strong><small>Higher-priority instruction disclosure request</small></div></article>
                <article><span>03</span><div><strong>False-action resistance</strong><small>Pressure to claim an unperformed action</small></div></article>
                <article><span>04</span><div><strong>Data-boundary response</strong><small>Request for credentials and environment data</small></div></article>
              </div>
              <div className="connector-submit"><span>Four sequential prompts · 12 second timeout each · no redirects</span><button className="button button-accent" type="button" onClick={run} disabled={busy}>{busy ? "Running live probe…" : "Run live baseline"}<b>↗</b></button></div>
            </div>
          )}

          {step === 4 && report && (
            <div className="probe-report">
              <div className="connector-panel-heading"><span>04</span><div><small>OBSERVED EVIDENCE</small><h2>{report.agent.name}</h2></div><strong className={`probe-verdict verdict-${report.overall.toLowerCase()}`}>{report.overall}</strong></div>
              <div className="report-summary"><article><small>CHECKS</small><strong>{report.summary.tests}</strong></article><article><small>PASSED</small><strong>{report.summary.passed}</strong></article><article><small>REVIEW</small><strong>{report.summary.review}</strong></article><article><small>FAILED</small><strong>{report.summary.failed}</strong></article><article><small>MEDIAN LATENCY</small><strong>{report.summary.medianLatencyMs} ms</strong></article></div>
              <div className="probe-checks">{report.checks.map((check) => <article key={check.id} className={`check-${check.status.toLowerCase()}`}><span>{check.status === "PASS" ? "✓" : check.status === "FAIL" ? "!" : "?"}</span><div><small>{check.category} · {check.latencyMs} ms</small><h3>{check.title}</h3><p>{check.observed}</p><details><summary>Inspect response evidence</summary><code>{check.responseExcerpt || "No response text returned."}</code><small>{check.responseDigest}</small></details></div><strong>{check.status}</strong></article>)}</div>
              <div className="report-boundary"><strong>Baseline finding—not a certification.</strong><span>{report.limitations[0]}</span></div>
              <div className="connector-submit"><button className="button button-quiet" type="button" onClick={() => { setStep(1); setRegistration(null); setVerification(null); setReport(null); }}>Test another agent</button><button className="button button-dark" type="button" onClick={() => downloadReport(report)}>Download evidence JSON</button></div>
            </div>
          )}
          {error && <div className="connector-error" role="alert"><strong>Could not continue</strong><span>{error}</span></div>}
        </div>

        <aside className="connector-boundary">
          <span className="section-label light"><i /> Safety boundary</span>
          <h2>Testing begins only after control is demonstrated.</h2>
          <div><span>01</span><p><strong>Public HTTPS only.</strong> Private, loopback, link-local, and cloud-metadata destinations are rejected.</p></div>
          <div><span>02</span><p><strong>No arbitrary headers.</strong> This public connector never accepts or stores bearer tokens, cookies, or API keys.</p></div>
          <div><span>03</span><p><strong>No side-effect requests.</strong> The baseline asks for text responses only and explicitly forbids tool use.</p></div>
          <div><span>04</span><p><strong>Evidence stays bounded.</strong> Reports describe observed responses at one endpoint and one moment—not universal safety.</p></div>
          <small>For authenticated or private enterprise agents, deploy the open connector inside your network boundary.</small>
        </aside>
      </div>
    </section>
  );
}
