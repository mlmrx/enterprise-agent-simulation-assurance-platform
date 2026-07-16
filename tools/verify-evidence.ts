import { readFile } from "node:fs/promises";
import { verifyEnvelope, type SignedEnvelope } from "../lib/easap/index.ts";

function usage(): never {
  console.error(
    "Usage: npm run verify:evidence -- <export.json> [--allow-reference-key]\n" +
      "Set EASAP_VERIFY_KEY for a non-reference HMAC verification key.",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const file = args.find((argument) => !argument.startsWith("--"));
if (!file) usage();

const document = JSON.parse(await readFile(file, "utf8")) as {
  data?: { envelope?: SignedEnvelope<unknown> };
  envelope?: SignedEnvelope<unknown>;
  envelopeVersion?: string;
};
const envelope =
  document.data?.envelope ??
  document.envelope ??
  (document.envelopeVersion ? (document as SignedEnvelope<unknown>) : undefined);
if (!envelope) {
  console.error(JSON.stringify({ verified: false, reason: "No signed envelope found" }));
  process.exit(1);
}

const referenceAllowed = args.includes("--allow-reference-key");
const key = process.env.EASAP_VERIFY_KEY;
if (!key && !referenceAllowed) {
  console.error(
    JSON.stringify({
      verified: false,
      reason: "EASAP_VERIFY_KEY is required unless --allow-reference-key is explicit",
    }),
  );
  process.exit(2);
}
const material = key ?? "EASAP-LOCAL-REFERENCE-KEY-NOT-FOR-PRODUCTION-2026";
const verified = await verifyEnvelope(envelope, material, envelope.keyId);
console.log(
  JSON.stringify(
    {
      verified,
      keyId: envelope.keyId,
      algorithm: envelope.algorithm,
      payloadDigest: envelope.payloadDigest,
      issuedAt: envelope.issuedAt,
      trust: key ? "configured-verification-key" : "local-reference-key",
    },
    null,
    2,
  ),
);
if (!verified) process.exit(1);
