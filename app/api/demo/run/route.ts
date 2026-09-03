import { NextResponse } from "next/server";
import { ensureReferenceSchema } from "@/db/bootstrap";
import type { RequestIdentity } from "@/lib/platform/auth";
import { runReferenceDemo } from "@/lib/platform/reference-demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PUBLIC_DEMO_IDENTITY: RequestIdentity = {
  principal: "public-demo@easap.dev",
  tenantId: "public-demo",
  roles: ["assurance_owner", "scenario_engineer", "red_team_operator"],
  source: "external",
};

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
  return bucket.count > 4;
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const expected = new URL(process.env.EASAP_PUBLIC_URL || request.url).origin;
  return origin === expected || origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000";
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Cross-origin demo execution is not permitted." }, { status: 403 });
  }
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "The public runner allows four campaigns per minute per client." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let requestedTrials = 12;
  try {
    const body = (await request.json()) as { trialCount?: unknown };
    if (typeof body.trialCount === "number" && Number.isInteger(body.trialCount)) {
      requestedTrials = Math.min(24, Math.max(4, body.trialCount));
    }
  } catch {
    // The fixed public campaign can run without a request body.
  }

  try {
    await ensureReferenceSchema();
    const startedAt = performance.now();
    const result = await runReferenceDemo(PUBLIC_DEMO_IDENTITY, requestedTrials);
    return NextResponse.json(
      {
        data: result,
        meta: {
          execution: "live-reference-engine",
          elapsedMs: Math.round(performance.now() - startedAt),
          limitations: [
            "STANDARD synthetic isolation only",
            "Reference signing key is not a production trust root",
          ],
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Public reference campaign failed", error);
    return NextResponse.json(
      { error: "The reference campaign could not complete. No synthetic result was substituted." },
      { status: 500 },
    );
  }
}
