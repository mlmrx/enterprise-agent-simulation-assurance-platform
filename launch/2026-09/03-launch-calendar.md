# EASAP launch calendar

Set **T0** to the day the maker can be present for replies. Product Hunt operates on Pacific-time launch days; schedule rather than improvising at midnight.

## T-7 to T-3: proof and setup

| When | Action | Owner | Exit condition |
|---|---|---|---|
| T-7 | Freeze the launch commit and run the full test suite | Engineering | CI green; commit SHA recorded |
| T-7 | Run production smoke checks on `/assess`, `/connect`, `/platform`, GitHub | Engineering | HTTP and one interactive action verified |
| T-6 | Review claims and limitations | Product + security | Every public claim maps to runtime/source evidence |
| T-6 | Replace package placeholders and set the launch date | Founder | No bracketed placeholders remain in publish copy |
| T-5 | Prepare Product Hunt draft | Growth | Maker, thumbnail, 2+ gallery assets, description, first comment complete |
| T-5 | Prepare launch email and design-partner list | Founder | Permission-based, small, relevant cohort only |
| T-4 | Schedule founder article and engineering article | Editorial | Canonical URLs and internal links checked |
| T-3 | Dry-run the 90-second demo twice | Founder | Under 100 seconds without skipping the truth boundary |

## T-2 to T-1: distribution readiness

- Prepare platform-native uploads. Use video for LinkedIn; use the looping GIF under the current X upload limit for X.
- Put alt text on every image: describe the action and resulting evidence, not the color palette.
- Confirm the Show HN author is personally involved and available for the discussion.
- Prepare honest answers for deployment boundary, private agents, authentication, certification, and HIGH-RISK isolation.
- Define a single response owner for GitHub issues and launch comments.
- Create UTM links by platform if analytics exists. Never block the product behind an email gate just to count visitors.

## T0: launch day

| Pacific time | Action | Link/asset | Success signal |
|---|---|---|---|
| 12:01 AM | Product Hunt goes live | Hero GIF + gallery | Page live and media readable |
| 6:30 AM | Founder LinkedIn post | Planner GIF or MP4 | Qualified comments and assessment visits |
| 7:00 AM | Company LinkedIn post | Three-workflow carousel | Clicks to the right utility |
| 7:30 AM | X launch thread | Hero GIF | Product actions, not impressions alone |
| 8:00 AM | Launch email | Direct links | Assessments, replies, and demos |
| 8:30 AM | GitHub release | Release notes | Clones, stars, issues, self-host interest |
| 9:00 AM | Show HN, if eligible | Direct product URL | Technical questions and trials |
| 10:00 AM onward | Reply in public | Evidence-based answers | Every substantive comment answered |
| 2:00 PM | Publish short technical proof clip | Campaign GIF/MP4 | Campaign runs and repo clicks |
| 5:00 PM | Internal checkpoint | Funnel snapshot | Issues assigned; no inflated claims |

Do not coordinate upvotes. Ask users to try a specific workflow and tell you where the evidence chain breaks.

## T+1 to T+7: prove depth

| Day | Publication | Primary audience | CTA |
|---|---|---|---|
| T+1 | “How to test a public enterprise agent without handing over its credentials” | Security + engineering | `/connect` |
| T+2 | Live office hours or recorded five-minute demo | Cross-functional | `/assess` |
| T+3 | “Why model evals miss agent risk” | AI platform + product | `/platform` |
| T+4 | Open-source architecture thread | Engineering | GitHub |
| T+5 | “From prompt injection finding to release decision” | Security + governance | `/guides/security-red-team` |
| T+7 | Transparent launch recap | Builders | GitHub discussion or founder blog |

The recap should report raw, separated facts: visits, starts, completions, exports, connector challenges, campaign runs, repository actions, and qualified conversations. Do not invent an aggregate score.

## T+8 to T+30: establish the category

- Week 2: publish the release-readiness checklist and run a planner walkthrough.
- Week 2: invite three relevant teams to bring one bounded workflow to a 30-minute evidence review.
- Week 3: publish black-box versus full-system assurance; clarify the hosted/self-hosted boundary.
- Week 3: convert one recurring objection into a documentation improvement.
- Week 4: publish the architecture article and a roadmap update based on observed use.
- Week 4: decide whether the strongest signal supports connector depth, CI integration, private deployment, or reporting next.

## Funnel and instrumentation

Track these events independently:

| Stage | Event | Interpretation |
|---|---|---|
| Attention | landing view | Weak signal |
| Understanding | `/what-is-easap` or guide view | Problem/category interest |
| Intent | planner started; connector form started | A real use case may exist |
| Utility | plan generated; challenge created; campaign completed | Product value experienced |
| Portability | JSON/Markdown downloaded; GitHub clicked | Evidence or self-host intent |
| Commercial | qualified reply; design review booked | Strong enterprise signal |

Segment by function and agent authority. Ten governance visitors are not equivalent to ten teams trying to release a tool-using agent.

## Daily operating cadence

- 08:00: production health and inbox check.
- 10:00: group questions into product, security, deployment, and claim themes.
- 13:00: publish one proof artifact or answer, not a generic promotional post.
- 16:00: fix one material onboarding issue if safe to ship.
- 17:00: save metrics and decisions in the launch log.

## Decision gates

At T+7, continue the campaign only if at least one high-intent action occurs. At T+30, choose one primary next market motion:

- self-serve utility, if planner/connector completions dominate;
- open-source adoption, if clones and technical contributions dominate;
- enterprise design partners, if bounded workflow reviews dominate;
- content/community, only if readership is converting into the above signals.

