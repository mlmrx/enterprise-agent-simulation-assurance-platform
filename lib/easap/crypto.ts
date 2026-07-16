import { canonicalizeJson, contentAddress } from "./canonical.ts";
import type { AssuranceCertificate, ResultManifest, SignedEnvelope } from "./types.ts";

export type HmacKeyMaterial = CryptoKey | Uint8Array | ArrayBuffer | string;

function isCryptoKey(value: HmacKeyMaterial): value is CryptoKey {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}

function keyBytes(value: Exclude<HmacKeyMaterial, CryptoKey>): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value.slice(0);
  const source = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
}

export async function importHmacKey(
  material: HmacKeyMaterial,
  usages: readonly KeyUsage[] = ["sign", "verify"],
): Promise<CryptoKey> {
  if (isCryptoKey(material)) return material;
  return globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes(material),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [...usages],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new TypeError("Invalid base64url signature");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function signatureInput<T>(envelope: Omit<SignedEnvelope<T>, "signature">): ArrayBuffer {
  const bytes = new TextEncoder().encode(canonicalizeJson(envelope));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Signs a result, decision, or certificate envelope with Web Crypto HMAC-SHA-256. */
export async function signEnvelope<T>(
  payload: T,
  key: HmacKeyMaterial,
  keyId: string,
  issuedAt = new Date().toISOString(),
): Promise<SignedEnvelope<T>> {
  if (keyId.trim().length === 0) throw new TypeError("keyId must not be empty");
  const unsigned: Omit<SignedEnvelope<T>, "signature"> = {
    envelopeVersion: "easap-signed-envelope-v1",
    algorithm: "HMAC-SHA-256",
    keyId,
    issuedAt,
    payloadDigest: await contentAddress(payload),
    payload,
  };
  const cryptoKey = await importHmacKey(key, ["sign"]);
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, signatureInput(unsigned));
  return Object.freeze({ ...unsigned, signature: toBase64Url(new Uint8Array(signature)) });
}

/** Verifies both the bound payload digest and the envelope authentication tag. */
export async function verifyEnvelope<T>(
  envelope: SignedEnvelope<T>,
  key: HmacKeyMaterial,
  expectedKeyId?: string,
): Promise<boolean> {
  try {
    if (
      envelope.envelopeVersion !== "easap-signed-envelope-v1" ||
      envelope.algorithm !== "HMAC-SHA-256" ||
      (expectedKeyId !== undefined && envelope.keyId !== expectedKeyId) ||
      (await contentAddress(envelope.payload)) !== envelope.payloadDigest
    ) {
      return false;
    }
    const { signature, ...unsigned } = envelope;
    const cryptoKey = await importHmacKey(key, ["verify"]);
    return globalThis.crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      fromBase64Url(signature),
      signatureInput(unsigned),
    );
  } catch {
    return false;
  }
}

export function signResultEnvelope(
  result: ResultManifest,
  key: HmacKeyMaterial,
  keyId: string,
  issuedAt?: string,
): Promise<SignedEnvelope<ResultManifest>> {
  return signEnvelope(result, key, keyId, issuedAt);
}

export function verifyResultEnvelope(
  envelope: SignedEnvelope<ResultManifest>,
  key: HmacKeyMaterial,
  expectedKeyId?: string,
): Promise<boolean> {
  return verifyEnvelope(envelope, key, expectedKeyId);
}

export function signCertificateEnvelope(
  certificate: AssuranceCertificate,
  key: HmacKeyMaterial,
  keyId: string,
  issuedAt?: string,
): Promise<SignedEnvelope<AssuranceCertificate>> {
  return signEnvelope(certificate, key, keyId, issuedAt);
}

export function verifyCertificateEnvelope(
  envelope: SignedEnvelope<AssuranceCertificate>,
  key: HmacKeyMaterial,
  expectedKeyId?: string,
): Promise<boolean> {
  return verifyEnvelope(envelope, key, expectedKeyId);
}
