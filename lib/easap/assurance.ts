import { canonicalizeJson, contentAddress } from "./canonical.ts";
import { verifyEnvelope, type HmacKeyMaterial } from "./crypto.ts";
import type {
  AssuranceCertificate,
  AssuranceDecision,
  AssuranceProfile,
  ContentDigest,
  DeploymentRestriction,
  JsonObject,
  MaterialChangeAssessment,
  MaterialComponent,
  ReleaseContext,
  ReleaseGateResult,
  ResultManifest,
  RevocationRecord,
  SignedEnvelope,
  SubjectBundle,
} from "./types.ts";

function equal(left: unknown, right: unknown): boolean {
  return canonicalizeJson(left) === canonicalizeJson(right);
}

function dependencySubset(subject: SubjectBundle, kind: "connector" | "runtime"): unknown {
  if (kind === "connector") return subject.dependencies.filter((dependency) => dependency.kind === "connector");
  return {
    runtime: subject.runtime,
    dependencies: subject.dependencies.filter((dependency) => dependency.kind !== "connector"),
  };
}

function componentChanged(component: MaterialComponent, baseline: SubjectBundle, candidate: SubjectBundle): boolean {
  switch (component) {
    case "model":
      return !equal(baseline.model, candidate.model);
    case "prompt":
      return !equal(baseline.prompts, candidate.prompts);
    case "tool":
      return !equal(baseline.tools, candidate.tools);
    case "policy":
      return !equal(baseline.policies, candidate.policies);
    case "memory-schema":
      return baseline.memory.schemaDigest !== candidate.memory.schemaDigest;
    case "connector":
      return !equal(dependencySubset(baseline, "connector"), dependencySubset(candidate, "connector"));
    case "runtime-dependency":
      return !equal(dependencySubset(baseline, "runtime"), dependencySubset(candidate, "runtime"));
  }
}

const MATERIAL_COMPONENTS: readonly MaterialComponent[] = [
  "model",
  "prompt",
  "tool",
  "policy",
  "memory-schema",
  "connector",
  "runtime-dependency",
];

export function assessMaterialChange(
  baseline: SubjectBundle,
  candidate: SubjectBundle,
  profile: AssuranceProfile,
): MaterialChangeAssessment {
  const changedComponents = MATERIAL_COMPONENTS.filter((component) => componentChanged(component, baseline, candidate));
  const invalidatingComponents: MaterialComponent[] = [];
  const narrowingComponents: MaterialComponent[] = [];
  const ignoredComponents: MaterialComponent[] = [];
  for (const component of changedComponents) {
    const effect =
      profile.materialityRules.find((rule) => rule.component === component)?.effect ?? profile.defaultMaterialityEffect;
    if (effect === "invalidate") invalidatingComponents.push(component);
    else if (effect === "narrow") narrowingComponents.push(component);
    else ignoredComponents.push(component);
  }
  return {
    changedComponents,
    invalidatingComponents,
    narrowingComponents,
    ignoredComponents,
    effect: invalidatingComponents.length > 0 ? "invalidate" : narrowingComponents.length > 0 ? "narrow" : "none",
  };
}

export async function invalidateDecisionForMaterialChange(
  prior: AssuranceDecision,
  baseline: SubjectBundle,
  candidate: SubjectBundle,
  profile: AssuranceProfile,
  issuedAt = new Date().toISOString(),
  narrowingConditions: readonly DeploymentRestriction[] = prior.conditions,
): Promise<AssuranceDecision> {
  const assessment = assessMaterialChange(baseline, candidate, profile);
  if (assessment.effect === "none") return prior;
  const subjectDigest = await contentAddress(candidate);
  return {
    ...prior,
    decisionId: `${prior.decisionId}-material-change`,
    subjectDigest,
    outcome: assessment.effect === "invalidate" ? "INVALIDATED" : "NARROWED",
    conditions: assessment.effect === "narrow" ? narrowingConditions : [],
    issuedAt,
    invalidation: {
      changedComponents: assessment.changedComponents,
      priorDecisionId: prior.decisionId,
    },
  };
}

export interface AssuranceDecisionInput {
  readonly decisionId: string;
  readonly profile: AssuranceProfile;
  readonly subjectDigest: ContentDigest;
  readonly results: readonly ResultManifest[];
  readonly executedSuiteDigests: readonly ContentDigest[];
  readonly coverage: JsonObject;
  readonly residualRisk: JsonObject;
  readonly approver: string;
  readonly conditions?: readonly DeploymentRestriction[];
  readonly issuedAt?: string;
}

