const DEFAULT_BASE_URL = "https://easap.dev";

export class EasapError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "EasapError";
    this.status = options.status;
    this.details = options.details;
  }
}

function cleanBaseUrl(value) {
  const url = new URL(value || DEFAULT_BASE_URL);
  if (!/^https?:$/u.test(url.protocol)) throw new EasapError("EASAP base URL must use HTTP or HTTPS.");
  return url.toString().replace(/\/$/u, "");
}

async function parseResponse(response) {
  const raw = await response.text();
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new EasapError(`EASAP returned non-JSON content (HTTP ${response.status}).`, {
      status: response.status,
      details: raw.slice(0, 500),
    });
  }
  if (!response.ok) {
    throw new EasapError(payload.error || payload.title || `EASAP request failed with HTTP ${response.status}.`, {
      status: response.status,
      details: payload,
    });
  }
  return payload;
}

export class EasapClient {
  constructor(options = {}) {
    this.baseUrl = cleanBaseUrl(options.baseUrl || process.env.EASAP_BASE_URL || DEFAULT_BASE_URL);
    this.timeoutMs = options.timeoutMs || 70_000;
    this.fetch = options.fetch || globalThis.fetch;
    if (typeof this.fetch !== "function") throw new EasapError("This runtime does not provide fetch(). Use Node.js 22.13 or newer.");
  }

  async request(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "easap-cli/0.1.0",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      redirect: "error",
      signal: AbortSignal.timeout(options.timeoutMs || this.timeoutMs),
    });
    return parseResponse(response);
  }

  async doctor() {
    const startedAt = performance.now();
    const response = await this.fetch(`${this.baseUrl}/connect`, {
      method: "GET",
      headers: { "User-Agent": "easap-cli/0.1.0" },
      redirect: "error",
      signal: AbortSignal.timeout(Math.min(this.timeoutMs, 15_000)),
    });
    return {
      ok: response.ok,
      status: response.status,
      baseUrl: this.baseUrl,
      latencyMs: Math.round(performance.now() - startedAt),
      boundary: "Hosted checks support authorized public HTTPS JSON endpoints only.",
    };
  }

  async runDemo({ trialCount = 12 } = {}) {
    return this.request("/api/demo/run", { method: "POST", body: { trialCount } });
  }

  async assessReadiness(input) {
    return this.request("/api/readiness/assess", { method: "POST", body: input });
  }

  async registerTarget(input) {
    return this.request("/api/targets/register", {
      method: "POST",
      body: {
        agentName: input.agentName,
        endpointUrl: input.endpointUrl,
        protocol: input.protocol || "json_message",
        ...(input.model ? { model: input.model } : {}),
        authorized: input.authorized === true,
        safeTarget: input.safeTarget === true,
      },
    });
  }

  async verifyTarget(setupToken) {
    return this.request("/api/targets/verify", { method: "POST", body: { setupToken } });
  }

  async runProbe(verifiedTargetToken) {
    return this.request("/api/targets/run", { method: "POST", body: { verifiedTargetToken } });
  }
}

export function createClient(options) {
  return new EasapClient(options);
}

export const EASAP_BASE_URL = DEFAULT_BASE_URL;
