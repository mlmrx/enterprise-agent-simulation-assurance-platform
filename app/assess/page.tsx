import type { Metadata } from "next";
import { ReadinessAssessment } from "../components/readiness-assessment";
import { SiteFooter, SiteHeader } from "../components/site-shell";
import { assessAgentReadiness, readinessSample } from "@/lib/readiness/assessment";

export const metadata: Metadata = {
  title: "Agent Release Readiness Planner | EASAP",
  description: "Turn an agent's authority, data access, and operating context into a concrete assurance plan, control map, and release-gate policy.",
};

export default async function AssessPage() {
  const initialResult = await assessAgentReadiness(readinessSample);

  return (
    <>
      <SiteHeader />
      <main className="assess-page">
        <header className="assess-intro">
          <div>
            <span className="section-label"><i /> Immediate utility · no account required</span>
            <h1>Agent Release<br /><em>Readiness Planner</em></h1>
          </div>
          <div>
            <p>Describe what your agent can access and do. Get an inherent-risk classification, control gaps, executable scenario pack, named owners, and a machine-readable release gate.</p>
            <div><span>INPUT</span> Agent authority and exposure <i>→</i><span>OUTPUT</span> Actionable assurance plan</div>
          </div>
        </header>

        <ReadinessAssessment initialInput={readinessSample} initialResult={initialResult} />

        <section className="planner-utility">
          <div><span className="section-label">One input · four teams</span><h2>Leave with work your organization can assign today.</h2></div>
          <div>
            <article><span>ENGINEERING</span><strong>Candidate manifest and integration boundary</strong></article>
            <article><span>SECURITY</span><strong>Threat-driven minimum scenario pack</strong></article>
            <article><span>GOVERNANCE</span><strong>Controls, owners, approvals, and retention</strong></article>
            <article><span>RELEASE AUTHORITY</span><strong>Machine-readable gate and decision criteria</strong></article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
