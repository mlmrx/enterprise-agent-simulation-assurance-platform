/** EASAP-PS-001 STANDARD-reference domain contracts. */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type ContentDigest = `sha256:${string}`;
export type IsolationClass = "STANDARD" | "RESTRICTED" | "HIGH-RISK" | "SHADOW";
export type RiskClass = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type Seed = string | number;

export interface ModelManifest {
  readonly provider: string;
  readonly name: string;
  readonly version: string;
  readonly digest?: ContentDigest;
}

export interface ToolManifest {
  readonly name: string;
  readonly version: string;
  readonly digest: ContentDigest;
}

export interface DependencyManifest {
  readonly name: string;
  readonly version: string;
  readonly digest: ContentDigest;
  readonly kind?: "connector" | "runtime" | "library" | "service";
}

export type CapabilityKind =
  | "time"
  | "random"
  | "network"
  | "credential"
  | "filesystem"
  | "tool"
  | "external-effect";

export interface Capability {
  readonly kind: CapabilityKind;
  /** Exact resource name, or `*` only when the manifest deliberately grants the whole capability class. */
  readonly resource: string;
  readonly operations?: readonly string[];
}

export interface CapabilityRequest extends Capability {
  readonly operation?: string;
}

export interface SubjectBundle {
  readonly subjectId: string;
  readonly version: string;
  readonly artifactDigests: Readonly<Record<string, ContentDigest>>;
  readonly sbomDigest: ContentDigest;
  readonly model: ModelManifest;
  readonly prompts: Readonly<Record<string, ContentDigest>>;
  readonly tools: readonly ToolManifest[];
  readonly memory: {
    readonly schemaDigest: ContentDigest;
    readonly imageDigest?: ContentDigest;
  };
  readonly policies: readonly ContentDigest[];
  readonly dependencies: readonly DependencyManifest[];
  readonly capabilities: readonly Capability[];
  readonly runtime: {
    readonly name: string;
    readonly version: string;
    readonly digest: ContentDigest;
  };
  readonly buildProvenanceDigest: ContentDigest;
}

export interface WorldTransitionComponent {
  readonly componentId: string;
  readonly kind: "discrete-event" | "state-machine" | "rules" | "learned";
  readonly version: string;
  readonly digest: ContentDigest;
  readonly trainingDataBoundary?: string;
  readonly calibrationEvidenceDigest?: ContentDigest;
  readonly emitsUncertainty?: boolean;
  readonly deterministicFallbackDigest?: ContentDigest;
}

export interface WorldModel {
  readonly worldId: string;
  readonly version: string;
  readonly entities: JsonObject;
  readonly transitionComponents: readonly WorldTransitionComponent[];
  readonly clocks: JsonObject;
  readonly resources: JsonObject;
  readonly uncertainty: JsonObject;
  readonly limitations: readonly string[];
  readonly fidelityClaims: readonly string[];
}

export interface StateMutation {
  readonly op: "set" | "delete" | "increment" | "append";
  /** RFC 6901 JSON Pointer into scenario state. */
  readonly path: string;
  readonly value?: JsonValue;
}

export interface ScenarioActor {
  readonly actorId: string;
  readonly kind: "subject" | "user" | "environment" | "adversary" | "human" | "service";
  readonly capabilities?: readonly Capability[];
}

export interface ScenarioEvent {
  readonly eventId: string;
  readonly at: number;
  readonly phase?: number;
  readonly actor: string;
  readonly type: string;
  readonly payload?: JsonValue;
  readonly mutations?: readonly StateMutation[];
  readonly requiredCapabilities?: readonly CapabilityRequest[];
  readonly causeId?: string;
  readonly correlationId?: string;
}

export type FaultKind =
  | "latency"
  | "timeout"
  | "partial-response"
  | "stale-data"
  | "inconsistent-replica"
  | "permission-loss"
  | "budget-exhaustion"
  | "dependency-compromise"
  | "human-non-response";

export interface FaultInjectorSpec {
  readonly injectorId: string;
  readonly kind: FaultKind;
  readonly target?: {
    readonly eventId?: string;
    readonly eventType?: string;
    readonly actor?: string;
  };
  readonly probability?: number;
  readonly latencyMs?: number;
  readonly replacementPayload?: JsonValue;
  readonly capability?: CapabilityRequest;
}

export type OracleOperator =
  | "equals"
  | "not-equals"
  | "exists"
  | "not-exists"
  | "greater-than"
  | "greater-than-or-equal"
  | "less-than"
  | "less-than-or-equal"
  | "contains";

