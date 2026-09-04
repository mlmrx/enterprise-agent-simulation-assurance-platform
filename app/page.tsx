import Link from "next/link";
import localLatestNews from "@/content/news/latest.json";
import { articles } from "@/lib/content/editorial";
import { publishedContent } from "@/lib/content/runtime";
import { LiveProof } from "./components/live-proof";
import { SiteFooter, SiteHeader } from "./components/site-shell";
import { SystemVisual } from "./components/system-visual";

const github = "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform";

const assuranceSteps = [
  {
    number: "01",
    title: "Bind the exact candidate",
    copy: "Pin the model, prompts, tools, memory, policies, and dependencies to immutable digests. The decision applies to one exact system—not a vague version label.",
    output: "Candidate manifest",
  },
  {
    number: "02",
    title: "Run controlled worlds",
    copy: "Exercise normal, degraded, and adversarial conditions with seeded state, injected faults, real policy boundaries, and mediated tool effects.",
    output: "Reproducible trials",
  },
  {
    number: "03",
    title: "Measure what matters",
    copy: "Independent oracles score safety, policy compliance, task success, recovery, and tail risk—with uncertainty made visible instead of averaged away.",
    output: "Assurance findings",
  },
  {
    number: "04",
    title: "Issue a release posture",
    copy: "Convert evidence into APPROVED, CONDITIONAL, or REJECTED, with deployment conditions, expiry, revocation triggers, and a portable evidence bundle.",
    output: "Decision + evidence",
  },
];

const outcomes = [
  ["Faster release review", "Give security, risk, and product one decision artifact instead of weeks of screenshots, spreadsheets, and competing interpretations."],
  ["Lower incident exposure", "Discover unsafe tool use, privilege drift, data leakage, and brittle recovery before the agent reaches customers or production systems."],
  ["Defensible governance", "Show what was tested, against which policy, with which candidate, and why a release decision was made."],
  ["Continuous regression control", "Re-run the same evidence-backed gate whenever a model, prompt, tool, policy, or dependency changes."],
];

const audiences = [
  ["AI platform & engineering", "Prove that the integrated agent—not only the underlying model—behaves within its intended operating boundary."],
  ["Security & red teams", "Turn adversarial findings into repeatable scenarios, minimized failures, and enforceable release criteria."],
  ["Risk, governance & audit", "Review traceable evidence, explicit uncertainty, approvals, conditions, expiry, and revocation in one chain."],
  ["Product & release leaders", "Make a clear ship, constrain, or stop decision without translating a stack of disconnected technical scores."],
];

const companyProfiles = [
  {
    type: "Regulated operators",
    examples: "Financial services · Healthcare · Insurance · Public sector",
    reason: "Agents touch protected data, regulated decisions, or workflows where due diligence must be demonstrated—not merely asserted.",
  },
  {
    type: "High-volume digital businesses",
    examples: "Commerce · Marketplaces · Telecom · Enterprise SaaS",
    reason: "A small failure rate can become thousands of customer-impacting actions when agents operate at scale.",
  },
  {
    type: "Critical operations",
    examples: "Energy · Manufacturing · Logistics · Infrastructure",
    reason: "Agent actions can affect uptime, physical processes, access control, and incident recovery under incomplete information.",
  },
  {
    type: "AI vendors & integrators",
    examples: "Agent platforms · Model providers · Consultancies · System integrators",
    reason: "Enterprise buyers need portable assurance evidence tied to the exact system they are being asked to trust.",
  },
];

const controlPlanes = [
  ["World", "Versioned enterprise state, actors, resources, clocks, and uncertainty."],
  ["Scenario", "Typed events, invariants, faults, adversaries, and termination rules."],
  ["Execution", "Seeded harness, capability mediation, protocol emulation, and replay."],
  ["Evaluation", "Independent oracles, causal traces, uncertainty, and failure minimization."],
  ["Evidence", "Content-addressed manifests, signatures, approvals, and verification exports."],
  ["Assurance", "Threshold gates, residual risk, deployment conditions, expiry, and revocation."],
];

export const revalidate = 900;

