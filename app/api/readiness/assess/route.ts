import { NextResponse } from "next/server";
import { assessAgentReadiness, parseReadinessInput } from "@/lib/readiness/assessment";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function rateLimited(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > 20;
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const expected = new URL(process.env.EASAP_PUBLIC_URL || request.url).origin;
  return origin === expected || origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000";
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Cross-origin assessment requests are not permitted." }, { status: 403 });
  }
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "The public planner allows twenty assessments per minute per client." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return NextResponse.json({ error: "Assessment input cannot exceed 16 KiB." }, { status: 413 });
  }

  try {
    const body = await request.json();
    const input = parseReadinessInput(body);
    const assessment = await assessAgentReadiness(input);
    return NextResponse.json(
      { data: assessment, meta: { execution: "deterministic-readiness-engine", persisted: false } },
      { status: 200, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment input is invalid." },
      { status: 400, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  }
}
