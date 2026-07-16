import { readFile } from "node:fs/promises";
import { evaluateReleaseGate, InMemoryRevocationRegistry, type AssuranceCertificate, type ReleaseContext, type RevocationRecord, type SignedEnvelope } from "../lib/easap/index.ts";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const certificateFile = option("--certificate");
const contextFile = option("--context");
const revocationsFile = option("--revocations");
if (!certificateFile || !contextFile) {
  console.error(
    "Usage: npm run release:gate -- --certificate <envelope.json> --context <context.json> [--revocations <records.json>] [--allow-reference-key]",
  );
  process.exit(2);
}

const certificateDocument = JSON.parse(await readFile(certificateFile, "utf8")) as {
  data?: { certificate?: SignedEnvelope<AssuranceCertificate>; envelope?: SignedEnvelope<AssuranceCertificate> };
  certificate?: SignedEnvelope<AssuranceCertificate>;
  envelope?: SignedEnvelope<AssuranceCertificate>;
  envelopeVersion?: string;
};
const certificate =
  certificateDocument.data?.certificate ??
  certificateDocument.data?.envelope ??
  certificateDocument.certificate ??
  certificateDocument.envelope ??
  (certificateDocument.envelopeVersion
    ? (certificateDocument as SignedEnvelope<AssuranceCertificate>)
    : undefined);
if (!certificate) {
  console.error(JSON.stringify({ allowed: false, reasons: ["No certificate envelope found"] }));
  process.exit(1);
}

const context = JSON.parse(await readFile(contextFile, "utf8")) as ReleaseContext;
const revocations = new InMemoryRevocationRegistry();
if (revocationsFile) {
  const records = JSON.parse(await readFile(revocationsFile, "utf8")) as RevocationRecord[];
  for (const record of records) revocations.revoke(record);
}
const configuredKey = process.env.EASAP_VERIFY_KEY;
const allowReferenceKey = process.argv.includes("--allow-reference-key");
if (!configuredKey && !allowReferenceKey) {
  console.error(JSON.stringify({ allowed: false, reasons: ["Verification key is not configured"] }));
  process.exit(2);
}

const result = await evaluateReleaseGate({
  certificate,
  key: configuredKey ?? "EASAP-LOCAL-REFERENCE-KEY-NOT-FOR-PRODUCTION-2026",
  context,
  revocations,
  expectedKeyId: certificate.keyId,
});
console.log(JSON.stringify(result, null, 2));
if (!result.allowed) process.exit(1);
