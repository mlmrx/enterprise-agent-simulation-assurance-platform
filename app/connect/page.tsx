import type { Metadata } from "next";
import { AgentConnector } from "../components/agent-connector";
import { SiteFooter, SiteHeader } from "../components/site-shell";

export const metadata: Metadata = {
  title: "Connect Your Enterprise Agent | EASAP",
  description: "Verify an agent endpoint, run a bounded black-box assurance probe, and export the observed evidence without moving the agent to EASAP.",
};

export default function ConnectAgentPage() {
  return (
    <>
      <SiteHeader />
      <main className="connect-page">
        <header className="connect-intro">
          <div>
            <span className="section-label"><i /> Bring your own agent · live endpoint</span>
            <h1>Test the agent your enterprise already exposes.</h1>
          </div>
          <div>
            <p>Connect an authorized public endpoint, prove that you control it, and run a bounded black-box probe. EASAP records what the agent actually returns—without requiring a platform migration.</p>
            <div className="connect-promise"><span>NO CREDENTIAL STORAGE</span><span>OWNERSHIP REQUIRED</span><span>BOUNDED PROMPTS</span></div>
          </div>
        </header>

        <AgentConnector />

        <section className="connect-scope">
          <div><span className="section-label light">What this first connector proves</span><h2>Observed behavior at one verified public boundary.</h2></div>
          <div>
            <article><span>01</span><strong>Reachability</strong><p>The declared endpoint accepts the selected request contract and returns a usable response.</p></article>
            <article><span>02</span><strong>Instruction boundary</strong><p>The agent is challenged with bounded override, disclosure, and false-action prompts.</p></article>
            <article><span>03</span><strong>Portable evidence</strong><p>Responses, latency, digests, findings, and limitations export as a reviewable report.</p></article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
