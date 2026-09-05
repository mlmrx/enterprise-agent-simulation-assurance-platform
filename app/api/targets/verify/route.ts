import { NextResponse } from "next/server";
import {
  publicTargetRateLimited,
  readJsonRequest,
  requestOriginAllowed,
  verifyPublicTarget,
} from "@/lib/connect/public-target";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: "Cross-origin ownership verification is not permitted." }, { status: 403, headers });
  if (publicTargetRateLimited(request, "verify", 10, 60_000)) return NextResponse.json({ error: "Ownership verification is limited to ten attempts per minute." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  try {
    const body = await readJsonRequest(request, 16_384) as { setupToken?: unknown };
    const verification = await verifyPublicTarget(body.setupToken);
    return NextResponse.json({ data: verification, meta: { execution: "live-ownership-verification", persisted: false } }, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ownership verification failed." }, { status: 400, headers });
  }
}