function addSeconds(iso: string, seconds: number): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) throw new TypeError(`Invalid ISO timestamp: ${iso}`);
  return new Date(timestamp + seconds * 1000).toISOString();
}

/** Evaluate profile suite/measure gates and bind the exact result set into an immutable decision. */
export async function decideAssurance(input: AssuranceDecisionInput): Promise<AssuranceDecision> {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const suiteSet = new Set(input.executedSuiteDigests);
  const suitesSatisfied = input.profile.requiredSuites.every((suite) => suiteSet.has(suite));
  const unwaivedFindings = input.results
    .flatMap((result) => result.findings)
    .filter(
      (finding) =>
        !input.profile.exceptions.includes(finding.findingId) &&
        !input.profile.exceptions.includes(finding.failureClass),
    );
  const thresholdsSatisfied = input.profile.thresholds.every((threshold) => {
    const values = input.results.flatMap((result) =>
      result.measures.filter((measure) => measure.name === threshold.measure).map((measure) => measure.value),
    );
    if (values.length === 0) return false;
    const aggregate = values.reduce((sum, value) => sum + value, 0) / values.length;
    return threshold.operator === "gte" ? aggregate >= threshold.value : aggregate <= threshold.value;
  });
  const measuresPresent = input.profile.measures.every((requiredMeasure) =>
    input.results.every((result) => result.measures.some((measure) => measure.name === requiredMeasure)),
  );
  const rejected =
    !suitesSatisfied ||
    !measuresPresent ||
    !thresholdsSatisfied ||
    unwaivedFindings.some((finding) => finding.severity === "HIGH" || finding.severity === "CRITICAL");
  const conditions = input.conditions ?? [];
  const profileDigest = await contentAddress(input.profile);
  const resultDigests = await Promise.all(input.results.map((result) => contentAddress(result)));
  return {
    decisionId: input.decisionId,
    profileDigest,
    subjectDigest: input.subjectDigest,
    resultDigests,
    suiteDigests: [...input.executedSuiteDigests],
    coverage: input.coverage,
    residualRisk: input.residualRisk,
    approver: input.approver,
    conditions,
    outcome: rejected ? "REJECTED" : conditions.length > 0 ? "CONDITIONAL" : "APPROVED",
    issuedAt,
    expiresAt: addSeconds(issuedAt, input.profile.maximumValiditySeconds),
  };
}

export interface CertificateInput {
  readonly certificateId: string;
  readonly tenantId: string;
  readonly decision: AssuranceDecision;
  readonly issuer: string;
  readonly revocationEndpoint: string;
}

export async function issueAssuranceCertificate(input: CertificateInput): Promise<AssuranceCertificate> {
  if (input.decision.outcome !== "APPROVED" && input.decision.outcome !== "CONDITIONAL") {
    throw new Error(`Cannot certify an assurance decision with outcome ${input.decision.outcome}`);
  }
  if (input.decision.outcome === "CONDITIONAL" && input.decision.conditions.length === 0) {
    throw new Error("A conditional decision must contain machine-enforceable deployment restrictions");
  }
  if (
    !Number.isFinite(Date.parse(input.decision.issuedAt)) ||
    !Number.isFinite(Date.parse(input.decision.expiresAt)) ||
    Date.parse(input.decision.expiresAt) <= Date.parse(input.decision.issuedAt)
  ) {
    throw new Error("Certificate validity interval is invalid");
  }
  return {
    certificateId: input.certificateId,
    tenantId: input.tenantId,
    subjectDigest: input.decision.subjectDigest,
    profileDigest: input.decision.profileDigest,
    suiteDigests: input.decision.suiteDigests,
    decisionDigest: await contentAddress(input.decision),
    decision: input.decision.outcome,
    conditions: input.decision.conditions,
    issuedAt: input.decision.issuedAt,
    expiresAt: input.decision.expiresAt,
    issuer: input.issuer,
    revocationEndpoint: input.revocationEndpoint,
  };
}

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/** Immediate, connected revocation adapter; a durable deployment can replace it behind the same lookup shape. */
export class InMemoryRevocationRegistry {
  readonly #records = new Map<string, RevocationRecord>();

