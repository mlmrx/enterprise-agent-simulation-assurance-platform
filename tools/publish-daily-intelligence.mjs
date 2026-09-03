import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const date = new Date().toISOString().slice(0, 10);
const sources = [
  { name: "NIST News", url: "https://www.nist.gov/news-events/news/rss.xml" },
  { name: "NIST Cybersecurity", url: "https://www.nist.gov/news-events/cybersecurity/rss.xml" },
  { name: "OWASP GenAI Security Project", url: "https://genai.owasp.org/feed/" },
  { name: "Model Context Protocol", url: "https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom" },
  { name: "A2A Project", url: "https://github.com/a2aproject/A2A/releases.atom" },
];

const weightedTerms = [
  [/\bagent(?:ic)?\b/i, 8], [/\bassurance\b/i, 8], [/\bevaluation\b/i, 6],
  [/\bbenchmark\b/i, 5], [/\bsecurity\b/i, 4], [/\brisk\b/i, 4],
  [/\bgovernance\b/i, 4], [/\bprotocol\b/i, 5], [/\bprompt\b/i, 4],
  [/\btool(?:s|ing)?\b/i, 3], [/\bidentity\b/i, 3], [/\bllm\b/i, 4],
  [/\bartificial intelligence\b/i, 2], [/\bai system\b/i, 3], [/\bmodel\b/i, 1],
];

function decode(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#0*38;|&#x0*26;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function field(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decode(match[1]);
  }
  return "";
}

function link(block) {
  const rss = field(block, ["link"]);
  if (/^https?:\/\//.test(rss)) return rss;
  const atom = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
  return atom && /^https?:\/\//.test(atom) ? atom : "";
}

function cleanLink(value) {
  try {
    const url = new URL(value.replace(/&#0*38;|&#x0*26;/gi, "&"));
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return "";
  }
}

function relevanceScore(value) {
  return weightedTerms.reduce((score, [term, weight]) => score + (term.test(value) ? weight : 0), 0);
}

function itemsFromXml(xml, source) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []),
  ];
  return blocks.map((block) => {
    const title = field(block, ["title"]);
    const description = field(block, ["description", "summary", "content"]);
    const published = field(block, ["pubDate", "published", "updated"]);
    const href = cleanLink(link(block));
    const relevance = relevanceScore(`${title} ${description}`);
    return {
      title,
      source: source.name,
      publishedAt: Number.isNaN(Date.parse(published)) ? date : new Date(published).toISOString().slice(0, 10),
      href,
      description,
      relevance,
    };
  }).filter((item) => item.title && item.href && item.relevance >= 4);
}

function signalFor(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  if (text.includes("standard") || text.includes("framework") || text.includes("governance")) return "Map the change to assurance profiles, evidence requirements, and release-gate policy before the next material agent update.";
  if (text.includes("attack") || text.includes("vulnerab") || text.includes("security") || text.includes("risk")) return "Convert the reported technique into a sealed adversarial scenario and verify capability containment under composed faults.";
  if (text.includes("release") || text.includes("protocol") || text.includes("version")) return "Treat protocol or runtime movement as a material dependency change and rerun the affected operating-envelope suites.";
  if (text.includes("evaluation") || text.includes("benchmark") || text.includes("measurement")) return "Compare the evaluation method with system-level measures, uncertainty reporting, hidden-suite controls, and reproducibility requirements.";
  return "Review the development for a change in agent capability, operating assumptions, or evidence required for release authority.";
}

function tagsFor(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return [
    text.includes("security") || text.includes("attack") ? "security" : null,
    text.includes("standard") || text.includes("framework") ? "standards" : null,
    text.includes("evaluation") || text.includes("benchmark") ? "evaluation" : null,
    text.includes("agent") ? "agents" : null,
    text.includes("protocol") || text.includes("release") ? "platform change" : null,
  ].filter(Boolean).slice(0, 3);
}

const fetched = await Promise.allSettled(sources.map(async (source) => {
  const response = await fetch(source.url, { headers: { "User-Agent": "EASAP-Source-Desk/1.0 (+https://easap.dev/news)" } });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return itemsFromXml(await response.text(), source);
}));

const candidates = fetched.flatMap((result) => result.status === "fulfilled" ? result.value : []);
const seen = new Set();
const selected = candidates
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .filter((item) => {
    const key = item.href.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, 12)
  .map((item) => ({
    title: /^(?:v?\d+[\d.-]*|\d{4}-\d{2}-\d{2}(?:\s+RC)?)$/i.test(item.title)
      ? `${item.source} release ${item.title}`
      : item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    href: item.href,
    signal: signalFor(item),
    tags: tagsFor(item),
  }));

if (selected.length === 0) {
  console.log("No verified relevant source items were retrieved; preserving the last published desk without fabrication.");
  process.exit(0);
}

const latest = {
  generatedAt: new Date().toISOString(),
  method: `automated primary-source sync; ${selected.length} relevant items retained`,
  items: selected,
};
const daily = {
  date,
  slug: `agent-assurance-daily-${date}`,
  title: `Agent Assurance Daily — ${date}`,
  dek: "A source-linked operating brief for teams testing and governing enterprise agents.",
  generatedAt: latest.generatedAt,
  methodology: "Deterministic synthesis from resolvable primary-source feed items. No language model and no invented reporting.",
  lead: selected[0],
  watchlist: selected.slice(1, 6),
  actions: Array.from(new Set(selected.slice(0, 6).map((item) => item.signal))),
};

const newsDir = join(root, "content", "news");
const dailyDir = join(root, "content", "daily");
await mkdir(newsDir, { recursive: true });
await mkdir(dailyDir, { recursive: true });
await writeFile(join(newsDir, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`);
await writeFile(join(newsDir, `${date}.json`), `${JSON.stringify(latest, null, 2)}\n`);
await writeFile(join(dailyDir, `${date}.json`), `${JSON.stringify(daily, null, 2)}\n`);
await writeFile(join(dailyDir, "latest.json"), `${JSON.stringify(daily, null, 2)}\n`);

const failures = fetched.filter((result) => result.status === "rejected").length;
console.log(`Published ${selected.length} verified items and the ${date} assurance brief; ${failures} source(s) unavailable.`);
