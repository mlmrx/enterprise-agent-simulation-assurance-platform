import type { Metadata } from "next";
import Link from "next/link";
import { LiveProof } from "../components/live-proof";
import { SiteFooter, SiteHeader } from "../components/site-shell";

export const metadata: Metadata = {
  title: "Live assurance workbench | EASAP",
  description: "Execute a real seeded agent-assurance campaign and inspect the resulting decision and evidence package.",
};

const manifest = [
  ["Subject", "ProcureOps Agent v2.4.1", "model · prompts · 6 tools · policy · runtime"],
  ["World", "Northstar procurement EU", "vendors · approvals · budgets · virtual clock"],
  ["Scenario", "Authority boundary matrix", "stale data · timeout · permission loss · injection"],
  ["Profile", "STANDARD procurement v5", "reliability · policy · robustness · coverage"],
];

export default function PlatformPage() {
  return (
    <>
      <SiteHeader />
      <main className="workbench-page">
        <div className="utility-banner"><span>Testing your own agent?</span><strong>Start with the readiness planner to generate its required controls and scenario pack.</strong><Link href="/assess">Assess your agent →</Link></div>
        <section className="workbench-hero">
          <div>
            <span className="section-label"><i /> Public execution cell</span>
            <h1>Run the assurance chain.<br /><em>Inspect what comes out.</em></h1>
            <p>This is the actual open-source STANDARD reference engine—not a video, static dashboard, or generated fixture. The campaign uses synthetic procurement data and cannot reach external tools.</p>
          </div>
          <aside>
            <span>Environment boundary</span>
            <strong>STANDARD / SYNTHETIC</strong>
            <p>Fixed scenario · bounded seeds · denied egress · reference key</p>
          </aside>
        </section>

        <section className="manifest-strip" aria-label="Sealed input manifests">
          {manifest.map(([label, value, detail], index) => (
            <article key={label}><span>{String(index + 1).padStart(2, "0")} · {label}</span><strong>{value}</strong><small>{detail}</small></article>
          ))}
        </section>

        <LiveProof />

        <section className="workbench-explainer">
          <div>
            <span className="section-label">Evidence semantics</span>
            <h2>What this run proves—and what it does not.</h2>
          </div>
          <div className="explainer-grid">
            <article><span className="positive">PROVES</span><p>The exact sealed inputs produce harness-visible traces, measures, findings, and digests that can be replayed and independently verified.</p></article>
            <article><span className="positive">PROVES</span><p>Undeclared capabilities fail closed in the reference harness; statistical results include sample size, distribution, seed coverage, and uncertainty.</p></article>
            <article><span className="boundary">BOUNDARY</span><p>STANDARD reference isolation is not a microVM, HSM trust root, or claim of HIGH-RISK production conformance.</p></article>
            <article><span className="boundary">BOUNDARY</span><p>Passing simulation does not prove universal safety. A decision applies only to its subject digest, suites, operating envelope, conditions, and expiry.</p></article>
          </div>
          <div className="workbench-links"><Link className="button button-dark" href="/insights/the-release-artifact-enterprise-agents-are-missing">Understand release certificates</Link><a className="text-link" href="https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform/blob/main/docs/spec-traceability.md" target="_blank" rel="noreferrer">See specification traceability ↗</a></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
