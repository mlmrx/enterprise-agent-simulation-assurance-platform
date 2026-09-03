export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Article = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  publishedAt: string;
  readingMinutes: number;
  signal: string;
  sections: ArticleSection[];
  references: Array<{ label: string; href: string }>;
};

export const articles: Article[] = [
  {
    slug: "the-release-artifact-enterprise-agents-are-missing",
    title: "The release artifact enterprise agents are missing",
    dek: "A model score cannot tell a release authority which exact agent configuration was tested, where it fails, or what authority it may safely receive.",
    category: "Release assurance",
    publishedAt: "2026-09-03",
    readingMinutes: 7,
    signal: "From evaluation output to an enforceable deployment decision",
    sections: [
      {
        heading: "The unit of assurance is the deployed system",
        paragraphs: [
          "Enterprise agents are assembled systems: model, system prompt, tools, memory, policy, credentials, connectors, runtime dependencies, and human gates. A benchmark attached only to the model leaves the consequential parts of that system outside the evidence boundary.",
          "A useful release artifact therefore binds the exact subject digest to exact world, scenario, harness, and oracle versions. If a prompt, tool permission, connector, or dependency changes materially, the old decision must narrow or become invalid.",
        ],
      },
      {
        heading: "What the certificate must carry",
        paragraphs: [
          "A release certificate is not a badge. It is a machine-readable control object that says what ran, what passed, what remains uncertain, who accepted the residual risk, when the decision expires, and how a release gate can check revocation.",
        ],
        bullets: [
          "The content address of the complete agent configuration.",
          "The assurance profile, required suites, measures, thresholds, and coverage gaps.",
          "Conditions such as allowed environments, maximum authority, required human gates, and denied network paths.",
          "Issuer, approver, expiry, signature, and revocation endpoint.",
        ],
      },
      {
        heading: "The decision buyers can defend",
        paragraphs: [
          "The strongest enterprise signal is not a perfect score. It is a reproducible account of the tested operating envelope and a constrained decision that downstream infrastructure can enforce. That turns an evaluation program into a release-control capability rather than a reporting exercise.",
        ],
      },
    ],
    references: [
      { label: "NIST AI Risk Management Framework", href: "https://www.nist.gov/itl/ai-risk-management-framework" },
      { label: "EASAP public implementation", href: "https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform" },
    ],
  },
  {
    slug: "why-model-evals-miss-agent-authority-risk",
    title: "Why model evals miss agent authority risk",
    dek: "The most expensive failures occur where a plausible model response becomes an unauthorized tool action, stale decision, or irreversible business event.",
    category: "System evaluation",
    publishedAt: "2026-09-02",
    readingMinutes: 8,
    signal: "Test the harness-visible action, not only the generated text",
    sections: [
      {
        heading: "Capability changes the risk equation",
        paragraphs: [
          "A conversational mistake can be corrected. An agent with purchasing, payment, identity, or production access can turn the same mistake into a business event. That is why agent assurance has to intercept the capabilities around the model: network, time, randomness, credentials, tools, files, and external effects.",
          "The test question becomes operational: under stale data, partial responses, permission loss, hostile instructions, and non-responsive humans, does the system remain inside its declared authority envelope?",
        ],
      },
      {
        heading: "Faults should compose",
        paragraphs: [
          "Production incidents rarely respect a single benchmark category. A supplier message can contain a prompt injection while an ERP retry is delayed and an approval token has just been revoked. Scenario systems should be able to compose those events with a virtual clock and fixed seed so the boundary can be explored repeatedly.",
        ],
        bullets: [
          "Permission loss during a multi-step workflow.",
          "Timeout followed by a duplicate side-effect attempt.",
          "Stale vendor data combined with a bank-detail change.",
          "Tool-output injection combined with attempted data exfiltration.",
        ],
      },
      {
        heading: "Measure behavior in separate dimensions",
        paragraphs: [
          "Goal reliability, policy integrity, robustness, recoverability, calibration, cost, latency, and human burden should not collapse into one score. A system can finish the task and still violate policy; it can be safe only because it escalates every decision to a person. Buyers need those trade-offs in the result manifest.",
        ],
      },
    ],
    references: [
      { label: "MITRE ATLAS", href: "https://atlas.mitre.org/" },
      { label: "OWASP GenAI Security Project", href: "https://genai.owasp.org/" },
    ],
  },
  {
    slug: "reproducing-agent-failures-from-sealed-inputs",
    title: "Reproducing agent failures from sealed inputs",
    dek: "A finding becomes actionable when an engineer can replay the same world snapshot, seed, event schedule, and dependency behavior—and verify the same trace root.",
    category: "Engineering practice",
    publishedAt: "2026-09-01",
    readingMinutes: 6,
    signal: "Make every failure a regression asset",
    sections: [
      {
        heading: "Record the world around the agent",
        paragraphs: [
          "Saving the prompt and response is insufficient for an agent that reads clocks, calls tools, sees changing state, and waits on people. Exact replay needs a sealed subject, a versioned world snapshot, a typed scenario, the random seed, the event schedule, dependency responses, and the harness version.",
          "Each observation should capture the actor, event, state before and after, payload digest, and causal relationship at the harness boundary. That is the point where an attempted capability becomes evidence.",
        ],
      },
      {
        heading: "Minimize without changing the predicate",
        paragraphs: [
          "Large campaign traces are expensive to debug. A minimizer can remove state, events, payload fields, and dependencies while rerunning the failure predicate. Every accepted and rejected transformation belongs in the evidence so a reviewer can see that the reduced case still represents the original defect.",
        ],
      },
      {
        heading: "Close the incident loop",
        paragraphs: [
          "When production monitoring finds a new behavior, protected values should be redacted, provenance recorded, and a privacy reviewer should approve the derived synthetic scenario. The resulting regression then joins the sealed release suite without copying sensitive production data into an evaluation corpus.",
        ],
      },
    ],
    references: [
      { label: "Model Context Protocol specification", href: "https://modelcontextprotocol.io/specification/2025-06-18" },
      { label: "A2A specification", href: "https://github.com/a2aproject/A2A" },
    ],
  },
];

export function articleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export const sourceDesk = [
  { name: "NIST AI", href: "https://www.nist.gov/news-events/news-updates/topic/2753736", scope: "AI measurement, standards, and evaluation" },
  { name: "NIST Cybersecurity", href: "https://www.nist.gov/news-events/cybersecurity/rss.xml", scope: "Security guidance and control updates" },
  { name: "OWASP GenAI", href: "https://genai.owasp.org/blog/", scope: "Agentic application security and incidents" },
  { name: "MITRE ATLAS", href: "https://atlas.mitre.org/", scope: "Adversarial threat techniques" },
  { name: "MCP", href: "https://modelcontextprotocol.io/specification/2025-06-18", scope: "Tool protocol changes" },
  { name: "A2A", href: "https://github.com/a2aproject/A2A", scope: "Agent interoperability changes" },
];
