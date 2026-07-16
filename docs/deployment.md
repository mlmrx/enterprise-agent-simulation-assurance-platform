# Portable deployment

EASAP is a standard Next.js application. It has no proprietary hosting runtime,
platform manifest, or cloud-vendor binding. The same source runs with Node.js,
Docker, Kubernetes, or any host that supports a persistent Node.js process.

## Runtime contract

Required:

- Node.js 22.13 or newer.
- A writable filesystem for the default SQLite database, or a remote libSQL URL.
- Port 3000 unless `PORT` is overridden.

Configuration:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./data/easap.db` | Local SQLite file or remote `libsql://` URL |
| `DATABASE_AUTH_TOKEN` | empty | Token for a remote libSQL database |
| `EASAP_PUBLIC_URL` | `http://localhost:3000` | Trusted public origin used in metadata |
| `EASAP_AUTH_MODE` | `local` | `local`, `shared-token`, or `trusted-proxy` |
| `EASAP_API_TOKEN` | empty | Required bearer value in `shared-token` mode |

## Local Node.js

```bash
cp .env.example .env.local
npm ci
npm run build
npm start
```

The database is created automatically on the first authenticated API request.

## Docker

```bash
docker build -t easap-reference .
docker run --rm -p 3000:3000 -v easap-data:/data easap-reference
```

Or use the checked-in Compose topology:

```bash
docker compose -f deploy/docker-compose.yml up --build
```

## Stateless application hosts

Hosts with ephemeral filesystems must use remote libSQL:

```text
DATABASE_URL=libsql://database.example
DATABASE_AUTH_TOKEN=<remote-token>
EASAP_PUBLIC_URL=https://assurance.example.com
```

Use the host's standard Next.js build command (`npm run build`) and start command
(`npm start`). Keep secrets in the host's secret manager rather than source control.

## Authentication modes

`local` accepts the development identity only for loopback requests and rejects
remote API requests.

`shared-token` is a portable integration mode. The caller sends:

```http
Authorization: Bearer <EASAP_API_TOKEN>
X-EASAP-User: operator@example.com
X-EASAP-Tenant: tenant-acme
X-EASAP-Roles: assurance_owner,auditor
```

`trusted-proxy` assumes an upstream identity-aware proxy has authenticated the
caller and overwrites all three `X-EASAP-*` headers. Never expose this mode directly
to the public internet, and always strip client-supplied identity headers at the
proxy boundary.

## Production adaptation

The checked-in runtime is the bounded `STANDARD` reference implementation. A
conformant enterprise deployment still needs the external execution-cell fleet,
durable orchestration, WORM evidence store, KMS/HSM-backed signing, federated
identity, policy enforcement, and observability described in
[architecture.md](architecture.md) and [security.md](security.md).
