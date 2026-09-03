import type { Metadata } from "next";
import Link from "next/link";
import latestNews from "@/content/news/latest.json";
import latestDaily from "@/content/daily/latest.json";
import { sourceDesk } from "@/lib/content/editorial";
import { SiteFooter, SiteHeader } from "../components/site-shell";

export const metadata: Metadata = {
  title: "Daily agent assurance intelligence | EASAP",
  description: "Source-linked updates in agent security, evaluation, standards, and release assurance.",
};

export default function NewsPage() {
  return (
    <>
      <SiteHeader />
      <main className="news-page">
        <header className="news-hero">
          <div><span className="section-label"><i /> Daily intelligence</span><h1>Signal for agent<br /><em>assurance teams.</em></h1><p>Primary-source developments translated into the control, scenario, and evidence implications that matter to enterprise operators.</p></div>
          <aside><span>Last source sync</span><strong>{new Date(latestNews.generatedAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</strong><small>{latestNews.method}</small></aside>
        </header>
        <section className="news-layout">
          <div className="news-list">
            {latestNews.items.map((item, index) => (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                <span className="article-number">{String(index + 1).padStart(2, "0")}</span>
                <div><small>{item.source} · {item.publishedAt}</small><h2>{item.title}</h2><p>{item.signal}</p><div>{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><i>↗</i>
              </a>
            ))}
          </div>
          <aside className="source-desk"><span>Monitored source desk</span><p>The scheduled collector keeps only relevant items with a resolvable source URL. Retrieval failure never becomes invented news.</p><Link className="daily-brief-link" href={`/daily/${latestDaily.date}`}><small>Today’s operator brief</small><strong>{latestDaily.title}</strong><b>Read the synthesis →</b></Link>{sourceDesk.map((source) => <a key={source.name} href={source.href} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.scope}</small></a>)}<div><i /> Daily sync scheduled at 12:15 UTC</div></aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
