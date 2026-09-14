# EASAP launch package

Launch theme: **Evidence before authority.**

This package is the publish-ready campaign system for the Enterprise Agent Simulation and Assurance Platform (EASAP). It is written around the product that people can use today—not a future roadmap.

## The launch in one sentence

EASAP helps enterprise teams decide whether an AI agent has earned the authority they plan to give it, using an immediate readiness planner, a verified public-endpoint baseline, deterministic simulation, and portable evidence.

## Primary calls to action

1. **Assess an agent:** https://easap.dev/assess
2. **Test an authorized public agent:** https://easap.dev/connect
3. **Run the reference campaign:** https://easap.dev/platform
4. **Audit or self-host the source:** https://github.com/mlmrx/enterprise-agent-simulation-assurance-platform

## Package contents

| Deliverable | File | Use |
|---|---|---|
| Positioning system | `01-positioning-and-messaging.md` | Canonical language, proof, audience, claims boundary |
| Cross-platform copy | `02-platform-posts.md` | Product Hunt, HN, LinkedIn, X, Reddit, Dev.to, GitHub, email, communities |
| Launch calendar | `03-launch-calendar.md` | T-7 through T+30 execution plan and metrics |
| Demo and objections | `04-demo-faq-and-sales-enablement.md` | 90-second demo, 5-minute demo, FAQ, discovery prompts |
| Media brief | `05-press-and-analyst-brief.md` | Press release, pitch, founder quote, boilerplate |
| Article plan | `articles/README.md` | Publication order, audience, distribution, internal links |
| Six launch articles | `articles/*.md` | Ready-to-edit long-form launch content |
| Feature media | `assets/` | Real product GIFs, poster frames, usage notes |

## Recommended launch sequence

The strongest public launch is not “another AI governance dashboard.” Lead with the working utility.

1. Publish the founder article, **Evidence before authority**.
2. Launch on Product Hunt using the 1270×760 gallery set and the short hero GIF.
3. Post the working `/assess`, `/connect`, and `/platform` links on LinkedIn and X.
4. Submit a Show HN only when the author can stay in the thread and answer technical questions. Lead with the runnable open-source system, not the landing page.
5. Publish the engineering article on Dev.to or Hashnode and link the repository.
6. Send the direct email to the first design-partner cohort. Ask for one bounded agent workflow, not a platform-wide commitment.
7. Use the remaining articles as the four-week follow-through campaign.

## Launch-owner checklist

- [ ] Replace `[FOUNDER NAME]`, `[LAUNCH DATE]`, and `[CONTACT EMAIL]`.
- [ ] Confirm `https://easap.dev/assess`, `/connect`, and `/platform` are healthy.
- [ ] Confirm the GitHub repository is public and its CI is green.
- [ ] Review every claim against `01-positioning-and-messaging.md`.
- [ ] Upload the correct platform media variant; do not rely on animated GIFs for LinkedIn, which may render them as static images.
- [ ] Add captions or alt text to every visual.
- [ ] Keep a maker available for Product Hunt and HN replies.
- [ ] Do not ask for coordinated votes or imply that a baseline result is certification.
- [ ] Record source, visits, assessment starts, exports, connector challenges, campaign runs, and repository clicks.
- [ ] Publish a transparent launch recap at T+7.

## Definition of launch success

The launch succeeds when qualified teams use the product, not when a post gets impressions. The primary signal is a completed high-intent action:

- assurance plan exported;
- ownership challenge created for an authorized endpoint;
- live reference campaign completed;
- repository cloned or self-hosting discussion opened;
- bounded design-partner conversation requested.

Do not combine these into an invented “safety score.” Report the funnel as separate facts.

## Truth boundary

EASAP is an Apache-2.0 STANDARD reference implementation and working public utility. It is not a certification body, a guarantee of universal agent safety, or a claim of HIGH-RISK production isolation. The hosted connector supports authorized, unauthenticated public HTTPS JSON endpoints. Authenticated, private-network, and browser-only agents belong in a self-hosted connector inside the enterprise boundary.