export default async function Home() {
  const latestNews = await publishedContent("news/latest.json", localLatestNews);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="hero-copy">
            <span className="section-label"><i /> Enterprise agent release assurance</span>
            <h1>Know what your AI agent will do <em>before you let it act.</em></h1>
            <p>EASAP stress-tests the exact agent system—model, prompts, tools, memory, and policy—in reproducible enterprise scenarios, then turns the results into a release decision and verifiable evidence.</p>
            <div className="hero-actions">
              <Link className="button button-accent button-large" href="/platform">Run a real assurance campaign <span>↗</span></Link>
              <a className="button button-outline button-large" href="#how-it-works">See how it works <span>↓</span></a>
            </div>
            <div className="hero-proof" aria-label="Core platform outcomes">
              <div><strong>Test</strong><span>the whole<br />agent system</span></div>
              <div><strong>Prove</strong><span>failures with<br />exact replay</span></div>
              <div><strong>Decide</strong><span>release with<br />signed evidence</span></div>
            </div>
          </div>
          <SystemVisual />
          <div className="hero-stamp"><span>VERIFIABLE</span><small>Open reference platform<br />No proprietary host binding</small></div>
        </section>

        <section className="trust-strip" aria-label="Assurance principles">
          <span>Built for systems entrusted with consequential authority</span>
          <div><i /> Exact replay</div><div><i /> Fail-closed effects</div><div><i /> Statistical uncertainty</div><div><i /> Signed evidence</div>
        </section>

        <section className="stakes-section" id="why-care">
          <div className="stakes-copy">
            <span className="section-label">Why you should care</span>
            <h2>An agent does not just answer. <em>It acts.</em></h2>
            <p>Once an AI system can call tools, access private data, change records, move money, or represent your company, a good demo is no longer evidence of safe operation.</p>
            <div className="authority-callout">
              <span>THE ASSURANCE TRIGGER</span>
              <strong>If an agent can create a consequence, it needs a release boundary.</strong>
            </div>
          </div>
          <div className="risk-ledger" aria-label="Risk and assurance comparison">
            <div className="ledger-head"><span>Typical release process</span><span>EASAP assurance</span></div>
            <div><span>Model score in isolation</span><strong>Whole-system behavior</strong></div>
            <div><span>Happy-path demonstration</span><strong>Faults + adversaries + edge cases</strong></div>
            <div><span>Screenshot of a failure</span><strong>Deterministic replay</strong></div>
            <div><span>Subjective launch debate</span><strong>Explicit release posture</strong></div>
            <div><span>Evidence scattered across tools</span><strong>Sealed, portable evidence chain</strong></div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading-wide">
            <div><span className="section-label"><i /> How it works</span><h2>From candidate to release decision in one evidence chain.</h2></div>
            <p>EASAP evaluates the deployed system boundary and preserves enough context to explain, replay, and govern every material result.</p>
          </div>
          <div className="assurance-steps">
            {assuranceSteps.map((step) => (
              <article key={step.number}>
                <div><span>{step.number}</span><i /></div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <small>OUTPUT</small>
                <strong>{step.output}</strong>
              </article>
            ))}
          </div>
          <div className="workflow-boundary"><span>Candidate boundary</span><i /><span>Controlled execution</span><i /><span>Release authority</span></div>
        </section>

        <section className="value-section" id="value">
          <div className="value-intro">
            <span className="section-label light">What value you get</span>
            <h2>Move from “we tested it” to “we can prove why it should ship.”</h2>
            <p>The product is not another leaderboard. It is shared infrastructure for engineering velocity, operational safety, and defensible governance.</p>
            <Link href="/platform" className="text-link light-link">See the evidence produced by a live run <span>↗</span></Link>
          </div>
          <div className="outcome-grid">
            {outcomes.map(([title, copy], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
        </section>

        <section className="proof-section">
          <div className="section-heading-wide">
            <div><span className="section-label"><i /> Live product proof</span><h2>Run the assurance chain yourself.</h2></div>
            <p>This is not a scripted animation. The public runner invokes the deterministic campaign, scoring, evidence, signing, and release-decision code covered by the repository’s tests.</p>
          </div>
          <LiveProof compact />
        </section>

        <section className="audience-section" id="who-its-for">
          <div className="audience-heading">
            <span className="section-label">Who it is built for</span>
            <h2>One assurance language across teams that rarely share one.</h2>
            <p>Engineering can move faster because security, risk, and release authorities can inspect the same evidence without flattening it into a single opaque score.</p>
          </div>
          <div className="audience-grid">
            {audiences.map(([title, copy], index) => (
              <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>
            ))}
          </div>
        </section>

        <section className="company-section">
          <div className="company-lead">
            <span className="section-label light">Which companies benefit</span>
            <h2>Built for organizations where agent failure becomes business risk.</h2>
            <p>The strongest fit is not determined by company size. It is determined by the authority the agent receives and the cost of being wrong.</p>
            <div className="fit-rule"><span>BEST-FIT SIGNAL</span><strong>Your agent can write, transact, decide, access private data, or operate without immediate human review.</strong></div>
          </div>
          <div className="company-grid">
            {companyProfiles.map((profile) => (
              <article key={profile.type}><h3>{profile.type}</h3><small>{profile.examples}</small><p>{profile.reason}</p></article>
            ))}
          </div>
        </section>

        <section className="use-cases-section">
          <div className="narrative-heading left-heading">
            <span className="section-label">Where assurance becomes tangible</span>
            <h2>Find the failure boundary before production does.</h2>
          </div>
          <div className="use-case-grid">
            <article><span>01 / Financial operations</span><h3>Can the agent resist a poisoned payment instruction during an approval outage?</h3><p>Compose supplier spoofing, stale ERP data, permission loss, and retry behavior in one reproducible scenario.</p></article>
            <article><span>02 / Identity & access</span><h3>Does revoked authority remain revoked across memory, tokens, and tool sessions?</h3><p>Probe credential refresh, delegated access, cached permissions, and fail-closed behavior at every boundary.</p></article>
            <article><span>03 / Production operations</span><h3>What happens when a recovery agent’s dependency view is incomplete?</h3><p>Explore counterfactual actions, containment time, residual state, and required human intervention before granting write access.</p></article>
          </div>
        </section>

        <section className="planes-section" id="system">
          <div className="planes-intro">
            <span className="section-label light">The assurance architecture</span>
            <h2>Six connected planes. One inspectable decision.</h2>
            <p>Every plane has a narrow contract. The interface is optional; sealed bundles and verification artifacts remain portable.</p>
            <a href={`${github}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer" className="text-link light-link">Read the architecture <span>↗</span></a>
          </div>
          <div className="planes-grid">
            {controlPlanes.map(([title, copy], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title} plane</h3><p>{copy}</p><i /></article>
            ))}
          </div>
        </section>

        <section className="intelligence-section">
          <div className="section-heading-wide">
            <div><span className="section-label">Assurance intelligence</span><h2>Keep the control system current.</h2></div>
            <p>Original operator guidance plus a daily primary-source watch desk. The pipeline records provenance and refuses to invent news when source retrieval fails.</p>
          </div>
          <div className="intelligence-grid">
            <div className="article-stack">
              {articles.slice(0, 3).map((article, index) => (
                <Link href={`/insights/${article.slug}`} key={article.slug} className="article-row">
                  <span>{String(index + 1).padStart(2, "0")}</span><div><small>{article.category} · {article.readingMinutes} min</small><h3>{article.title}</h3><p>{article.dek}</p></div><i>↗</i>
                </Link>
              ))}
            </div>
            <aside className="news-preview">
              <div><span className="proof-live"><i /> Daily source desk</span><Link href="/news">All intelligence →</Link></div>
              {latestNews.items.slice(0, 3).map((item) => (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer"><small>{item.source} · {item.publishedAt}</small><strong>{item.title}</strong><span>{item.signal}</span></a>
              ))}
            </aside>
          </div>
        </section>

        <section className="final-cta">
          <div className="cta-rings"><i /><i /><i /></div>
          <span className="section-label light"><i /> Evidence before authority</span>
          <h2>Your agent is asking for access.<br />Make it earn trust first.</h2>
          <p>Run the public campaign, inspect every artifact, then take the open architecture into your preferred environment.</p>
          <div className="hero-actions centered-actions"><Link className="button button-light button-large" href="/platform">Run the live campaign</Link><a className="button button-ghost button-large" href={github} target="_blank" rel="noreferrer">View source on GitHub ↗</a></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
