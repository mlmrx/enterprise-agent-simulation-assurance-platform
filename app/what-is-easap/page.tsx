import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-shell";

export const metadata: Metadata = {
  title: "What is EASAP? | Enterprise Agent Assurance",
  description: "Understand EASAP: open assurance infrastructure for testing consequential AI agents and turning evidence into bounded release decisions.",
};

const proofLayers = [
  ["System", "The exact model, prompts, tools, memory, policy, connectors, and runtime are treated as one candidate."],
  ["Simulation", "Seeded worlds and typed scenarios create realistic normal, degraded, and adversarial operating conditions."],
  ["Evidence", "Traces, findings, uncertainty, signatures, and digests make results inspectable and replayable."],
  ["Authority", "A release posture names what can ship, under which conditions, for how long, and what revokes it."],
];

const distinctions = [
  ["Model benchmark", "Measures model behavior in a test set", "EASAP evaluates the integrated system and its effects"],
  ["Observability", "Shows what happened in production", "EASAP finds and replays failures before production"],
  ["Checklist", "Records whether someone said a control exists", "EASAP binds controls to evidence, owners, and gates"],
  ["Certification", "Makes a broad external conformance claim", "EASAP provides bounded evidence for accountable decisions"],
];

export default function WhatIsEasapPage() {
  return (
    <>
      <SiteHeader />
      <main className="what-page">
        <section className="what-hero">
          <div>
            <span className="section-label light"><i /> What is EASAP?</span>
            <h1>The evidence-backed boundary between an AI agent and the authority you give it.</h1>
          </div>
          <div>
            <p>EASAP is open, portable infrastructure for simulating consequential enterprise agents, evaluating their behavior under uncertainty and attack, and producing evidence that supports a bounded release decision.</p>
            <div className="what-hero-actions"><Link className="button button-accent" href="/connect">Test a public agent</Link><Link className="text-link light-link" href="/guides">Choose your team’s guide <span>↗</span></Link></div>
          </div>
        </section>

        <section className="what-definition">
          <div className="definition-lead"><span className="section-label">The short version</span><h2>Before an agent can act, EASAP makes it show its work.</h2><p>An agent becomes a system-risk problem when it can call tools, access private data, change records, move money, alter access, or represent the company. EASAP gives the people responsible for that system a shared way to test, explain, and govern its authority.</p></div>
          <div className="definition-card"><span>ONE SENTENCE</span><strong>EASAP turns agent authority into repeatable scenarios, measurable outcomes, and a release gate that can be inspected later.</strong><div><i /> Open reference implementation</div><div><i /> Deterministic where it matters</div><div><i /> Portable evidence by design</div></div>
        </section>

        <section className="proof-layers">
          <div className="section-heading-wide"><div><span className="section-label"><i /> How the system fits together</span><h2>One chain from behavior to accountability.</h2></div><p>EASAP keeps the system boundary, execution conditions, evidence, and decision connected so a result does not lose its meaning when it leaves the engineering team.</p></div>
          <div className="proof-layer-grid">{proofLayers.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p><i /></article>)}</div>
        </section>

        <section className="distinction-section"><div className="section-heading-wide"><div><span className="section-label">What EASAP is—and is not</span><h2>Useful signal, without inflated claims.</h2></div><p>The product is designed to make evidence stronger and decisions clearer, not to turn a bounded test into a universal promise.</p></div><div className="distinction-table"><div className="distinction-head"><span>Existing practice</span><span>What it answers</span><span>What EASAP adds</span></div>{distinctions.map(([kind, answers, adds]) => <div key={kind}><strong>{kind}</strong><span>{answers}</span><em>{adds}</em></div>)}</div></section>

        <section className="what-roles"><div><span className="section-label light">Who uses it</span><h2>Different jobs. One evidence language.</h2><p>Engineering builds the candidate. Security challenges it. Governance defines the boundary. Release leaders decide whether the evidence is sufficient.</p></div><div className="role-path"><Link href="/guides/ai-engineering"><span>01</span><strong>AI engineering</strong><small>Bind and run the candidate →</small></Link><Link href="/guides/security-red-team"><span>02</span><strong>Security & red team</strong><small>Attack and minimize failures →</small></Link><Link href="/guides/risk-governance"><span>03</span><strong>Risk & governance</strong><small>Set evidence and approvals →</small></Link><Link href="/guides/product-release"><span>04</span><strong>Product & release</strong><small>Make the bounded decision →</small></Link></div></section>

        <section className="what-cta"><span className="section-label"><i /> Start with the boundary you have</span><h2>Connect a live agent or plan<br /><em>before it gets access.</em></h2><div><Link className="button button-dark button-large" href="/connect">Connect a public agent</Link><Link className="button button-outline button-large" href="/assess">Open the readiness planner</Link></div></section>
      </main>
      <SiteFooter />
    </>
  );
}
