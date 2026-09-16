# EASAP launch media

These assets are captured from the working local EASAP product by `tools/capture-launch-assets.py`. They are not concept mockups.

## Asset matrix

| Asset | Proof shown | Recommended use |
|---|---|---|
| `easap-launch-hero.gif` / `.mp4` | Planner → connector → campaign → guides | Launch posts, README, product overview |
| `readiness-planner.gif` / `.mp4` | Inputs, generated classification, controls, scenarios, owners, policy | LinkedIn, Product Hunt, planner article |
| `public-agent-connector.gif` / `.mp4` | Registration, attestations, real challenge issuance | X, security article, connector docs |
| `live-assurance-campaign.gif` / `.mp4` | Idle campaign, execution phases, real returned evidence | HN, GitHub, technical article |
| `role-guides.gif` / `.mp4` | Guide hub and security/red-team workflow | Cross-functional and enablement posts |
| `*-poster.png` | Final evidence state at 1270×760 | Product Hunt gallery, thumbnails, static fallback |
| `easap-thumbnail-240.gif` | 240×240 animated identity/product sequence | Product Hunt thumbnail if under 3 MB |
| `easap-developer-tools.gif` | Published npm CLI execution, actual reference evidence, and Codex plugin workflow overview | Developer launch, GitHub, social posts |

## Developer tools animation

`easap-developer-tools.gif` is a 1200×750 animation rendered from an actual
`@mlmrx/easap@0.1.0` invocation against the hosted reference service. Terminal
output is reformatted and paced for readability; the saved absolute path is
shortened to `./evidence.json`. The evidence panel shows selected real fields.
The Codex plugin panel describes its available workflows; it is not a recording
of an executed Codex conversation or evidence of public marketplace approval.

Regenerate with `python tools/render-developer-gif.py --capture`. The source
transcript and complete response are saved under ignored `outputs/developer-gif/`.
`easap-developer-tools-poster.png` supplies a static fallback.

## Capture command

Start EASAP locally, then run:

```powershell
python tools/capture-launch-assets.py --base-url http://127.0.0.1:3000
```

The connector sequence uses `https://example.com/agent` only to demonstrate registration and challenge issuance. It does not claim ownership verification and does not run probes against that host.

## Publishing rules

- Use MP4 on LinkedIn because animated GIFs may be flattened.
- Use the 240×240 asset only for the Product Hunt thumbnail.
- Use poster PNGs for carousels and where motion is unavailable.
- Keep the loop calm: no flashing, strobing, or jump cuts.
- Preserve readable text and add platform-native alt text.
- Regenerate after a material product UI or claim change.
- Review platform limits immediately before uploading; they can change.

## Integrity note

The animations demonstrate product workflows, not customer results. The readiness output is deterministic reference guidance. The connector stops at a short-lived ownership challenge. The workbench executes the local STANDARD synthetic campaign. None of the assets represents certification or universal safety evidence.

