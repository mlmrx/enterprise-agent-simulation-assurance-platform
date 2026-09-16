# EASAP Launch Agent

A Codex agent with a runnable Node.js publishing engine. It turns the existing
launch package into an executable campaign, keeps state across runs, and records
public URLs instead of treating a draft as a completed launch.

## Start

```bash
npm run launch:prepare
npm run launch:doctor
npm run launch:agent
```

Open `outputs/launch-agent/review.html` for exact post previews and state. The last
command runs the decision-making agent through your existing Codex CLI/login.
It defaults to preparation. No separate OpenAI API key or hosted agent service is
needed. Codex must be on PATH. Preparation uses workspace-write sandbox permissions.
Execution uses Codex's `--approve-for-me` mode so network/account actions can be
reviewed automatically; it does not bypass the sandbox or approval system. An
approval rejection is a reported blocker, never a reason to bypass the policy.
The engine also works without Codex using the commands below.

`npm run launch:console` serves the review page at `http://127.0.0.1:4312` with no
remote write controls. Agent events and the final launch brief are saved in the
state directory for inspection and recovery.

## What is executable

| Channel | Delivery | What must be configured |
|---|---|---|
| GitHub | Release creation, matching-release reuse, receipt verification | Existing `gh` login or `GH_TOKEN`; repository, tag, target |
| Dev.to | Six full articles over 15 days, receipt verification, available metrics | `DEVTO_API_KEY` and expected username |
| LinkedIn | Text/link post, publication id, readback verification | `LINKEDIN_ACCESS_TOKEN`, author URN, supported API version and permissions |
| X | Three-post reply thread with verified parent dependencies and public metrics | OAuth user `X_ACCESS_TOKEN`, expected numeric user id, API access |
| Product Hunt / HN | Prepared browser workflow | Authenticated maker account and submission interaction |
| Reddit / Hashnode | Prepared browser workflow | Exact allowed community or publication and account |
| Email / Slack / Teams | Prepared connector workflow | Explicit recipients/community and connected account |
| YouTube | Prepared upload workflow | Selected channel and authenticated browser |

Browser/connector tasks are carried by the Codex skill when the corresponding
tools and accounts are available. The headless Node worker reports them as pending;
it does not pretend to publish them. API social posts are text/link posts in this
release. GIFs/videos and alt text are attached to each outbox handoff for browser
posting; automatic social media upload is not implemented.

To use a logged-in browser for an API channel instead, set that channel's
`delivery` to `"browser"` and provide its exact HTTPS `destination`. The agent then
uses the same reviewed copy, media, and receipt workflow without requiring that
channel's API token. Browser capability must be available in the Codex session;
the Node worker alone cannot operate a browser.

## Configure once

Edit `launch/agent/campaign.json`:

- `startsAt`: an explicit ISO timestamp with timezone, e.g. `2026-09-22T16:00:00Z`.
  It starts as `null`, so generated copy cannot accidentally launch immediately.
- Set the expected account identifiers for the selected channels and disable others.
- Select a supported LinkedIn API version for your app. It is intentionally not
  hardcoded to a version that will silently expire.
- Set exact browser destinations for community/publication tasks.

Use environment variables or an ignored `.env.launch.local` file:

```text
DEVTO_API_KEY=...
X_ACCESS_TOKEN=...
LINKEDIN_ACCESS_TOKEN=...
# Optional when gh auth login is already configured:
GH_TOKEN=...
```

Never paste keys into posts, campaign JSON, or chat. The CLI loads an existing
`.env.launch.local` silently; existing process environment values take precedence.
Doctor checks credential presence and product page reachability; provider permission
and account identity are checked by the publishing path where supported. LinkedIn
requires that the operator select an author URN permitted by their token.

## Review, authorize, execute

```bash
node packages/launch-agent/bin/launch.mjs prepare
node packages/launch-agent/bin/launch.mjs approve --ids github-release,linkedin-launch,x-launch-1,x-launch-2,x-launch-3 --by owner --note "Approved these exact posts for these accounts and this schedule"
node packages/launch-agent/bin/launch.mjs run --publish
node packages/launch-agent/bin/launch.mjs verify
node packages/launch-agent/bin/launch.mjs status
```

The approval binds content, account, media digests, and due date. Editing any of
these invalidates it. The command is an operator attestation, not an identity or
signature service. Use access controls on the state directory in a shared host.
The agent records an approval only when the user has authorized that scope.

To execute with Codex: `npm run launch:agent -- --mode execute`. It consumes existing
approvals and does not approve its own drafts. The CLI can be called by any other
agent or scheduler that honors the same workflow.

## Scheduling and recovery

`watch --publish --interval 900` runs a worker while the process is alive. It respects
the launch date, per-job day offsets, configured maximum posts per tick, and verified
thread dependencies. It does not install an OS scheduler or start itself on reboot.
For an unattended service, provide a persistent volume for `outputs/launch-agent` and
run the same `run --publish` command from your scheduler. Use only one state directory
for this campaign. Existing Codex automations can invoke the skill when requested.

- An exclusive directory lock prevents concurrent workers in the same state directory.
- Intent is saved before the outbound request. A restart during publication moves the
  action to `needs_reconciliation`; it does not blindly resend.
- HTTP 429 responses are deferred. HTTP 5xx/timeouts after a POST require reconciliation.
- A successful POST is saved before verification. Verification failure becomes
  `submitted` with a receipt, and later runs do not repost it.
- `record --id JOB --url HTTPS_URL --remote-id REMOTE_ID --note "checked in account"`
  attaches an existing publication after browser posting or uncertain-request recovery.
- An interrupted lock requires an operator to confirm no worker is running before
  removing `outputs/launch-agent/.lock`. An uncertain failed post without an identifiable
  receipt requires operator investigation; automatic reset is deliberately unavailable.
- Set `LAUNCH_AGENT_PAUSE=1` to stop remote publication. CTRL+C stops the watch worker.

`verify` refreshes available reactions/comments/views or X public metrics. Missing
metrics remain unknown. UTM links distinguish launch channels; application conversion
analytics must be supplied separately. This release does not auto-reply, buy ads, or
collect leads from third-party contacts.

## Artifacts and testing

`outbox/*.json` stores exact payloads and content fingerprints. `outbox/*.md` stores
browser handoffs, media paths, and alt text. `state.json` stores events and receipts.
`review.html`, `report.md`, and `report.json` present the campaign state. These are all
ignored local outputs. Keep backups of state before moving a campaign to another host.

```bash
npm run test:launch
```

Tests use simulated publishers and HTTP responses to exercise failure/recovery paths;
they do not post to real accounts. Live publication acceptance remains an account-
specific gate until credentials, content authorization, and a launch date are supplied.

## Protocol references

- [Codex non-interactive runs](https://developers.openai.com/codex/noninteractive)
- [GitHub release API](https://docs.github.com/en/rest/releases/releases#create-a-release)
- [Forem article API](https://developers.forem.com/api/v1#tag/articles/operation/createArticle)
- [LinkedIn posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- [X create post API](https://docs.x.com/x-api/posts/create-post)
