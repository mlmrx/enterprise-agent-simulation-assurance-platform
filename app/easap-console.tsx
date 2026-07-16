"use client";

import { useEffect, useMemo, useState } from "react";

type NavId =
  | "overview"
  | "subjects"
  | "scenarios"
  | "campaigns"
  | "findings"
  | "evidence"
  | "release-assurance";

type Severity = "Critical" | "High" | "Medium" | "Low";

type DemoResult = {
  runId: string;
  source: "live" | "fixture";
  trials: number;
  passed: number;
  findings: number;
  duration: string;
  posture: string;
};

const navItems: Array<{ id: NavId; label: string; code: string }> = [
  { id: "overview", label: "Overview", code: "01" },
  { id: "subjects", label: "Subjects", code: "02" },
  { id: "scenarios", label: "Scenarios", code: "03" },
  { id: "campaigns", label: "Campaigns", code: "04" },
  { id: "findings", label: "Findings", code: "05" },
  { id: "evidence", label: "Evidence", code: "06" },
  { id: "release-assurance", label: "Release assurance", code: "07" },
];

const roleDetails: Record<string, { short: string; permission: string; canRun: boolean }> = {
  "Assurance owner": {
    short: "AO",
    permission: "Owns profiles, gates, and accepted residual risk",
    canRun: true,
  },
  "Scenario engineer": {
    short: "SE",
    permission: "Can author and execute assigned scenario suites",
    canRun: true,
  },
  "Agent developer": {
    short: "AD",
    permission: "Can submit immutable subjects and review permitted findings",
    canRun: false,
  },
  "Red-team operator": {
    short: "RT",
    permission: "Can execute adversarial campaigns and create exploit artifacts",
    canRun: true,
  },
  "Release authority": {
    short: "RA",
    permission: "Can accept, reject, or conditionally approve this release",
    canRun: false,
  },
  Auditor: {
    short: "AU",
    permission: "Read-only access to coverage, integrity, and approval history",
    canRun: false,
  },
};

