import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-shell";

const github = "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform";

export const metadata: Metadata = {
  title: "Developer tools | EASAP",
  description: "Run EASAP with one npx command, integrate the zero-dependency JavaScript client, or add the EASAP Developer plugin to Codex.",
};

const commands = [
  ["RUN", "npx @mlmrx/easap", "Execute the hosted STANDARD-reference campaign and save its complete JSON evidence."],
  ["PLAN", "npx @mlmrx/easap init", "Create a readiness input, then turn authority and exposure into an assignable assurance plan."],
  ["CHECK", "npx @mlmrx/easap check <https-url> --name <name> --authorized", "Verify control of a public agent and run four bounded read-only black-box probes."],
] as const;

export default function DevelopersPage() {
  return (
    <>
      <SiteHeader />
      <main className="developer-page">
        <section className="developer-hero">
          <div className="developer-hero-copy">
            <span className="section-label"><i /> Open developer tools · Apache-2.0</span>
            <h1>From one command<br />to <em>inspectable evidence.</em></h1>
            <p>Run the real EASAP reference engine, automate readiness planning, connect an authorized public agent, or embed the client in your delivery workflow.</p>
            <div className="developer-actions">
              <a className="button button-dark" href={`${github}/releases/tag/easap-cli-v0.1.0`} target="_blank" rel="noreferrer">Download v0.1.0 <span>↗</span></a>
              <a className="button button-outline" href={`${github}/tree/main/packages/easap`} target="_blank" rel="noreferrer">View source</a>
            </div>
          </div>
          <div className="developer-terminal" aria-label="EASAP command line example">
            <div><span /><span /><span /><small>easap / terminal</small></div>
            <pre><code><b>$</b> npx @mlmrx/easap{"\n\n"}<span>EASAP STANDARD-reference campaign</span>{"\n\n"}Decision           CONDITIONAL{"\n"}Trials             12{"\n"}Evidence integrity verified{"\n"}Certificate        reference fixture{"\n"}Saved              ./easap-evidence.json</code></pre>
            <p>Reference evidence—not production certification.</p>
          </div>
        </section>

        <section className="developer-commands">
          <div className="developer-section-head">
            <span className="section-label">One package · three entry points</span>
            <h2>Start where your evidence gap is.</h2>
          </div>
          <div className="command-grid">
            {commands.map(([label, command, description], index) => (
              <article key={label}>
                <small>0{index + 1} · {label}</small>
                <code>{command}</code>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="developer-sdk">
          <div>
            <span className="section-label light">JavaScript client</span>
            <h2>Use the same contract in CI, release gates, and internal tooling.</h2>
            <p>The zero-dependency client exposes the campaign, readiness, registration, verification, probe, and service-diagnostic APIs. Point it at EASAP Cloud or an approved self-hosted runtime.</p>
            <ul>
              <li><span>01</span> No runtime dependencies</li>
              <li><span>02</span> Node.js 22.13+</li>
              <li><span>03</span> Typed, explicit evidence boundaries</li>
            </ul>
          </div>
          <pre><code><span>import</span> {`{ createClient }`} <span>from</span> <b>&quot;@mlmrx/easap&quot;</b>;{"\n\n"}<span>const</span> easap = createClient();{"\n"}<span>const</span> campaign = <span>await</span> easap.runDemo({`{ trialCount: 12 }`});{"\n\n"}console.log(campaign.data.decision.posture);</code></pre>
        </section>

        <section className="developer-plugin">
          <div>
            <span className="section-label">Codex plugin</span>
            <h2>EASAP Developer</h2>
            <p>Give Codex the evidence discipline and correct workflow boundaries for reference campaigns, readiness plans, and authorized public-agent checks.</p>
          </div>
          <div className="plugin-contract">
            <span>INCLUDED WORKFLOWS</span>
            <strong>Run · Plan · Check · Review</strong>
            <p>Private, authenticated, browser-only, or internal agents stay inside a self-hosted enterprise boundary.</p>
            <a href={`${github}/tree/main/plugins/easap-developer`} target="_blank" rel="noreferrer">Inspect the plugin source <b>↗</b></a>
          </div>
        </section>

        <section className="developer-boundary">
          <div><span>PUBLIC HOSTED PATH</span><strong>Authorized public HTTPS JSON agents</strong><p>Ownership challenge, SSRF defenses, four bounded probes, and observed-response evidence.</p></div>
          <div><span>ENTERPRISE PATH</span><strong>Private and authenticated agents</strong><p>Deploy EASAP beside the agent, credentials, policies, and production evidence stores.</p></div>
          <div><span>EVIDENCE CLAIM</span><strong>Scoped, reproducible, inspectable</strong><p>No command or plugin turns a reference result into general safety certification.</p></div>
        </section>

        <section className="developer-next">
          <div><span className="section-label">Need the product first?</span><h2>Map the agent’s authority before you test it.</h2></div>
          <div><Link className="button button-dark" href="/assess">Build a readiness plan</Link><Link className="text-link" href="/connect">Connect a public agent <span>↗</span></Link></div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
