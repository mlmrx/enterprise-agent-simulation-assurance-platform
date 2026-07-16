import type { Seed } from "./types.ts";

export const PRNG_ALGORITHM = "mulberry32-fnv1a-v1" as const;

function normalizeSeed(seed: Seed): string {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) throw new TypeError("PRNG seed must be finite");
    return `number:${Object.is(seed, -0) ? 0 : seed}`;
  }
  return `string:${seed}`;
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Pinned, deterministic PRNG for STANDARD-reference simulations. */
export class SeededPrng {
  readonly algorithm = PRNG_ALGORITHM;
  readonly seed: Seed;
  #state: number;

  constructor(seed: Seed) {
    this.seed = seed;
    this.#state = fnv1a(normalizeSeed(seed));
  }

  nextUint32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  /** Uniform value in the half-open interval [0, 1). */
  next(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  integer(minInclusive: number, maxExclusive: number): number {
    if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive)) {
      throw new TypeError("PRNG integer bounds must be safe integers");
    }
    if (maxExclusive <= minInclusive) throw new RangeError("maxExclusive must exceed minInclusive");
    return minInclusive + Math.floor(this.next() * (maxExclusive - minInclusive));
  }

  boolean(probability = 0.5): boolean {
    if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
      throw new RangeError("Probability must be between 0 and 1");
    }
    return this.next() < probability;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new RangeError("Cannot pick from an empty collection");
    return values[this.integer(0, values.length)]!;
  }

  /** Creates an independent deterministic stream for a named component path. */
  fork(componentPath: string): SeededPrng {
    return new SeededPrng(`${normalizeSeed(this.seed)}|${componentPath}`);
  }
}
