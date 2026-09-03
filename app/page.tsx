import Link from "next/link";
import localLatestNews from "@/content/news/latest.json";
import { articles } from "@/lib/content/editorial";
import { publishedContent } from "@/lib/content/runtime";
import { LiveProof } from "./components/live-proof";
import { SiteFooter, SiteHeader } from "./components/site-shell";
import { SystemVisual } from "./components/system-visual";

const github = "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform";

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
            <h1>Ship agents with<br /><em>evidence, not optimism.</em></h1>
            <p>EASAP runs the complete agent system through realistic worlds, hostile conditions, policy boundaries, and repeatable failure modes—before it receives consequential authority.</p>
            <div className="hero-actions">
              <Link className="button button-accent button-large" href="/platform">Run the live assurance campaign <span>↗</span></Link>
              <a className="button button-outline button-large" href={github} target="_blank" rel="noreferrer">View source on GitHub</a>
            </div>
            <div className="hero-proof">
              <div><strong>20</strong><span>acceptance tests<br />running in CI</span></div>
              <div><strong>100%</strong><span>open and<br />self-hostable</span></div>
              <div><strong>0</strong><span>proprietary host<br />runtime bindings</span></div>
            </div>
          </div>
          <SystemVisual />
          <div className="hero-stamp"><span>STANDARD</span><small>Executable reference<br />implementation</small></div>
        </section>

        <section className="trust-strip" aria-label="Platform principles">
          <span>Built for release authorities, security teams, and agent engineers</span>
          <div><i /> Exact replay</div><div><i /> Fail-closed effects</div><div><i /> Statistical uncertainty</div><div><i /> Signed evidence</div>
        </section>

        <section className="narrative-section" id="system">
          <div className="narrative-heading">
            <span className="section-label">The missing control plane</span>
            <h2>A benchmark tells you how a model scored.<br /><em>Assurance tells you what the system may do.</em></h2>
          </div>
          <div className="comparison-grid">
            <article className="comparison-card dimmed">
              <span className="comparison-index">MODEL EVAL</span>
              <h3>“It scored 92%.”</h3>
              <ul><li>Abstract model behavior</li><li>Average score</li><li>Prompt and response</li><li>Report for humans</li></ul>
              <small>Useful signal. Insufficient release authority.</small>
            </article>
            <div className="comparison-arrow"><span>→</span><small>system boundary</small></div>
            <article className="comparison-card active-card">
              <span className="comparison-index">EASAP DECISION</span>
              <h3>“This exact system is conditional.”</h3>
              <ul><li>Model + prompts + tools + memory + policy</li><li>Distribution, confidence, and tail risk</li><li>World state, faults, effects, and causal trace</li><li>Machine-enforceable certificate</li></ul>
              <small>Bound to exact digests, conditions, expiry, and revocation.</small>
            </article>
          </div>
        </section>

        <section className="planes-section">
          <div className="planes-intro">
            <span className="section-label light">Six connected planes</span>
            <h2>One evidence chain from candidate to release gate.</h2>
            <p>Every plane has a narrow contract. The UI is optional; the sealed bundles and verification artifacts are portable.</p>
            <a href={`${github}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer" className="text-link light-link">Read the architecture <span>↗</span></a>
          </div>
          <div className="planes-grid">
            {controlPlanes.map(([title, copy], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title} plane</h3><p>{copy}</p><i /></article>
            ))}
          </div>
        </section>

        <section className="proof-section">
          <div className="section-heading-wide">
            <div><span className="section-label"><i /> Live product proof</span><h2>Don’t take the diagram’s word for it.</h2></div>
            <p>The public runner invokes the same deterministic campaign, evidence, signing, and release-decision code covered by the repository’s acceptance tests.</p>
          </div>
          <LiveProof compact />
        </section>

        <section className="use-cases-section">
          <div className="narrative-heading left-heading">
            <span className="section-label">Designed for consequential authority</span>
            <h2>Find the failure boundary before production does.</h2>
          </div>
          <div className="use-case-grid">
            <article><span>01 / Financial operations</span><h3>Can the agent resist a poisoned payment instruction during an approval outage?</h3><p>Compose supplier spoofing, stale ERP data, permission loss, and retry behavior in one reproducible scenario.</p></article>
            <article><span>02 / Identity & access</span><h3>Does revoked authority remain revoked across memory, tokens, and tool sessions?</h3><p>Probe credential refresh, delegated access, cached permissions, and fail-closed behavior at every boundary.</p></article>
            <article><span>03 / Production operations</span><h3>What happens when a recovery agent’s dependency view is incomplete?</h3><p>Explore counterfactual actions, containment time, residual state, and required human intervention before granting write access.</p></article>
          </div>
        </section>

        <section className="intelligence-section">
          <div className="section-heading-wide">
            <div><span className="section-label">Assurance intelligence</span><h2>Technical depth, every day.</h2></div>
            <p>Original operator guidance plus a source-linked watch desk. The publishing pipeline records provenance and refuses to invent news when source retrieval fails.</p>
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
          <span className="section-label light"><i /> Open reference platform</span>
          <h2>Before an agent can act,<br />make it prove how it behaves.</h2>
          <p>Run the campaign, inspect the evidence, and take the architecture to your preferred environment.</p>
          <div className="hero-actions centered-actions"><Link className="button button-light button-large" href="/platform">Launch the live workbench</Link><a className="button button-ghost button-large" href={github} target="_blank" rel="noreferrer">Fork on GitHub ↗</a></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
