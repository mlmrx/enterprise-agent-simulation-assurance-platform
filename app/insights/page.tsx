import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/content/editorial";
import { SiteFooter, SiteHeader } from "../components/site-shell";

export const metadata: Metadata = {
  title: "Agent assurance insights | EASAP",
  description: "Technical field notes on enterprise agent simulation, adversarial testing, evidence, and release assurance.",
};

export default function InsightsPage() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-page">
        <header className="editorial-hero">
          <span className="section-label">EASAP field notes</span>
          <h1>Operational thinking for<br /><em>consequential agents.</em></h1>
          <p>Substantive guidance for the teams who have to explain—and defend—why an agent received authority.</p>
        </header>
        <section className="article-index">
          {articles.map((article, index) => (
            <Link href={`/insights/${article.slug}`} key={article.slug} className={index === 0 ? "featured-article" : ""}>
              <span className="article-number">{String(index + 1).padStart(2, "0")}</span>
              <div><small>{article.category} · {article.publishedAt} · {article.readingMinutes} min read</small><h2>{article.title}</h2><p>{article.dek}</p><strong>{article.signal}</strong></div>
              <i>↗</i>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
