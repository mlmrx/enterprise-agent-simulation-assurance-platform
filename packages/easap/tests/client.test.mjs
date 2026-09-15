import assert from "node:assert/strict";
import test from "node:test";
import { createClient, EasapError } from "../src/client.mjs";

test("demo uses the public campaign contract", async () => {
  let observed;
  const client = createClient({
    baseUrl: "https://example.test/",
    fetch: async (url, init) => {
      observed = { url, init };
      return new Response(JSON.stringify({ data: { run_id: "run-1" }, meta: {} }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const result = await client.runDemo({ trialCount: 8 });
  assert.equal(result.data.run_id, "run-1");
  assert.equal(observed.url, "https://example.test/api/demo/run");
  assert.equal(observed.init.method, "POST");
  assert.deepEqual(JSON.parse(observed.init.body), { trialCount: 8 });
});

test("registration preserves explicit safety attestations", async () => {
  let body;
  const client = createClient({
    fetch: async (_url, init) => {
      body = JSON.parse(init.body);
      return new Response(JSON.stringify({ setupToken: "token" }), { status: 200 });
    },
  });
  await client.registerTarget({
    agentName: "Support agent",
    endpointUrl: "https://agent.example/v1/message",
    protocol: "json_message",
    authorized: true,
    safeTarget: true,
  });
  assert.deepEqual(body, {
    agentName: "Support agent",
    endpointUrl: "https://agent.example/v1/message",
    protocol: "json_message",
    authorized: true,
    safeTarget: true,
  });
});

test("API errors keep status and server detail", async () => {
  const client = createClient({
    fetch: async () => new Response(JSON.stringify({ error: "Target rejected." }), { status: 400 }),
  });
  await assert.rejects(
    client.runProbe("invalid"),
    (error) => error instanceof EasapError && error.status === 400 && error.message === "Target rejected.",
  );
});
