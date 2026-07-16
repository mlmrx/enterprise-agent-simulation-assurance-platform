export const roles = [
  "assurance_owner",
  "scenario_engineer",
  "agent_developer",
  "red_team_operator",
  "release_authority",
  "auditor",
] as const;

export type Role = (typeof roles)[number];
export type IsolationClass = "STANDARD" | "RESTRICTED" | "HIGH_RISK" | "SHADOW";

export interface RequestIdentity {
  principal: string;
  tenantId: string;
  roles: Role[];
  source: "external" | "local-reference";
}

export type Action =
  | "subject.register"
  | "world.publish"
  | "scenario.validate"
  | "scenario.publish"
  | "profile.publish"
  | "campaign.create"
  | "trial.run"
  | "trial.replay"
  | "finding.minimize"
  | "assurance.decide"
  | "certificate.revoke"
  | "evidence.read"
  | "incident.derive";

const permissions: Record<Action, readonly Role[]> = {
  "subject.register": ["agent_developer"],
  "world.publish": ["scenario_engineer"],
  "scenario.validate": ["scenario_engineer", "red_team_operator"],
  "scenario.publish": ["scenario_engineer"],
  "profile.publish": ["assurance_owner"],
  "campaign.create": [
    "scenario_engineer",
    "agent_developer",
    "red_team_operator",
    "assurance_owner",
  ],
  "trial.run": ["scenario_engineer", "red_team_operator"],
  "trial.replay": ["scenario_engineer", "red_team_operator", "auditor"],
  "finding.minimize": ["scenario_engineer", "red_team_operator"],
  "assurance.decide": ["release_authority"],
  "certificate.revoke": ["release_authority", "assurance_owner"],
  "evidence.read": [
    "agent_developer",
    "scenario_engineer",
    "red_team_operator",
    "release_authority",
    "assurance_owner",
    "auditor",
  ],
  "incident.derive": ["scenario_engineer", "assurance_owner"],
};

const isRole = (value: string): value is Role =>
  (roles as readonly string[]).includes(value);

function headerRoles(value: string | null): Role[] {
  if (!value) return [];
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(isRole);
}

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

type AuthMode = "local" | "shared-token" | "trusted-proxy";

function authMode(): AuthMode {
  const configured = process.env.EASAP_AUTH_MODE?.trim().toLowerCase();
  if (configured === "shared-token" || configured === "trusted-proxy") return configured;
  return "local";
}

function hasValidSharedToken(request: Request) {
  const expected = process.env.EASAP_API_TOKEN?.trim();
  const supplied = request.headers.get("authorization")?.trim();
  return Boolean(expected && supplied === `Bearer ${expected}`);
}

/**
 * Loopback requests receive an obvious development identity. Remote deployments
 * must opt into either shared-token mode or a trusted identity-aware proxy that
 * strips and overwrites the x-easap-* headers before forwarding traffic.
 */
export function identityFromRequest(request: Request): RequestIdentity | null {
  if (isLocalRequest(request)) {
    const requestedRoles = headerRoles(request.headers.get("x-easap-roles"));
    return {
      principal: request.headers.get("x-easap-user")?.trim() || "local.release-authority@easap.test",
      tenantId: request.headers.get("x-easap-tenant")?.trim() || "tenant-acme",
      roles:
        requestedRoles.length > 0
          ? requestedRoles
          : [
              "assurance_owner",
              "scenario_engineer",
              "agent_developer",
              "red_team_operator",
              "release_authority",
              "auditor",
            ],
      source: "local-reference",
    };
  }

  const mode = authMode();
  if (mode === "local") return null;
  if (mode === "shared-token" && !hasValidSharedToken(request)) return null;

  const principal = request.headers.get("x-easap-user")?.trim();
  if (!principal) return null;

  return {
    principal: principal.toLowerCase(),
    tenantId: request.headers.get("x-easap-tenant")?.trim() || "default",
    roles: headerRoles(request.headers.get("x-easap-roles")),
    source: "external",
  };
}

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function requireAction(identity: RequestIdentity, action: Action) {
  const allowed = permissions[action];
  if (!identity.roles.some((role) => allowed.includes(role))) {
    throw new AuthorizationError(
      `Action ${action} requires one of: ${allowed.join(", ")}`,
    );
  }
}

export function canReadHiddenSuite(identity: RequestIdentity) {
  return identity.roles.some((role) =>
    (["scenario_engineer", "red_team_operator", "assurance_owner", "auditor"] as Role[]).includes(
      role,
    ),
  );
}

export function assertHighRiskSeparation(options: {
  profileAuthor: string;
  approver: string;
  riskClass: string;
}) {
  if (
    options.riskClass === "HIGH_RISK" &&
    options.profileAuthor.trim().toLowerCase() === options.approver.trim().toLowerCase()
  ) {
    throw new AuthorizationError(
      "HIGH_RISK assurance profiles require an approver different from the profile author.",
    );
  }
}
