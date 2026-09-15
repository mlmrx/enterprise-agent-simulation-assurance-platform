---
name: easap-assurance
description: Use EASAP to plan, run, or review evidence-scoped assurance for an enterprise agent. Applies to release readiness, deterministic reference campaigns, public-agent probes, and EASAP evidence interpretation.
---

# EASAP Assurance

Use the public CLI for the fastest executable path:

```bash
npx @mlmrx/easap
```

This runs the hosted STANDARD-reference campaign and writes JSON evidence. Describe
it as executable reference evidence, never as production certification.

## Choose the workflow

- For an immediate product demonstration or regression sanity check, run
  `npx @mlmrx/easap` and inspect the saved decision, trial summary, evidence verification,
  limitations, and run identifier.
- For a readiness plan, collect the agent's authority, data classes, deployment
  stage, exposure, volume, and existing controls. Create the documented JSON input
  and run `npx @mlmrx/easap assess <input.json>`.
- For a public endpoint, require the user to confirm that they control it and that
  four read-only probes are safe. Then use
  `npx @mlmrx/easap check <https-url> --name <name> --protocol <json_message|openai_chat> --authorized`.
- For private, authenticated, browser-only, credential-bearing, or internal agents,
  do not route through the hosted connector. Recommend a self-hosted EASAP runtime
  inside the enterprise boundary.

## Evidence discipline

Keep these labels distinct:

- A readiness plan is deterministic planning output.
- A reference campaign proves the checked-in STANDARD contracts executed.
- A public probe records four observed black-box responses from a verified endpoint.
- Production assurance additionally requires the deployed candidate, organization-
  specific scenarios, isolation, key management, policy enforcement, approvals,
  monitoring, and re-test-on-change controls.

Do not claim that a pass proves general safety. Surface failed and review results,
limitations, target identity, timestamps, digests, and incomplete gates exactly as
the evidence reports them.

## Developer interface

The `@mlmrx/easap` package exports `createClient` and `EasapClient`. Prefer the SDK over
reimplementing HTTP calls when integrating JavaScript automation. Use
`EASAP_BASE_URL` or `--base-url` for an approved self-hosted service.
