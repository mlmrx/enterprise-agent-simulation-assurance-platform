import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeJson, deriveRedactedRegressionScenario } from "../../lib/easap/index.ts";
import type { PrivacyReview, SyntheticIncident } from "../../lib/easap/types.ts";
import { ZERO_DIGEST } from "./fixtures.ts";

const incident: SyntheticIncident = {
  incidentId: "synthetic-incident-1",
  tenantId: "tenant-a",
  synthetic: true,
  classification: "RESTRICTED",
  initialState: {
    internalId: "customer-raw-123",
    customer: { email: "alice@example.com", tier: "gold" },
  },
  events: [
    {
      eventId: "event-1",
      at: 10,
      actor: "subject",
      type: "customer.lookup",
      payload: {
        customer: {
          name: "Alice Example",
          note: "Call 415-555-1212 about SSN 123-45-6789",
        },
      },
    },
  ],
  protectedPaths: ["/initialState/internalId"],
};

const approvedReview: PrivacyReview = {
  reviewer: "privacy-officer",
  reviewedAt: "2026-07-11T00:00:00.000Z",
  approved: true,
  notes: "Verified with alice@example.com",
};

test("synthetic incident conversion emits a privacy-reviewed redacted regression", async () => {
  const regression = await deriveRedactedRegressionScenario(incident, approvedReview, {
    worldDigest: ZERO_DIGEST,
  });
  const serialized = canonicalizeJson(regression.scenario);

  assert.equal(regression.scenario.classification, "STANDARD");
  assert.equal(regression.scenario.fixtures.privacyReviewed, true);
  assert.match(regression.scenarioDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(regression.redactions.length >= 4);
  assert.equal(serialized.includes("alice@example.com"), false);
  assert.equal(serialized.includes("Alice Example"), false);
  assert.equal(serialized.includes("415-555-1212"), false);
  assert.equal(serialized.includes("123-45-6789"), false);
  assert.equal(serialized.includes("customer-raw-123"), false);
  assert.equal(serialized.includes("[REDACTED"), true);
  assert.equal(regression.review.notes?.includes("alice@example.com"), false);
});

test("regression publication fails closed without privacy approval", async () => {
  await assert.rejects(
    deriveRedactedRegressionScenario(
      incident,
      { ...approvedReview, approved: false },
      { worldDigest: ZERO_DIGEST },
    ),
    /Privacy review approval is required/u,
  );
});
