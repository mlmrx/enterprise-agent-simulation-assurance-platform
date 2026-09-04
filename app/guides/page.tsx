import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/site-shell";
import { audienceGuides } from "@/lib/content/guides";

export const metadata: Metadata = {
  title: "EASAP Guides by Function | How to Use the Platform",
  description: "Function-specific guides for AI engineering, security, red teams, governance, audit, product, and release leaders using EASAP.",
};

export default function GuidesPage() {
  return <><SiteHeader /><main className="guides-page"><header className="guides-hero"><span className="section-label"><i /> How to use EASAP</span><h1>One platform.<br /><em>Different jobs.</em></h1><p>Choose the guide that matches your function. Each one starts with the same authority model and ends with the work product your team owns.</p></header><section className="guides-intro"><div><span className="section-label">The shared flow</span><h2>Describe → challenge → evidence → decide.</h2></div><p>The Readiness Planner is the common starting point. Your function-specific guide explains what to do with its outputs and where you hand work to the next team.</p></section><section className="guide-card-grid">{audienceGuides.map((guide, index) => <Link href={`/guides/${guide.slug}`} className="guide-card" key={guide.slug}><span>0{index + 1}</span><small>{guide.eyebrow}</small><h2>{guide.title}</h2><p>{guide.dek}</p><div><strong>Primary outcome</strong><em>{guide.outcome}</em></div><i>Read this guide ↗</i></Link>)}</section><section className="guides-cta"><span className="section-label light">No integration required</span><h2>Start with an agent you already know.</h2><p>Build a concrete plan first. Connect production systems only after the authority boundary and evidence requirements are explicit.</p><Link className="button button-accent button-large" href="/assess">Open the planner</Link></section></main><SiteFooter /></>;
}
