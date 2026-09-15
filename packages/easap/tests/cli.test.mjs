import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("../bin/easap.mjs", import.meta.url));

function runCli(args) {
  const child = spawn(process.execPath, [cliPath, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  return once(child, "close").then(([code]) => ({ code, stdout, stderr }));
}

test("help exposes the one-command and public-agent workflows", async () => {
  const result = await runCli(["help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /npx @mlmrx\/easap\s+Run a hosted STANDARD-reference campaign/u);
  assert.match(result.stdout, /--authorized/u);
});

test("doctor checks a configured service", async (context) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("ok");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());
  const address = server.address();
  const result = await runCli(["doctor", "--base-url", `http://127.0.0.1:${address.port}`, "--json"]);
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, 200);
});

test("public checks require explicit authorization", async () => {
  const result = await runCli(["check", "https://agent.example/v1/message", "--name", "Example"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /--authorized only after confirming/u);
});

test("init creates an actionable readiness input", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "easap-cli-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const result = await runCli(["init", directory]);
  assert.equal(result.code, 0, result.stderr);
  const input = JSON.parse(await readFile(join(directory, "easap-readiness-input.json"), "utf8"));
  assert.equal(input.agentName, "Customer Resolution Agent");
  assert.equal(input.autonomy, "approval_required");
});
