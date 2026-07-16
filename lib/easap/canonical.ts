import type { ContentDigest } from "./types.ts";

function canonicalNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("Canonical JSON does not support non-finite numbers");
  }
  return Object.is(value, -0) ? "0" : JSON.stringify(value);
}

function serialize(value: unknown, inArray: boolean): string | undefined {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return canonicalNumber(value);
    case "undefined":
    case "function":
    case "symbol":
      if (inArray) throw new TypeError("Canonical JSON does not support undefined array elements");
      return undefined;
    case "bigint":
      throw new TypeError("Canonical JSON does not support bigint values");
    case "object": {
      if (Array.isArray(value)) {
        const items = value.map((item) => serialize(item, true));
        return `[${items.join(",")}]`;
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError("Canonical JSON supports only plain objects and arrays");
      }

      const object = value as Record<string, unknown>;
      const entries: string[] = [];
      for (const key of Object.keys(object).sort()) {
        const serialized = serialize(object[key], false);
        if (serialized !== undefined) entries.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${entries.join(",")}}`;
    }
  }
}

/** Deterministic JSON encoding with lexicographically sorted object keys. */
export function canonicalizeJson(value: unknown): string {
  const serialized = serialize(value, false);
  if (serialized === undefined) throw new TypeError("A top-level canonical JSON value is required");
  return serialized;
}

function toHex(bytes: Uint8Array): string {
  let result = "";
  for (const byte of bytes) result += byte.toString(16).padStart(2, "0");
  return result;
}

export async function sha256Bytes(value: Uint8Array): Promise<ContentDigest> {
  const owned = new Uint8Array(value.byteLength);
  owned.set(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", owned);
  return `sha256:${toHex(new Uint8Array(digest))}`;
}

/** Content address a JSON-compatible value using canonical JSON and SHA-256. */
export async function contentAddress(value: unknown): Promise<ContentDigest> {
  return sha256Bytes(new TextEncoder().encode(canonicalizeJson(value)));
}

export async function verifyContentAddress(value: unknown, expected: ContentDigest): Promise<boolean> {
  return (await contentAddress(value)) === expected;
}

export const EMPTY_SHA256: ContentDigest =
  "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
