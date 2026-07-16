import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeJson, contentAddress, ImmutableTenantRepository, signEnvelope, verifyContentAddress, verifyEnvelope } from "../../lib/easap/index.ts";

test("canonical JSON produces stable SHA-256 content addresses", async () => {
  const left = { z: [3, { beta: true, alpha: null }], a: "value" };
  const right = { a: "value", z: [3, { alpha: null, beta: true }] };
  assert.equal(canonicalizeJson(left), canonicalizeJson(right));
  const digest = await contentAddress(left);
  assert.match(digest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(digest, await contentAddress(right));
  assert.equal(await verifyContentAddress(right, digest), true);
  assert.throws(() => canonicalizeJson({ invalid: Number.NaN }), /non-finite/u);
});

test("immutable repository enforces tenant scope and expected digests", async () => {
  const repository = new ImmutableTenantRepository();
  const source = { subjectId: "agent-1", nested: { version: 1 } };
  const expected = await contentAddress(source);
  const stored = await repository.put("tenant-a", "subject", source, expected);

  source.nested.version = 2;
  assert.equal((stored.value as { nested: { version: number } }).nested.version, 1);
  assert.equal(repository.get("tenant-b", "subject", stored.digest), undefined);
  assert.equal(repository.require("tenant-a", "subject", stored.digest), stored);
  assert.equal(repository.count("tenant-a"), 1);
  assert.throws(
    () => ((stored.value as { nested: { version: number } }).nested.version = 3),
    TypeError,
  );
  await assert.rejects(
    repository.put("tenant-a", "subject", { different: true }, expected),
    /Content digest mismatch/u,
  );

  await repository.put("tenant-a", "result", {
    tenantId: "tenant-a",
    trial: { trialId: "trial-1", attemptId: "attempt-1" },
    outcome: "first",
  });
  await assert.rejects(
    repository.put("tenant-a", "result", {
      tenantId: "tenant-a",
      trial: { trialId: "trial-1", attemptId: "attempt-1" },
      outcome: "conflicting",
    }),
    /Only one immutable result/u,
  );
});

test("Web Crypto envelope detects payload and signature mutations", async () => {
  const key = "development-only-test-key-with-sufficient-entropy";
  const envelope = await signEnvelope(
    { resultId: "result-1", traceDigest: await contentAddress({ trace: 1 }) },
    key,
    "issuer-key-1",
    "2026-07-11T00:00:00.000Z",
  );
  assert.equal(await verifyEnvelope(envelope, key, "issuer-key-1"), true);

  const tamperedPayload = {
    ...envelope,
    payload: { ...envelope.payload, resultId: "result-tampered" },
  };
  assert.equal(await verifyEnvelope(tamperedPayload, key, "issuer-key-1"), false);
  assert.equal(await verifyEnvelope({ ...envelope, signature: `${envelope.signature}x` }, key), false);
  assert.equal(await verifyEnvelope(envelope, key, "wrong-key-id"), false);
});