export interface OracleSpec {
  readonly oracleId: string;
  readonly version: string;
  readonly input: {
    readonly source: "state" | "last-output" | "observation";
    readonly path?: string;
  };
  readonly decisionRule: OracleOperator;
  readonly expected?: JsonValue;
  readonly tolerance?: number;
  readonly provenanceDigest: ContentDigest;
  readonly failureClass: string;
  readonly severity: FindingSeverity;
}

export interface StopRule {
  readonly kind: "max-events" | "max-logical-time" | "oracle-failure";
  readonly value?: number;
}

export interface Scenario {
  readonly scenarioId: string;
  readonly version: string;
  readonly worldDigest: ContentDigest;
  readonly fixtures: Readonly<Record<string, JsonValue>>;
  readonly actors: readonly ScenarioActor[];
  readonly initialState: JsonObject;
  readonly events: readonly ScenarioEvent[];
  readonly objectives: readonly string[];
  readonly invariants: readonly OracleSpec[];
  readonly expectedObservations: readonly string[];
  readonly injectors: readonly FaultInjectorSpec[];
  readonly oracles: readonly OracleSpec[];
  readonly stopRules: readonly StopRule[];
  readonly classification: IsolationClass;
  readonly dependencyDigests: readonly ContentDigest[];
  readonly hiddenSuiteDigest?: ContentDigest;
}

export interface ResourceLimits {
  readonly maxEvents: number;
  readonly maxLogicalTimeMs: number;
  readonly maxFaults?: number;
  readonly maxTokens?: number;
  readonly maxCost?: number;
}

export interface Campaign {
  readonly campaignId: string;
  readonly subjectDigest: ContentDigest;
  readonly worldDigest: ContentDigest;
  readonly scenarioDigest: ContentDigest;
  readonly seeds: readonly Seed[];
  readonly maxTrials: number;
  readonly resourceLimits: ResourceLimits;
}

export type TrialState = "SEALED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Trial {
  readonly trialId: string;
  readonly attemptId: string;
  readonly campaignId?: string;
  readonly subjectDigest: ContentDigest;
  readonly worldDigest: ContentDigest;
  readonly scenarioDigest: ContentDigest;
  readonly seed: Seed;
  readonly isolationClass: IsolationClass;
  readonly resourceLimits: ResourceLimits;
  readonly environment: JsonObject;
  readonly state: TrialState;
  readonly timestamps: {
    readonly createdAt: string;
    readonly startedAt?: string;
    readonly endedAt?: string;
  };
  readonly harnessVersion: string;
  readonly attestationDigest: ContentDigest;
}

export interface PolicyDecision {
  readonly outcome: "allow" | "deny";
  readonly requests: readonly CapabilityRequest[];
  readonly reason?: string;
}

export interface Observation {
  readonly observationId: string;
  readonly sequence: number;
  readonly logicalTime: number;
  readonly event: {
    readonly eventId: string;
    readonly type: string;
  };
  readonly actor: string;
  readonly causeId?: string;
  readonly correlationId?: string;
  readonly stateBeforeDigest: ContentDigest;
  readonly stateAfterDigest: ContentDigest;
  readonly payloadDigest: ContentDigest;
  readonly output?: JsonValue;
  readonly policyDecision: PolicyDecision;
  readonly injectedFaults: readonly string[];
  readonly evidence: readonly ContentDigest[];
  readonly trace: {
    readonly previousDigest: ContentDigest;
    readonly digest: ContentDigest;
  };
}

export type FindingSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface MinimalCase {
  readonly scenarioDigest: ContentDigest;
  readonly eventIds: readonly string[];
  readonly verified: boolean;
}

export interface Finding {
  readonly findingId: string;
  readonly failureClass: string;
  readonly severity: FindingSeverity;
  readonly reproducibility: {
    readonly deterministic: boolean;
    readonly seed: Seed;
    readonly trialId: string;
  };
  readonly trace: {
    readonly rootDigest: ContentDigest;
    readonly observationIds: readonly string[];
  };
  readonly summary: string;
  readonly minimalCase?: MinimalCase;
  readonly sealed: boolean;
}

export interface OracleDecision {
  readonly oracleId: string;
  readonly passed: boolean;
  readonly actual?: JsonValue;
  readonly expected?: JsonValue;
  readonly rule: OracleOperator;
  readonly observationId?: string;
}

