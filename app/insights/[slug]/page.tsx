import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleBySlug, articles } from "@/lib/content/editorial";
import { SiteFooter, SiteHeader } from "../../components/site-shell";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  return article ? { title: `${article.title} | EASAP`, description: article.dek } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  return (
    <>
      <SiteHeader />
      <main className="article-page">
        <Link href="/insights" className="back-link">← All insights</Link>
        <header>
          <span className="section-label">{article.category}</span>
          <h1>{article.title}</h1>
          <p>{article.dek}</p>
          <div><span>{article.publishedAt}</span><span>{article.readingMinutes} minute read</span><span>EASAP Research</span></div>
        </header>
        <div className="article-layout">
          <aside><span>Core signal</span><strong>{article.signal}</strong><small>Original analysis. Sources linked below.</small></aside>
          <article>
            {article.sections.map((section) => (
              <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>
            ))}
            <div className="article-references"><span>Primary references</span>{article.references.map((reference) => <a key={reference.href} href={reference.href} target="_blank" rel="noreferrer">{reference.label} ↗</a>)}</div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
