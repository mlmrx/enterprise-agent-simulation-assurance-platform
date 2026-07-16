import { canonicalizeJson, contentAddress } from "./canonical.ts";
import type { ContentDigest } from "./types.ts";

export type ArtifactKind =
  | "subject"
  | "world"
  | "scenario"
  | "campaign"
  | "trial"
  | "observation"
  | "finding"
  | "profile"
  | "decision"
  | "certificate"
  | "result"
  | "regression";

export interface StoredArtifact<T> {
  readonly tenantId: string;
  readonly kind: ArtifactKind;
  readonly digest: ContentDigest;
  readonly value: T;
}

export class RepositoryIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryIntegrityError";
  }
}

function assertScopePart(value: string, name: string): void {
  if (value.trim().length === 0) throw new TypeError(`${name} must not be empty`);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function immutableJsonClone<T>(value: T): T {
  return deepFreeze(JSON.parse(canonicalizeJson(value)) as T);
}

/**
 * Append-only, tenant-scoped reference repository.
 *
 * It is intentionally an in-memory adapter, but enforces the same two important
 * boundaries expected from a durable implementation: tenant scope is part of
 * every lookup, and stored values can never be updated in place.
 */
export class ImmutableTenantRepository {
  readonly #tenants = new Map<string, Map<ArtifactKind, Map<ContentDigest, StoredArtifact<unknown>>>>();
  readonly #sealedResultAttempts = new Map<string, ContentDigest>();

  #resultAttemptKey<T>(tenantId: string, kind: ArtifactKind, value: T): string | undefined {
    if (kind !== "result") return undefined;
    const candidate = value as {
      readonly tenantId?: unknown;
      readonly trial?: { readonly trialId?: unknown; readonly attemptId?: unknown };
    };
    if (candidate.tenantId !== tenantId) {
      throw new RepositoryIntegrityError("A result manifest must bind the repository tenant");
    }
    if (typeof candidate.trial?.trialId !== "string" || typeof candidate.trial.attemptId !== "string") {
      throw new RepositoryIntegrityError("A result manifest must bind a trial ID and attempt ID");
    }
    return `${tenantId}\u0000${candidate.trial.trialId}\u0000${candidate.trial.attemptId}`;
  }

  async put<T>(
    tenantId: string,
    kind: ArtifactKind,
    value: T,
    expectedDigest?: ContentDigest,
  ): Promise<StoredArtifact<T>> {
    assertScopePart(tenantId, "tenantId");
    const snapshot = immutableJsonClone(value);
    const digest = await contentAddress(snapshot);
    if (expectedDigest !== undefined && digest !== expectedDigest) {
      throw new RepositoryIntegrityError(`Content digest mismatch: expected ${expectedDigest}, received ${digest}`);
    }
    const resultAttemptKey = this.#resultAttemptKey(tenantId, kind, snapshot);
    const priorResultDigest = resultAttemptKey ? this.#sealedResultAttempts.get(resultAttemptKey) : undefined;
    if (priorResultDigest !== undefined && priorResultDigest !== digest) {
      throw new RepositoryIntegrityError("Only one immutable result may be sealed per trial attempt");
    }

    let kinds = this.#tenants.get(tenantId);
    if (!kinds) {
      kinds = new Map();
      this.#tenants.set(tenantId, kinds);
    }

    let artifacts = kinds.get(kind);
    if (!artifacts) {
      artifacts = new Map();
      kinds.set(kind, artifacts);
    }

    const existing = artifacts.get(digest);
    if (existing) return existing as StoredArtifact<T>;

    const stored = deepFreeze({ tenantId, kind, digest, value: snapshot });
    artifacts.set(digest, stored as StoredArtifact<unknown>);
    if (resultAttemptKey) this.#sealedResultAttempts.set(resultAttemptKey, digest);
    return stored;
  }

  get<T>(tenantId: string, kind: ArtifactKind, digest: ContentDigest): StoredArtifact<T> | undefined {
    assertScopePart(tenantId, "tenantId");
    return this.#tenants.get(tenantId)?.get(kind)?.get(digest) as StoredArtifact<T> | undefined;
  }

  require<T>(tenantId: string, kind: ArtifactKind, digest: ContentDigest): StoredArtifact<T> {
    const artifact = this.get<T>(tenantId, kind, digest);
    if (!artifact) throw new Error(`No ${kind} artifact ${digest} exists in tenant ${tenantId}`);
    return artifact;
  }

  has(tenantId: string, kind: ArtifactKind, digest: ContentDigest): boolean {
    return this.get(tenantId, kind, digest) !== undefined;
  }

  list<T>(tenantId: string, kind: ArtifactKind): readonly StoredArtifact<T>[] {
    assertScopePart(tenantId, "tenantId");
    const values = this.#tenants.get(tenantId)?.get(kind)?.values();
    if (!values) return Object.freeze([]);
    return Object.freeze(
      [...values].sort((left, right) => left.digest.localeCompare(right.digest)) as StoredArtifact<T>[],
    );
  }

  count(tenantId: string, kind?: ArtifactKind): number {
    assertScopePart(tenantId, "tenantId");
    const kinds = this.#tenants.get(tenantId);
    if (!kinds) return 0;
    if (kind !== undefined) return kinds.get(kind)?.size ?? 0;
    let total = 0;
    for (const artifacts of kinds.values()) total += artifacts.size;
    return total;
  }
}
