import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/site-shell";
import { audienceGuides, guideForSlug } from "@/lib/content/guides";

export function generateStaticParams() { return audienceGuides.map((guide) => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideForSlug(slug);
  return guide ? { title: `${guide.audience} guide | EASAP`, description: guide.dek } : {};
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideForSlug(slug);
  if (!guide) notFound();

  return <><SiteHeader /><main className="guide-detail-page"><header className="guide-detail-hero"><Link className="back-link" href="/guides">← All function guides</Link><span className="section-label"><i /> {guide.eyebrow}</span><h1>{guide.title}</h1><p>{guide.dek}</p><div><span>BUILT FOR</span><strong>{guide.audience}</strong></div></header><div className="guide-detail-layout"><aside><span>YOUR FIRST ACTION</span><strong>{guide.firstAction}</strong><Link className="button button-dark" href="/assess">Open planner</Link><div className="guide-boundary"><small>BOUNDARY</small><p>{guide.boundary}</p></div></aside><article><section><span className="section-label">What you will leave with</span><div className="guide-output-grid">{guide.outputs.map((output) => <div key={output}><i>✓</i><strong>{output}</strong></div>)}</div></section><section><span className="section-label">Your workflow</span><div className="guide-step-list">{guide.steps.map((step, index) => <div key={step.title}><span>0{index + 1}</span><div><h2>{step.title}</h2><p>{step.copy}</p></div></div>)}</div></section><section><span className="section-label">Ready-to-use checklist</span><div className="guide-checklist">{guide.checklist.map((item) => <div key={item}><span>✓</span><p>{item}</p></div>)}</div></section><section className="guide-handoff"><span>HANDOFF TO THE NEXT FUNCTION</span><strong>Share the assessment ID, evidence requirements, open gaps, and scenario pack—not a screenshot.</strong><Link className="text-link" href="/what-is-easap">Revisit the EASAP model <span>↗</span></Link></section></article></div></main><SiteFooter /></>;
}