export type MeasureDimension =
  | "goal-reliability"
  | "policy-integrity"
  | "robustness"
  | "calibration"
  | "recoverability"
  | "efficiency"
  | "coverage"
  | "evidence-completeness";

export interface Measure {
  readonly name: string;
  readonly dimension: MeasureDimension;
  readonly value: number;
  readonly unit: string;
  readonly passed?: boolean;
}

export interface NumericDistribution {
  readonly values: readonly {
    readonly value: number;
    readonly count: number;
    readonly probability: number;
  }[];
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly standardDeviation: number;
  readonly quantiles: {
    readonly p05: number;
    readonly p50: number;
    readonly p95: number;
  };
}

export interface CampaignStatistics {
  readonly sampleCount: number;
  readonly distribution: NumericDistribution;
  readonly confidenceInterval95: {
    readonly lower: number;
    readonly upper: number;
    readonly method: "wilson-score";
  };
  readonly seedCoverage: {
    readonly planned: number;
    readonly executed: number;
    readonly unique: number;
    readonly ratio: number;
    readonly missing: readonly Seed[];
  };
}

export interface SignatureReference {
  readonly keyId: string;
  readonly algorithm: "HMAC-SHA-256";
  readonly signature: string;
}

export interface ResultManifest {
  readonly resultId: string;
  readonly tenantId: string;
  readonly trial: Trial;
  readonly subjectDigest: ContentDigest;
  readonly scenarioDigest: ContentDigest;
  readonly worldDigest: ContentDigest;
  readonly measures: readonly Measure[];
  readonly oracleDecisions: readonly OracleDecision[];
  readonly observations: readonly Observation[];
  readonly trace: {
    readonly algorithm: "sha256-chain-v1";
    readonly rootDigest: ContentDigest;
    readonly observationCount: number;
  };
  readonly findings: readonly Finding[];
  readonly coverage: JsonObject;
  readonly uncertainty: JsonObject;
  readonly environmentDeviations: readonly string[];
  readonly signatures: readonly SignatureReference[];
}

export interface CampaignResult {
  readonly campaign: Campaign;
  readonly results: readonly ResultManifest[];
  readonly statistics: CampaignStatistics;
  readonly findings: readonly Finding[];
}

export type MaterialComponent =
  | "model"
  | "prompt"
  | "tool"
  | "policy"
  | "memory-schema"
  | "connector"
  | "runtime-dependency";

export interface MaterialityRule {
  readonly component: MaterialComponent;
  readonly effect: "invalidate" | "narrow" | "ignore";
}

export interface MeasureThreshold {
  readonly measure: string;
  readonly operator: "gte" | "lte";
  readonly value: number;
}

export type DeploymentRestriction =
  | { readonly kind: "allowed-environments"; readonly environments: readonly string[] }
  | { readonly kind: "allowed-tools"; readonly tools: readonly string[] }
  | { readonly kind: "maximum-authority"; readonly authority: number }
  | { readonly kind: "required-human-gates"; readonly gates: readonly string[] }
  | { readonly kind: "monitoring-policy"; readonly policyDigest: ContentDigest }
  | { readonly kind: "isolation-class"; readonly classes: readonly IsolationClass[] }
  | { readonly kind: "deny-network"; readonly except: readonly string[] };

export interface AssuranceProfile {
  readonly profileId: string;
  readonly version: string;
  readonly riskClass: RiskClass;
  readonly requiredSuites: readonly ContentDigest[];
  readonly measures: readonly string[];
  readonly thresholds: readonly MeasureThreshold[];
  readonly confidence: number;
  readonly exceptions: readonly string[];
  readonly materialityRules: readonly MaterialityRule[];
  readonly defaultMaterialityEffect: "invalidate" | "narrow";
  readonly maximumValiditySeconds: number;
}

export type AssuranceOutcome = "APPROVED" | "CONDITIONAL" | "REJECTED" | "INVALIDATED" | "NARROWED";

export interface AssuranceDecision {
  readonly decisionId: string;
  readonly profileDigest: ContentDigest;
  readonly subjectDigest: ContentDigest;
  readonly resultDigests: readonly ContentDigest[];
  readonly suiteDigests: readonly ContentDigest[];
  readonly coverage: JsonObject;
  readonly residualRisk: JsonObject;
  readonly approver: string;
  readonly conditions: readonly DeploymentRestriction[];
  readonly outcome: AssuranceOutcome;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly invalidation?: {
    readonly changedComponents: readonly MaterialComponent[];
    readonly priorDecisionId: string;
  };
}

