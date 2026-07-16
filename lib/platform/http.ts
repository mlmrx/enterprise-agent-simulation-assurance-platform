import { AuthorizationError } from "./auth";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Array<{ path: string; message: string }>;
}

export class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: ProblemDetails["errors"],
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestError(415, "Content-Type must be application/json.");
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new RequestError(400, "Request body is not valid JSON.");
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function problem(error: unknown, request: Request) {
  const status =
    error instanceof RequestError
      ? error.status
      : error instanceof AuthorizationError
        ? error.status
        : 500;
  const title =
    status === 400
      ? "Invalid request"
      : status === 401
        ? "Authentication required"
        : status === 403
          ? "Not authorized"
          : status === 404
            ? "Resource not found"
            : status === 409
              ? "Conflict"
              : status === 415
                ? "Unsupported media type"
                : "Unexpected platform error";
  const details: ProblemDetails = {
    type: `https://easap.dev/problems/${status}`,
    title,
    status,
    detail: error instanceof Error ? error.message : "Unexpected error",
    instance: new URL(request.url).pathname,
    ...(error instanceof RequestError && error.errors ? { errors: error.errors } : {}),
  };
  return json(details, {
    status,
    headers: { "content-type": "application/problem+json; charset=utf-8" },
  });
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}
