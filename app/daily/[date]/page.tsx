import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/site-shell";
import { publishedContent } from "@/lib/content/runtime";

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string;
  href: string;
  signal: string;
  tags: string[];
};

type DailyBrief = {
  date: string;
  title: string;
  dek: string;
  generatedAt: string;
  methodology: string;
  lead: NewsItem;
  watchlist: NewsItem[];
  actions: string[];
};

async function loadBrief(date: string): Promise<DailyBrief | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  try {
    const local = JSON.parse(await readFile(join(process.cwd(), "content", "daily", `${date}.json`), "utf8")) as DailyBrief;
    return publishedContent(`daily/${date}.json`, local);
  } catch {
    return publishedContent<DailyBrief | null>(`daily/${date}.json`, null);
  }
}

export const revalidate = 900;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const brief = await loadBrief((await params).date);
  return brief ? { title: `${brief.title} | EASAP`, description: brief.dek } : {};
}

export default async function DailyBriefPage({ params }: { params: Promise<{ date: string }> }) {
  const brief = await loadBrief((await params).date);
  if (!brief) notFound();
  return (
    <>
      <SiteHeader />
      <main className="daily-page">
        <Link href="/news" className="back-link">← Daily intelligence</Link>
        <header><span className="section-label"><i /> Source-linked operator brief</span><h1>{brief.title}</h1><p>{brief.dek}</p><div><span>Published {brief.date}</span><span>{brief.methodology}</span></div></header>
        <section className="daily-lead">
          <div><span>Lead signal</span><h2>{brief.lead.title}</h2><p>{brief.lead.signal}</p><a href={brief.lead.href} target="_blank" rel="noreferrer">Read at {brief.lead.source} ↗</a></div>
          <aside><span>Control-room actions</span><ol>{brief.actions.map((action) => <li key={action}>{action}</li>)}</ol></aside>
        </section>
        <section className="daily-watch"><span className="section-label">Watchlist</span><h2>What else changed</h2>{brief.watchlist.map((item, index) => <a key={item.href} href={item.href} target="_blank" rel="noreferrer"><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.source} · {item.publishedAt}</small><strong>{item.title}</strong><p>{item.signal}</p></div><i>↗</i></a>)}</section>
      </main>
      <SiteFooter />
    </>
  );
}