export interface AssuranceCertificate {
  readonly certificateId: string;
  readonly tenantId: string;
  readonly subjectDigest: ContentDigest;
  readonly profileDigest: ContentDigest;
  readonly suiteDigests: readonly ContentDigest[];
  readonly decisionDigest: ContentDigest;
  readonly decision: "APPROVED" | "CONDITIONAL";
  readonly conditions: readonly DeploymentRestriction[];
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly issuer: string;
  readonly revocationEndpoint: string;
}

export interface SignedEnvelope<T> {
  readonly envelopeVersion: "easap-signed-envelope-v1";
  readonly algorithm: "HMAC-SHA-256";
  readonly keyId: string;
  readonly issuedAt: string;
  readonly payloadDigest: ContentDigest;
  readonly payload: T;
  readonly signature: string;
}

export interface SubjectExecutionInput {
  readonly event: ScenarioEvent;
  readonly payload?: JsonValue;
  readonly state: JsonObject;
  readonly random: number;
}

export interface SubjectExecutionOutput {
  readonly output?: JsonValue;
  readonly mutations?: readonly StateMutation[];
  readonly capabilityRequests?: readonly CapabilityRequest[];
  readonly evidence?: readonly ContentDigest[];
}

export type SubjectExecutor = (
  input: SubjectExecutionInput,
) => SubjectExecutionOutput | Promise<SubjectExecutionOutput>;

export interface TrialRunInput {
  readonly tenantId: string;
  readonly trial: Trial;
  readonly subject: SubjectBundle;
  readonly world: WorldModel;
  readonly scenario: Scenario;
  readonly executor?: SubjectExecutor;
}

export interface ReplayResult {
  readonly exact: boolean;
  readonly expectedTraceDigest: ContentDigest;
  readonly actualTraceDigest: ContentDigest;
  readonly result: ResultManifest;
}

export interface MinimizationTransformation {
  readonly kind:
    | "remove-events"
    | "remove-state"
    | "remove-payload"
    | "remove-fixture"
    | "remove-dependency";
  readonly description: string;
  readonly beforeDigest: ContentDigest;
  readonly afterDigest: ContentDigest;
  readonly preservedFailure: boolean;
}

export interface MinimizationResult {
  readonly findingId: string;
  readonly minimalScenario: Scenario;
  readonly minimalScenarioDigest: ContentDigest;
  readonly transformations: readonly MinimizationTransformation[];
  readonly verified: boolean;
}

export interface MaterialChangeAssessment {
  readonly changedComponents: readonly MaterialComponent[];
  readonly invalidatingComponents: readonly MaterialComponent[];
  readonly narrowingComponents: readonly MaterialComponent[];
  readonly ignoredComponents: readonly MaterialComponent[];
  readonly effect: "none" | "narrow" | "invalidate";
}

export interface RevocationRecord {
  readonly tenantId: string;
  readonly certificateId: string;
  readonly reason: string;
  readonly effectiveAt: string;
  readonly revokedBy: string;
}

export interface ReleaseContext {
  readonly tenantId: string;
  readonly subjectDigest: ContentDigest;
  readonly environment: string;
  readonly tools: readonly string[];
  readonly authority: number;
  readonly satisfiedHumanGates: readonly string[];
  readonly monitoringPolicyDigest?: ContentDigest;
  readonly isolationClass: IsolationClass;
  readonly networkDestinations: readonly string[];
  readonly now: string;
}

export interface ReleaseGateResult {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly certificateId?: string;
}

export interface SyntheticIncidentEvent {
  readonly eventId: string;
  readonly at: number;
  readonly actor: string;
  readonly type: string;
  readonly payload: JsonValue;
}

export interface SyntheticIncident {
  readonly incidentId: string;
  readonly tenantId: string;
  readonly synthetic: true;
  readonly classification: IsolationClass;
  readonly initialState: JsonObject;
  readonly events: readonly SyntheticIncidentEvent[];
  readonly protectedPaths?: readonly string[];
}

export interface PrivacyReview {
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly approved: boolean;
  readonly notes?: string;
}

export interface RedactedRegression {
  readonly sourceIncidentDigest: ContentDigest;
  readonly scenario: Scenario;
  readonly scenarioDigest: ContentDigest;
  readonly review: PrivacyReview;
  readonly redactions: readonly {
    readonly path: string;
    readonly reason: string;
  }[];
}
