import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test, { after, before } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = 31_000 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let databaseDirectory;
let serverOutput = "";

before(async () => {
  databaseDirectory = await mkdtemp(join(tmpdir(), "easap-test-"));
  const nextBin = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url),
  );
  server = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        DATABASE_URL: `file:${join(databaseDirectory, "easap.db").replaceAll("\\", "/")}`,
        EASAP_AUTH_MODE: "local",
        EASAP_PUBLIC_URL: baseUrl,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/v1/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Next.js did not become ready.\n${serverOutput}`);
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await once(server, "exit");
  }
  if (databaseDirectory) {
    await rm(databaseDirectory, { recursive: true, force: true });
  }
});

test("server-renders the EASAP assurance console and product metadata", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>EASAP \| Enterprise Agent Assurance<\/title>/i);
  assert.match(html, /Is ProcureOps v2\.4\.1 ready to receive authority\?/i);
  assert.match(html, /Release readiness/i);
  assert.match(html, /Procurement boundary matrix/i);
  assert.match(html, /STANDARD reference workspace/i);
  assert.match(html, /\/og\.png/i);
});

test("portable build has no host-specific runtime bindings", async () => {
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  assert.match(packageJson, /"next":/);
  assert.match(packageJson, /"@libsql\/client":/);
  await assert.rejects(access(new URL("../vite.config.ts", import.meta.url)));
  await assert.rejects(access(new URL("../worker/index.ts", import.meta.url)));
  await access(new URL("../Dockerfile", import.meta.url));
  await access(new URL("../public/og.png", import.meta.url));
});

test("health endpoint identifies the bounded reference mode", async () => {
  const response = await fetch(`${baseUrl}/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    mode: "STANDARD-reference",
    conformance: "reference-only",
    version: "1.0.0",
  });
});

test("local reference campaign persists through portable SQLite", async () => {
  const response = await fetch(`${baseUrl}/v1/demo:run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trial_count: 6 }),
  });
  assert.equal(response.status, 201, await response.text());
});
