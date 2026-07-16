import assert from "node:assert/strict";
import test from "node:test";

import { identityFromRequest } from "../../lib/platform/auth.ts";

test("remote requests fail closed in the default local auth mode", () => {
  const previous = process.env.EASAP_AUTH_MODE;
  delete process.env.EASAP_AUTH_MODE;
  try {
    assert.equal(
      identityFromRequest(new Request("https://assurance.example/v1/subjects")),
      null,
    );
  } finally {
    if (previous === undefined) delete process.env.EASAP_AUTH_MODE;
    else process.env.EASAP_AUTH_MODE = previous;
  }
});

test("shared-token mode authenticates explicit portable identity headers", () => {
  const previousMode = process.env.EASAP_AUTH_MODE;
  const previousToken = process.env.EASAP_API_TOKEN;
  process.env.EASAP_AUTH_MODE = "shared-token";
  process.env.EASAP_API_TOKEN = "test-secret";
  try {
    const identity = identityFromRequest(
      new Request("https://assurance.example/v1/subjects", {
        headers: {
          authorization: "Bearer test-secret",
          "x-easap-user": "Operator@Example.com",
          "x-easap-tenant": "tenant-acme",
          "x-easap-roles": "assurance_owner,auditor",
        },
      }),
    );
    assert.deepEqual(identity, {
      principal: "operator@example.com",
      tenantId: "tenant-acme",
      roles: ["assurance_owner", "auditor"],
      source: "external",
    });
  } finally {
    if (previousMode === undefined) delete process.env.EASAP_AUTH_MODE;
    else process.env.EASAP_AUTH_MODE = previousMode;
    if (previousToken === undefined) delete process.env.EASAP_API_TOKEN;
    else process.env.EASAP_API_TOKEN = previousToken;
  }
});
