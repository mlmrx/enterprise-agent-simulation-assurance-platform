"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CampaignResponse = {
  data: {
    run_id: string;
    mode: string;
    summary: {
      trials: number;
      passed: number;
      findings: number;
      duration: string;
      sampleCount: number;
      distribution: Record<string, number>;
      confidenceInterval95: { lower: number; upper: number } | [number, number];
      seedCoverage: unknown;
    };
    decision: {
      id: string;
      posture: string;
      conditions: Array<Record<string, unknown>>;
      residualRisk: { rating?: string; openFindings?: number };
      gateSummary: {
        requiredSuitesSatisfied: boolean;
        criticalFindings: number;
        thresholds: Array<{ measure: string; aggregate: number | null; passed: boolean }>;
      };
    };
    certificate?: { payloadDigest: string; signature: string };
    evidence: {
      resultDigests: string[];
      certificateDigest?: string;
      verified: boolean;
    };
  };
  meta: { execution: string; elapsedMs: number; limitations: string[] };
};

const phases = [
  "Sealing subject, world, scenario, and seed manifests",
  "Mediating tools, time, randomness, and external effects",
  "Injecting stale data, permission loss, and prompt attacks",
  "Evaluating oracles and estimating uncertainty",
  "Signing evidence and evaluating the release gate",
];

function shortDigest(value?: string) {
  if (!value) return "Not issued";
  return `${value.slice(0, 17)}…${value.slice(-8)}`;
}

function interval(value: CampaignResponse["data"]["summary"]["confidenceInterval95"]) {
  if (Array.isArray(value)) return value;
  return [value?.lower ?? 0, value?.upper ?? 0];
}

export function LiveProof({ compact = false }: { compact?: boolean }) {
  const [trialCount, setTrialCount] = useState(12);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState<CampaignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setPhase(0);
    timer.current = setInterval(() => setPhase((current) => Math.min(current + 1, phases.length - 1)), 620);
    try {
      const response = await fetch("/api/demo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ trialCount }),
      });
      const payload = (await response.json()) as CampaignResponse | { error?: string };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Campaign execution failed.");
      }
      setPhase(phases.length - 1);
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Campaign execution failed.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setRunning(false);
    }
  };

  const downloadEvidence = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.data.run_id}-evidence.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const ci = useMemo(() => result ? interval(result.data.summary.confidenceInterval95) : [0, 0], [result]);

  return (
    <section className={`proof-console ${compact ? "proof-console-compact" : ""}`} aria-labelledby="proof-title">
      <div className="proof-toolbar">
        <div>
          <span className="proof-live"><i /> Executable reference system</span>
          <h2 id="proof-title">Watch an agent earn—or lose—authority.</h2>
          <p>Every number below comes from a live deterministic campaign. No prerecorded result is substituted.</p>
        </div>
        <div className="runner-controls">
          <label>
            Trial matrix
            <select value={trialCount} onChange={(event) => setTrialCount(Number(event.target.value))} disabled={running}>
              <option value={8}>8 seeds</option>
              <option value={12}>12 seeds</option>
              <option value={24}>24 seeds</option>
            </select>
          </label>
          <button className="button button-accent" onClick={run} disabled={running}>
            {running ? "Executing campaign" : result ? "Run again" : "Run live campaign"}
            <span aria-hidden="true">{running ? "···" : "↗"}</span>
          </button>
        </div>
      </div>

      <div className="proof-stage">
        <div className="proof-flow" aria-label="Campaign execution pipeline">
          {phases.map((item, index) => (
            <div key={item} className={`${running && index === phase ? "active" : ""} ${result || phase > index ? "complete" : ""}`}>
              <span>{result || phase > index ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>

        <div className="proof-output" aria-live="polite">
          {!running && !result && !error && (
            <div className="proof-idle">
              <div className="radar-mark" aria-hidden="true"><i /><i /><span /></div>
              <strong>Procurement authority boundary</strong>
              <p>A real agent harness will process synthetic purchasing events while faults attempt to bypass policy.</p>
              <small>STANDARD isolation · synthetic data · egress denied</small>
            </div>
          )}

          {running && (
            <div className="proof-running">
              <span className="execution-spinner" />
              <small>Harness event</small>
              <strong>{phases[phase]}</strong>
              <div className="execution-line"><span style={{ width: `${18 + phase * 20}%` }} /></div>
              <code>seed schedule pinned · capability manifest sealed</code>
            </div>
          )}

          {error && (
            <div className="proof-error">
              <span>Execution stopped</span>
              <strong>{error}</strong>
              <p>The UI does not fabricate a successful fallback. Retry when the reference runner is available.</p>
            </div>
          )}

          {result && (
            <div className="proof-result">
              <div className="decision-row">
                <div>
                  <small>Release posture</small>
                  <strong>{result.data.decision.posture}</strong>
                </div>
                <span className={`decision-pill ${result.data.decision.posture.toLowerCase()}`}>{result.data.mode}</span>
              </div>
              <div className="result-metrics">
                <div><small>Outcomes</small><strong>{result.data.summary.passed}/{result.data.summary.trials}</strong><span>goal achieved</span></div>
                <div><small>Findings</small><strong>{result.data.summary.findings}</strong><span>{result.data.decision.gateSummary.criticalFindings} critical</span></div>
                <div><small>95% interval</small><strong>{Math.round(ci[0] * 100)}–{Math.round(ci[1] * 100)}%</strong><span>not a scalar claim</span></div>
                <div><small>Engine time</small><strong>{result.meta.elapsedMs}ms</strong><span>{result.data.summary.duration}</span></div>
              </div>
              <div className="evidence-proof">
                <div><span className="evidence-check">✓</span><p><strong>Evidence verified</strong><small>{result.data.evidence.resultDigests.length} signed result envelopes</small></p></div>
                <code>{shortDigest(result.data.evidence.certificateDigest || result.data.evidence.resultDigests[0])}</code>
              </div>
              <div className="proof-actions">
                <button className="button button-quiet" onClick={downloadEvidence}>Download evidence JSON</button>
                <a href="/platform" className="text-link">Inspect the workbench <span>→</span></a>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="proof-footnote">
        <span>What actually runs</span>
        <p>Immutable manifests → seeded trials → mediated effects → causal traces → statistical measures → signed decision</p>
        <a href="https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform" target="_blank" rel="noreferrer">Audit the source ↗</a>
      </div>
    </section>
  );
}
