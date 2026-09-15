# EASAP CLI and JavaScript client

Run a real EASAP STANDARD-reference campaign and save its evidence:

```bash
npx @mlmrx/easap
```

No account or API key is required. The command calls the bounded public runner at
`https://easap.dev`, prints the decision, and writes the full JSON response to the
current directory. It is reference evidence—not a production safety certificate.

## Public-agent assurance

For an authorized public HTTPS JSON endpoint:

```bash
npx @mlmrx/easap check https://agent.example.com/v1/message --name "Support agent" --protocol json_message --authorized
```

EASAP issues a short-lived ownership challenge and waits while you publish its
exact value at `/.well-known/easap-verification.txt`. After verification, it runs
four bounded read-only probes and saves the observed response evidence.

The hosted connector does not accept credentials, arbitrary headers, redirects,
IP addresses, or private/reserved network targets. Deploy EASAP inside the
enterprise boundary for private or authenticated agents.

## Developer commands

```bash
npx @mlmrx/easap init
npx @mlmrx/easap demo --trials 24 --out evidence.json
npx @mlmrx/easap assess easap-readiness-input.json --out readiness.json
npx @mlmrx/easap doctor --json
npx @mlmrx/easap help
```

Use `--base-url http://localhost:3000` with a local or self-hosted EASAP service.

## JavaScript client

```js
import { createClient } from "@mlmrx/easap";

const easap = createClient();
const campaign = await easap.runDemo({ trialCount: 12 });
console.log(campaign.data.decision.posture);
```

The zero-dependency client also exposes `assessReadiness`, `registerTarget`,
`verifyTarget`, `runProbe`, and `doctor`.

## License

Apache-2.0