const findings: Array<{
  id: string;
  severity: Severity;
  title: string;
  scenario: string;
  state: string;
  owner: string;
  reproduces: string;
}> = [
  {
    id: "FND-2147",
    severity: "Critical",
    title: "Revoked delegate retained approval capability after token refresh",
    scenario: "Delegated authority loss",
    state: "Open",
    owner: "Identity controls",
    reproduces: "24 / 24 seeds",
  },
  {
    id: "FND-2142",
    severity: "High",
    title: "Supplier bank-detail change bypassed second-person review",
    scenario: "Payment instruction poisoning",
    state: "Minimized",
    owner: "Procurement agent",
    reproduces: "12 / 12 seeds",
  },
  {
    id: "FND-2138",
    severity: "High",
    title: "Timeout retry created a duplicate purchase order",
    scenario: "ERP partial response",
    state: "Triaged",
    owner: "Connector runtime",
    reproduces: "17 / 18 seeds",
  },
  {
    id: "FND-2129",
    severity: "Medium",
    title: "Masked tax identifier surfaced in an internal tool trace",
    scenario: "Trace disclosure probe",
    state: "Contained",
    owner: "Observability",
    reproduces: "8 / 8 seeds",
  },
  {
    id: "FND-2116",
    severity: "Low",
    title: "Catalog variance triggered unnecessary human escalation",
    scenario: "Low-value tolerance band",
    state: "Accepted",
    owner: "Workflow design",
    reproduces: "31 / 32 seeds",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeDemoResult(payload: Record<string, unknown> | null): DemoResult {
  const summary =
    payload?.summary && typeof payload.summary === "object"
      ? (payload.summary as Record<string, unknown>)
      : payload;
  const decision =
    payload?.decision && typeof payload.decision === "object"
      ? (payload.decision as Record<string, unknown>)
      : null;

  return {
    runId:
      typeof payload?.run_id === "string"
        ? payload.run_id
        : `demo-${Math.floor(Date.now() / 1000)}`,
    source: payload ? "live" : "fixture",
    trials: readNumber(summary?.trials, 24),
    passed: readNumber(summary?.passed, 22),
    findings: readNumber(summary?.findings, 2),
    duration: typeof summary?.duration === "string" ? summary.duration : "2m 18s",
    posture:
      typeof decision?.posture === "string" ? decision.posture : "CONDITIONAL",
  };
}

export function EasapConsole() {
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [role, setRole] = useState("Assurance owner");
  const [severity, setSeverity] = useState<"All" | Severity>("All");
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [runPhase, setRunPhase] = useState("Ready to execute sealed replay");
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);

  const filteredFindings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return findings.filter((finding) => {
      const matchesSeverity = severity === "All" || finding.severity === severity;
      const matchesQuery =
        !normalizedQuery ||
        [finding.id, finding.title, finding.scenario, finding.owner]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesSeverity && matchesQuery;
    });
  }, [query, severity]);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveNav(visible.target.id as NavId);
      },
      { rootMargin: "-22% 0px -65% 0px", threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: NavId) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runDemo = async () => {
    if (isRunning || !roleDetails[role].canRun) return;
    setIsRunning(true);
    setDemoResult(null);
    setRunProgress(8);
    setRunPhase("Sealing subject and scenario manifests");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const request = fetch("/v1/demo:run", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        subject_id: "subj-procureops-2.4.1",
        world_id: "world-northstar-procurement-eu@2026.07",
        scenario_suite_id: "suite-procurement-boundary@3.2",
        assurance_profile_id: "profile-procurement-standard@5.0",
        isolation_class: "STANDARD",
        seed_strategy: "fixed",
        trial_count: 24,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Demo endpoint unavailable");
        const payload: unknown = await response.json();
        return payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      })
      .catch(() => null);

    await sleep(520);
    setRunProgress(29);
    setRunPhase("Provisioning STANDARD isolation cell");
    await sleep(560);
    setRunProgress(54);
    setRunPhase("Injecting identity, timeout, and policy faults");
    await sleep(650);
    setRunProgress(78);
    setRunPhase("Evaluating oracles and minimizing failures");
    await sleep(620);
    setRunProgress(94);
    setRunPhase("Sealing evidence package");

    const payload = await request;
    clearTimeout(timeout);
    await sleep(350);
    setRunProgress(100);
    setDemoResult(normalizeDemoResult(payload));
    setRunPhase(payload ? "Live run complete" : "Reference replay complete");
    setIsRunning(false);
  };

  const currentRole = roleDetails[role];

  return (
    <div className="console-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <button className="brand" onClick={() => scrollTo("overview")} aria-label="EASAP overview">
          <span className="brand-mark" aria-hidden="true">EA</span>
          <span>
            <strong>EASAP</strong>
            <small>Assurance console</small>
          </span>
        </button>

        <div className="workspace-label">
          <span>Workspace</span>
          <strong>Northstar / Production</strong>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeNav === item.id ? "nav-item active" : "nav-item"}
              onClick={() => scrollTo(item.id)}
              aria-current={activeNav === item.id ? "page" : undefined}
            >
              <span>{item.code}</span>
              {item.label}
              {item.id === "findings" && <b>5</b>}
            </button>
          ))}
        </nav>

        <div className="side-integrity">
          <div className="integrity-heading">
            <span className="status-dot good" />
            Evidence integrity
          </div>
          <strong>Verified</strong>
          <p>All 18,442 sealed manifests match their content digests.</p>
          <span className="mono">verifier 1.8.3</span>
        </div>

        <div className="environment-pill">
          <span>STANDARD</span>
          <small>Synthetic · egress denied</small>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">EA</span>
            <strong>EASAP</strong>
          </div>
          <div className="topbar-context">
            <span>Release workspace</span>
            <strong>ProcureOps Agent · July candidate</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Open activity notifications">
              <span aria-hidden="true">●</span>
              <b>3</b>
            </button>
            <label className="role-select">
              <span className="avatar" aria-hidden="true">{currentRole.short}</span>
              <span className="role-copy">
                <small>Acting as</small>
                <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Active role">
                  {Object.keys(roleDetails).map((roleName) => (
                    <option key={roleName}>{roleName}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Section navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeNav === item.id ? "active" : ""}
              onClick={() => scrollTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section id="overview" className="page-section overview-section" aria-labelledby="overview-title">
          <div className="section-kicker-row">
            <span className="eyebrow">Release decision · RLS-2026-0715</span>
            <span className="last-refresh"><span className="status-dot good" /> Live · updated 38s ago</span>
          </div>

          <div className="overview-heading">
            <div>
              <h1 id="overview-title">Is ProcureOps v2.4.1 ready to receive authority?</h1>
              <p>
                Assurance evidence for the EU procurement operating envelope, evaluated against
                policy boundaries, dependency faults, and hostile supplier behavior.
              </p>
            </div>
            <button
              className="primary-action"
              onClick={runDemo}
              disabled={isRunning || !currentRole.canRun}
              title={!currentRole.canRun ? `${role} cannot execute campaigns` : undefined}
            >
              <span aria-hidden="true">▶</span>
              {isRunning ? "Campaign running…" : demoResult ? "Replay 24-trial demo" : "Run 24-trial demo"}
            </button>
          </div>

          <div className="role-context" role="status">
            <span className="avatar mini" aria-hidden="true">{currentRole.short}</span>
            <strong>{role}</strong>
            <span>{currentRole.permission}.</span>
            {!currentRole.canRun && <em>Execution controls are locked for this role.</em>}
          </div>

          <div className="decision-grid">
            <article className="decision-card">
              <div className="card-label-row">
                <span className="card-label">Release readiness</span>
                <span className="risk-badge hold">Hold</span>
              </div>
              <div className="readiness-score">
                <strong>78</strong><span>/100</span>
                <div>
                  <b>2 gates unresolved</b>
                  <p>Decision cannot be issued until one critical finding and coverage drift are resolved.</p>
                </div>
              </div>
              <div className="score-bar" aria-label="Release readiness: 78 percent">
                <span style={{ width: "78%" }} />
              </div>
              <div className="gate-list">
                <div><span className="gate-icon pass">✓</span><p><b>Policy integrity</b><small>99.1% · threshold 98.5%</small></p><strong>Pass</strong></div>
                <div><span className="gate-icon fail">!</span><p><b>Authority revocation</b><small>Critical failure in 24 / 24 seeds</small></p><strong>Block</strong></div>
                <div><span className="gate-icon warn">△</span><p><b>Operating-envelope coverage</b><small>91.8% · threshold 95.0%</small></p><strong>Gap</strong></div>
                <div><span className="gate-icon pass">✓</span><p><b>Evidence completeness</b><small>All manifests and traces sealed</small></p><strong>Pass</strong></div>
              </div>
              <button className="text-action" onClick={() => scrollTo("release-assurance")}>Inspect all 9 release gates <span>→</span></button>
            </article>

            <article className="campaign-card">
              <div className="card-label-row">
                <span className="card-label">Active campaign</span>
                <span className="live-badge"><span /> Running</span>
              </div>
              <div className="campaign-title">
                <div className="campaign-emblem" aria-hidden="true">Q3</div>
                <div>
                  <h2>Procurement boundary matrix</h2>
                  <p>CAM-0842 · Monte Carlo + adversarial co-play</p>
                </div>
              </div>
              <div className="campaign-progress-copy">
                <strong>1,847 <span>/ 2,400 trials</span></strong>
                <span>77% complete</span>
              </div>
              <div className="campaign-progress" aria-label="Campaign 77 percent complete"><span /></div>
              <div className="campaign-stats">
                <div><span>Pass rate</span><strong>96.8%</strong><small>−0.9 vs v2.4.0</small></div>
                <div><span>New findings</span><strong>3</strong><small>1 release-blocking</small></div>
                <div><span>Projected finish</span><strong>18m</strong><small>42 workers active</small></div>
              </div>
              <div className="activity-stream">
                <div><span className="status-dot critical" /><p><b>FND-2147 detected</b><small>Delegate revocation · seed 9f2c</small></p><time>1m</time></div>
                <div><span className="status-dot good" /><p><b>ERP timeout stratum complete</b><small>384 trials · 97.9% passed</small></p><time>4m</time></div>
                <div><span className="status-dot neutral" /><p><b>Counterfactual branch started</b><small>Bank-detail mutation · 96 seeds</small></p><time>6m</time></div>
              </div>
            </article>
          </div>

          <div className={`demo-run ${isRunning || demoResult ? "visible" : ""}`} aria-live="polite">
            <div className="demo-run-top">
              <div>
                <span className={isRunning ? "run-pulse" : "run-complete"} aria-hidden="true">{isRunning ? "" : "✓"}</span>
                <div><strong>{runPhase}</strong><small>{isRunning ? "Exact subject, world, suite, and seed set are pinned" : demoResult?.source === "live" ? "Returned by connected demo service" : "Deterministic fixture used because the demo service is unavailable"}</small></div>
              </div>
              <span className="mono">{runProgress}%</span>
            </div>
            <div className="demo-progress"><span style={{ width: `${runProgress}%` }} /></div>
            {demoResult && (
              <div className="demo-result-grid">
                <div><span>Run</span><strong>{demoResult.runId}</strong></div>
                <div><span>Trials passed</span><strong>{demoResult.passed} / {demoResult.trials}</strong></div>
                <div><span>Findings</span><strong>{demoResult.findings}</strong></div>
                <div><span>Posture</span><strong>{demoResult.posture}</strong></div>
                <div><span>Duration</span><strong>{demoResult.duration}</strong></div>
                <div><span>Provenance</span><strong>{demoResult.source === "live" ? "API response" : "Signed fixture"}</strong></div>
              </div>
            )}
          </div>

          <div className="metric-strip" aria-label="Assurance summary">
            <div><span>Required suites</span><strong>7 / 9</strong><small>2 unresolved</small></div>
            <div><span>Envelope coverage</span><strong>91.8%</strong><small className="down">−3.2 below gate</small></div>
            <div><span>Seed coverage</span><strong>6,400</strong><small>100% declared set</small></div>
            <div><span>Evidence objects</span><strong>18,442</strong><small>100% digest verified</small></div>
            <div><span>Residual risk</span><strong>High</strong><small className="down">Owner review due</small></div>
          </div>
        </section>

        <section id="subjects" className="page-section" aria-labelledby="subjects-title">
          <SectionHeading
            eyebrow="Immutable evaluated configurations"
            title="Subjects"
            description="Every model, prompt, tool, policy, memory image, and runtime dependency is bound to a content digest."
            action="Register subject"
          />
          <div className="table-card">
            <div className="table-toolbar">
              <span>3 registered configurations</span>
              <span className="mono">Materiality policy · AP-PROC-05</span>
            </div>
            <div className="data-table subjects-table">
              <div className="data-row table-head"><span>Subject</span><span>Configuration</span><span>Assurance</span><span>Last evaluated</span><span /></div>
              <div className="data-row featured-row">
                <span className="subject-cell"><i>PO</i><span><b>ProcureOps Agent</b><small>subj_7f2a…91cd · candidate</small></span></span>
                <span><b>v2.4.1</b><small>GPT-5 · 14 tools · policy 5.0</small></span>
                <span><span className="risk-badge hold">Hold</span><small>2 gates unresolved</small></span>
                <span><b>Running now</b><small>CAM-0842</small></span>
                <button aria-label="Open ProcureOps Agent v2.4.1">→</button>
              </div>
              <div className="data-row">
                <span className="subject-cell"><i>PO</i><span><b>ProcureOps Agent</b><small>subj_1a44…e820 · production</small></span></span>
                <span><b>v2.4.0</b><small>GPT-5 · 13 tools · policy 4.8</small></span>
                <span><span className="risk-badge conditional">Conditional</span><small>Expires 30 Jul 2026</small></span>
                <span><b>12 Jul 2026</b><small>2,400 trials</small></span>
                <button aria-label="Open ProcureOps Agent v2.4.0">→</button>
              </div>
              <div className="data-row">
                <span className="subject-cell"><i>PO</i><span><b>ProcureOps Agent</b><small>subj_c901…0b73 · archived</small></span></span>
                <span><b>v2.3.7</b><small>GPT-4.1 · 11 tools · policy 4.6</small></span>
                <span><span className="risk-badge pass">Approved</span><small>Revoked by material change</small></span>
                <span><b>28 Jun 2026</b><small>1,920 trials</small></span>
                <button aria-label="Open ProcureOps Agent v2.3.7">→</button>
              </div>
            </div>
          </div>
        </section>

        <section id="scenarios" className="page-section" aria-labelledby="scenario-suites-title">
          <SectionHeading
            eyebrow="Typed, versioned, and reproducible"
            title="Scenario suites"
            description="Coverage spans declared operating conditions, dependency faults, policy boundaries, and independent adversaries."
            action="Author scenario"
          />
          <div className="scenario-grid">
            <ScenarioCard code="PB" title="Policy boundary" version="v3.2" coverage="98%" scenarios="42" tone="teal" tags={["SoD", "spend limits", "delegation"]} />
            <ScenarioCard code="DF" title="Dependency faults" version="v2.8" coverage="94%" scenarios="36" tone="blue" tags={["timeouts", "stale data", "partial response"]} />
            <ScenarioCard code="AS" title="Adversarial suppliers" version="v4.1" coverage="89%" scenarios="51" tone="amber" tags={["injection", "spoofing", "collusion"]} />
            <ScenarioCard code="RC" title="Recovery & compensation" version="v1.9" coverage="86%" scenarios="28" tone="violet" tags={["halt", "rollback", "resume"]} />
          </div>
        </section>

        <section id="campaigns" className="page-section" aria-labelledby="campaigns-title">
          <SectionHeading
            eyebrow="Bounded trial matrices"
            title="Campaigns"
            description="Deterministic replays, stochastic simulations, counterfactuals, and adversarial co-play across sealed configurations."
            action="New campaign"
          />
          <div className="campaign-list">
            <CampaignRow status="Running" title="Procurement boundary matrix" id="CAM-0842" mode="Monte Carlo + co-play" trials="1,847 / 2,400" findings="3" time="18m remaining" />
            <CampaignRow status="Complete" title="Material-change regression" id="CAM-0837" mode="Exact replay" trials="640 / 640" findings="0" time="Completed 14 Jul" />
            <CampaignRow status="Complete" title="Supplier identity red team" id="CAM-0819" mode="Adversarial co-play" trials="1,200 / 1,200" findings="6" time="Completed 12 Jul" />
            <CampaignRow status="Sealed" title="Production incident INC-8841" id="CAM-0798" mode="Privacy-reviewed replay" trials="96 / 96" findings="1" time="Sealed 08 Jul" />
          </div>
        </section>

        <section id="findings" className="page-section" aria-labelledby="findings-title">
          <SectionHeading
            eyebrow="Persistent failure records"
            title="Findings"
            description="Sealed findings remain traceable from release gate to minimal reproducer and causal event evidence."
          />
          <div className="findings-card">
            <div className="finding-controls">
              <div className="severity-filters" aria-label="Filter findings by severity">
                {(["All", "Critical", "High", "Medium", "Low"] as const).map((level) => (
                  <button key={level} className={severity === level ? "active" : ""} onClick={() => setSeverity(level)} aria-pressed={severity === level}>
                    {level}{level === "All" ? ` ${findings.length}` : ""}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search findings or scenarios" aria-label="Search findings" />
              </label>
            </div>
            <div className="finding-list">
              {filteredFindings.map((finding) => (
                <article className="finding-row" key={finding.id}>
                  <span className={`severity-marker ${finding.severity.toLowerCase()}`} />
                  <div className="finding-main">
                    <div><span className={`severity-text ${finding.severity.toLowerCase()}`}>{finding.severity}</span><span className="mono">{finding.id}</span><span className="state-tag">{finding.state}</span></div>
                    <h3>{finding.title}</h3>
                    <p>{finding.scenario}</p>
                  </div>
                  <div className="finding-meta"><span>Reproduces</span><b>{finding.reproduces}</b></div>
                  <div className="finding-meta"><span>Owner</span><b>{finding.owner}</b></div>
                  <button aria-label={`Open ${finding.id}`}>→</button>
                </article>
              ))}
              {filteredFindings.length === 0 && (
                <div className="empty-state"><strong>No matching findings</strong><span>Try another severity or search phrase.</span></div>
              )}
            </div>
          </div>
        </section>

        <section id="evidence" className="page-section" aria-labelledby="evidence-title">
          <SectionHeading
            eyebrow="Immutable verification package"
            title="Evidence"
            description="Harness-bound observations, causal traces, manifests, and signatures for independent verification."
            action="Export package"
          />
          <div className="evidence-grid">
            <article className="evidence-card">
              <div className="card-label-row"><span className="card-label">Evidence chain</span><span className="risk-badge pass">Verified</span></div>
              <div className="evidence-chain">
                <EvidenceNode name="Subject manifest" detail="subj_7f2a…91cd" count="1" />
                <EvidenceNode name="Scenario manifests" detail="4 suites · 157 scenarios" count="157" />
                <EvidenceNode name="Trial manifests" detail="6,400 declared seeds" count="6.4k" />
                <EvidenceNode name="Observations & traces" detail="Harness-visible causal events" count="11.8k" />
                <EvidenceNode name="Oracle decisions" detail="Versioned, calibrated, appealable" count="84" />
              </div>
            </article>
            <article className="coverage-card">
              <div className="card-label-row"><span className="card-label">Operating-envelope coverage</span><span className="mono">91.8%</span></div>
              <div className="coverage-rings" aria-label="Coverage by dimension">
                <CoverageRow label="Authority states" value={96} detail="24 / 25 partitions" />
                <CoverageRow label="Dependency degradation" value={94} detail="47 / 50 partitions" />
                <CoverageRow label="Supplier behaviors" value={89} detail="41 / 46 partitions" />
                <CoverageRow label="Recovery paths" value={86} detail="19 / 22 partitions" />
                <CoverageRow label="Spend bands" value={100} detail="8 / 8 partitions" />
              </div>
              <div className="coverage-gap"><span>!</span><p><b>Coverage gap requires disposition</b><small>Three recovery partitions are uncovered after connector runtime 3.6.0 changed retry semantics.</small></p></div>
            </article>
          </div>
        </section>

        <section id="release-assurance" className="page-section" aria-labelledby="release-assurance-title">
          <SectionHeading
            eyebrow="Bound to exact subject and suite versions"
            title="Release assurance"
            description="The release authority receives the gate evidence, residual-risk record, deployment constraints, expiry, and revocation status."
          />
          <div className="release-layout">
            <article className="release-certificate">
              <div className="certificate-top">
                <div><span className="certificate-mark">E</span><div><small>Assurance decision draft</small><strong>RLS-2026-0715</strong></div></div>
                <span className="risk-badge hold">Decision blocked</span>
              </div>
              <h3>ProcureOps Agent v2.4.1</h3>
              <p>EU procurement operating envelope · Assurance Profile AP-PROC-05 v5.0</p>
              <div className="certificate-facts">
                <div><span>Subject digest</span><strong className="mono">sha256:7f2a…91cd</strong></div>
                <div><span>Isolation</span><strong>STANDARD</strong></div>
                <div><span>Required suites</span><strong>7 of 9 passed</strong></div>
                <div><span>Decision expiry</span><strong>30 days after issue</strong></div>
              </div>
              <div className="decision-callout"><span>!</span><div><strong>Not ready for authority</strong><p>Resolve FND-2147 and restore coverage above 95% before requesting a release decision.</p></div></div>
              <div className="certificate-actions">
                <button className="primary-action" disabled={role !== "Release authority"}>Issue decision</button>
                <button className="secondary-action">Export draft evidence</button>
              </div>
              {role !== "Release authority" && <small className="authority-note">Switch to Release authority to issue the final decision.</small>}
            </article>
            <aside className="release-side">
              <article>
                <span className="card-label">Candidate deployment constraints</span>
                <ul className="constraint-list">
                  <li><span>01</span><p><b>Human approval required</b><small>All bank-detail changes and purchases above €25,000</small></p></li>
                  <li><span>02</span><p><b>Connector scope restricted</b><small>ERP write access limited to approved EU business units</small></p></li>
                  <li><span>03</span><p><b>Fail closed on authority drift</b><small>Halt when delegate status cannot be verified within 2 seconds</small></p></li>
                </ul>
              </article>
              <article className="approval-history">
                <span className="card-label">Separation of duties</span>
                <div><span className="avatar mini">AO</span><p><b>Maya Chen</b><small>Assurance owner · prepared</small></p><time>15 Jul</time></div>
                <div><span className="avatar mini muted">RA</span><p><b>Release authority</b><small>Independent approval required</small></p><time>Pending</time></div>
              </article>
            </aside>
          </div>
        </section>

        <footer>
          <span>EASAP · Enterprise Agent Simulation and Assurance Platform</span>
          <span>STANDARD reference workspace · Synthetic data only</span>
        </footer>
      </main>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: string }) {
  return (
    <div className="section-heading">
      <div><span className="eyebrow">{eyebrow}</span><h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-title`}>{title}</h2><p>{description}</p></div>
      {action && <button className="secondary-action">＋ {action}</button>}
    </div>
  );
}

function ScenarioCard({ code, title, version, coverage, scenarios, tone, tags }: { code: string; title: string; version: string; coverage: string; scenarios: string; tone: string; tags: string[] }) {
  return (
    <article className={`scenario-card ${tone}`}>
      <div><span className="scenario-code">{code}</span><span className="risk-badge pass">Validated</span></div>
      <h3>{title}</h3>
      <p>{version} · sealed 14 Jul 2026</p>
      <div className="scenario-metrics"><span><b>{scenarios}</b><small>Scenarios</small></span><span><b>{coverage}</b><small>Coverage</small></span></div>
      <div className="tag-row">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <button>Inspect suite <span>→</span></button>
    </article>
  );
}

function CampaignRow({ status, title, id, mode, trials, findings: findingCount, time }: { status: string; title: string; id: string; mode: string; trials: string; findings: string; time: string }) {
  return (
    <article className="campaign-row">
      <span className={`campaign-status ${status.toLowerCase()}`}><i />{status}</span>
      <div><h3>{title}</h3><p>{id} · {mode}</p></div>
      <div><span>Trials</span><strong>{trials}</strong></div>
      <div><span>Findings</span><strong>{findingCount}</strong></div>
      <div><span>Timing</span><strong>{time}</strong></div>
      <button aria-label={`Open ${title}`}>→</button>
    </article>
  );
}

function EvidenceNode({ name, detail, count }: { name: string; detail: string; count: string }) {
  return (
    <div className="evidence-node"><span className="node-check">✓</span><p><b>{name}</b><small>{detail}</small></p><strong>{count}</strong></div>
  );
}

function CoverageRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="coverage-row">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="coverage-bar"><span style={{ width: `${value}%` }} /></div>
      <small>{detail}</small>
    </div>
  );
}