  #key(tenantId: string, certificateId: string): string {
    return `${tenantId}\u0000${certificateId}`;
  }

  revoke(record: RevocationRecord): RevocationRecord {
    if (
      record.tenantId.trim().length === 0 ||
      record.certificateId.trim().length === 0 ||
      record.revokedBy.trim().length === 0 ||
      !Number.isFinite(Date.parse(record.effectiveAt))
    ) {
      throw new TypeError("Revocation record contains an invalid identity or effective time");
    }
    const key = this.#key(record.tenantId, record.certificateId);
    const existing = this.#records.get(key);
    if (existing) return existing;
    const immutable = freeze({ ...record });
    this.#records.set(key, immutable);
    return immutable;
  }

  get(tenantId: string, certificateId: string): RevocationRecord | undefined {
    return this.#records.get(this.#key(tenantId, certificateId));
  }

  isRevoked(tenantId: string, certificateId: string, at: string): boolean {
    const record = this.get(tenantId, certificateId);
    if (!record) return false;
    const checkedAt = Date.parse(at);
    const effectiveAt = Date.parse(record.effectiveAt);
    return Number.isFinite(checkedAt) && Number.isFinite(effectiveAt) && effectiveAt <= checkedAt;
  }

  list(tenantId: string): readonly RevocationRecord[] {
    return Object.freeze(
      [...this.#records.values()]
        .filter((record) => record.tenantId === tenantId)
        .sort((left, right) => left.certificateId.localeCompare(right.certificateId)),
    );
  }
}

function restrictionFailure(restriction: DeploymentRestriction, context: ReleaseContext): string | undefined {
  switch (restriction.kind) {
    case "allowed-environments":
      return restriction.environments.includes(context.environment) ? undefined : "Deployment environment is not allowed";
    case "allowed-tools":
      return context.tools.every((tool) => restriction.tools.includes(tool)) ? undefined : "Deployment requests a disallowed tool";
    case "maximum-authority":
      return context.authority <= restriction.authority ? undefined : "Deployment authority exceeds certificate maximum";
    case "required-human-gates":
      return restriction.gates.every((gate) => context.satisfiedHumanGates.includes(gate))
        ? undefined
        : "A required human gate is not satisfied";
    case "monitoring-policy":
      return restriction.policyDigest === context.monitoringPolicyDigest
        ? undefined
        : "Required monitoring policy is not active";
    case "isolation-class":
      return restriction.classes.includes(context.isolationClass) ? undefined : "Isolation class is not permitted";
    case "deny-network":
      return context.networkDestinations.every((destination) => restriction.except.includes(destination))
        ? undefined
        : "Network destination is denied by certificate";
  }
}

export interface ReleaseGateInput {
  readonly certificate: SignedEnvelope<AssuranceCertificate>;
  readonly key: HmacKeyMaterial;
  readonly context: ReleaseContext;
  readonly revocations: InMemoryRevocationRegistry;
  readonly expectedKeyId?: string;
  readonly trustedIssuers?: readonly string[];
}

/** Independently authenticate a certificate and fail closed on binding, expiry, restriction, or revocation errors. */
export async function evaluateReleaseGate(input: ReleaseGateInput): Promise<ReleaseGateResult> {
  const reasons: string[] = [];
  if (!(await verifyEnvelope(input.certificate, input.key, input.expectedKeyId))) {
    return { allowed: false, reasons: ["Certificate signature or content digest is invalid"] };
  }
  const certificate = input.certificate.payload;
  if (certificate.tenantId !== input.context.tenantId) reasons.push("Certificate tenant does not match release context");
  if (certificate.subjectDigest !== input.context.subjectDigest) reasons.push("Certificate subject digest does not match release artifact");
  if (input.trustedIssuers && !input.trustedIssuers.includes(certificate.issuer)) reasons.push("Certificate issuer is not trusted");
  const now = Date.parse(input.context.now);
  const issuedAt = Date.parse(certificate.issuedAt);
  const expiresAt = Date.parse(certificate.expiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    reasons.push("Certificate or release time is invalid");
  } else {
    if (now < issuedAt) reasons.push("Certificate is not yet valid");
    if (now >= expiresAt) reasons.push("Certificate has expired");
  }
  if (input.revocations.isRevoked(certificate.tenantId, certificate.certificateId, input.context.now)) {
    reasons.push("Certificate is revoked");
  }
  for (const restriction of certificate.conditions) {
    const failure = restrictionFailure(restriction, input.context);
    if (failure) reasons.push(failure);
  }
  return { allowed: reasons.length === 0, reasons, certificateId: certificate.certificateId };
}
