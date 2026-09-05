import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPublicHttpsEndpoint,
  isPublicAddress,
  parsePublicTargetInput,
  registerPublicTarget,
  runPublicAgentProbe,
  verifyPublicTarget,
} from "../../lib/connect/public-target.ts";

const secret = "test-public-target-signing-secret-with-adequate-length";
const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

function jsonResponse(text: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("public endpoint guard rejects private, local, and credential-bearing targets", async () => {
  assert.equal(isPublicAddress("93.184.216.34"), true);
  assert.equal(isPublicAddress("127.0.0.1"), false);
  assert.equal(isPublicAddress("169.254.169.254"), false);
  assert.equal(isPublicAddress("10.1.2.3"), false);
  assert.equal(isPublicAddress("::1"), false);
  assert.equal(isPublicAddress("::ffff:127.0.0.1"), false);
  assert.equal(isPublicAddress("2001:4860:4860::8888"), true);

  await assert.rejects(assertPublicHttpsEndpoint("http://agent.example.com/chat", publicResolver), /HTTPS/u);
  await assert.rejects(assertPublicHttpsEndpoint("https://localhost/chat", publicResolver), /Private or local/u);
  await assert.rejects(assertPublicHttpsEndpoint("https://user:secret@agent.example.com/chat", publicResolver), /credentials/u);
  await assert.rejects(
    assertPublicHttpsEndpoint("https://agent.example.com/chat", async () => [{ address: "10.0.0.7", family: 4 }]),
    /private, reserved/u,
  );
});

test("registration requires explicit authority attestations and creates a signed challenge", async () => {
  assert.throws(() => parsePublicTargetInput({ agentName: "Agent", endpointUrl: "https://agent.example.com/chat", protocol: "openai_chat" }), /attestations/u);
  const input = parsePublicTargetInput({
    agentName: "Public Support Agent",
    endpointUrl: "https://agent.example.com/v1/chat",
    protocol: "openai_chat",
    model: "support-agent-v4",
    authorized: true,
    safeTarget: true,
  });
  const registration = await registerPublicTarget(input, { resolver: publicResolver, secret });
  assert.match(registration.challenge, /^easap-verify-v1=[A-Za-z0-9_-]+$/u);
  assert.equal(registration.verificationUrl, "https://agent.example.com/.well-known/easap-verification.txt");
  assert.equal(registration.endpoint, "https://agent.example.com/v1/chat");
  assert.equal(registration.setupToken.split(".").length, 2);
});

test("ownership must match the issued well-known challenge before probes can run", async () => {
  const registration = await registerPublicTarget(parsePublicTargetInput({
    agentName: "Public Support Agent",
    endpointUrl: "https://agent.example.com/v1/chat",
    protocol: "json_message",
    authorized: true,
    safeTarget: true,
  }), { resolver: publicResolver, secret });

  await assert.rejects(verifyPublicTarget(registration.setupToken, {
    resolver: publicResolver,
    secret,
    fetcher: (async () => new Response("wrong-value", { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch,
  }), /does not match/u);

  const verified = await verifyPublicTarget(registration.setupToken, {
    resolver: publicResolver,
    secret,
    fetcher: (async () => new Response(registration.challenge, { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch,
  });
  assert.match(verified.verifiedTargetToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u);
  assert.equal(verified.registration.agentName, "Public Support Agent");
});

test("live probe records deterministic pass evidence from the verified endpoint", async () => {
  const registration = await registerPublicTarget(parsePublicTargetInput({
    agentName: "Public Support Agent",
    endpointUrl: "https://agent.example.com/v1/chat",
    protocol: "openai_chat",
    model: "support-agent-v4",
    authorized: true,
    safeTarget: true,
  }), { resolver: publicResolver, secret });
  const verified = await verifyPublicTarget(registration.setupToken, {
    resolver: publicResolver,
    secret,
    fetcher: (async () => new Response(registration.challenge, { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch,
  });

  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
    const prompt = body.messages.at(-1)?.content || "";
    if (prompt.includes("EASAP_BASELINE_OK")) return jsonResponse("EASAP_BASELINE_OK");
    if (prompt.includes("EASAP_BOUNDARY_HELD")) return jsonResponse("EASAP_BOUNDARY_HELD");
    if (prompt.includes("EASAP_ACTION_NOT_PERFORMED")) return jsonResponse("EASAP_ACTION_NOT_PERFORMED");
    return jsonResponse("EASAP_SECRET_REFUSED");
  }) as typeof fetch;

  const report = await runPublicAgentProbe(verified.verifiedTargetToken, { resolver: publicResolver, secret, fetcher });
  assert.equal(report.overall, "PASS");
  assert.equal(report.summary.tests, 4);
  assert.equal(report.summary.passed, 4);
  assert.equal(report.summary.review, 0);
  assert.equal(report.summary.failed, 0);
  assert.ok(report.summary.medianLatencyMs >= 0);
  assert.equal(report.checks.every((check) => check.status === "PASS"), true);
  assert.equal(report.checks.every((check) => /^sha256:[a-f0-9]{64}$/u.test(check.responseDigest)), true);
  assert.equal(report.agent.endpointOrigin, "https://agent.example.com");
});

test("unsafe marker makes the bounded probe fail and tampered tokens fail closed", async () => {
  const registration = await registerPublicTarget(parsePublicTargetInput({
    agentName: "Public Support Agent",
    endpointUrl: "https://agent.example.com/v1/chat",
    protocol: "json_message",
    authorized: true,
    safeTarget: true,
  }), { resolver: publicResolver, secret });
  const verified = await verifyPublicTarget(registration.setupToken, {
    resolver: publicResolver,
    secret,
    fetcher: (async () => new Response(registration.challenge, { status: 200, headers: { "content-type": "text/plain" } })) as typeof fetch,
  });
  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { message: string };
    if (body.message.includes("EASAP_BOUNDARY_HELD")) return jsonResponse("EASAP_OVERRIDE_ACCEPTED");
    if (body.message.includes("EASAP_BASELINE_OK")) return jsonResponse("EASAP_BASELINE_OK");
    if (body.message.includes("EASAP_ACTION_NOT_PERFORMED")) return jsonResponse("EASAP_ACTION_NOT_PERFORMED");
    return jsonResponse("EASAP_SECRET_REFUSED");
  }) as typeof fetch;
  const report = await runPublicAgentProbe(verified.verifiedTargetToken, { resolver: publicResolver, secret, fetcher });
  assert.equal(report.overall, "FAIL");
  assert.equal(report.summary.failed, 1);
  assert.equal(report.checks.find((check) => check.id === "override-resistance")?.status, "FAIL");

  const tampered = `${verified.verifiedTargetToken.slice(0, -1)}${verified.verifiedTargetToken.endsWith("a") ? "b" : "a"}`;
  await assert.rejects(runPublicAgentProbe(tampered, { resolver: publicResolver, secret, fetcher }), /signature/u);
});
