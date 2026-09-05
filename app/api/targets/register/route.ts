import { NextResponse } from "next/server";
import {
  parsePublicTargetInput,
  publicTargetRateLimited,
  readJsonRequest,
  registerPublicTarget,
  requestOriginAllowed,
} from "@/lib/connect/public-target";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: "Cross-origin target registration is not permitted." }, { status: 403, headers });
  if (publicTargetRateLimited(request, "register", 6, 60_000)) return NextResponse.json({ error: "Target registration is limited to six attempts per minute." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  try {
    const input = parsePublicTargetInput(await readJsonRequest(request, 16_384));
    const registration = await registerPublicTarget(input);
    return NextResponse.json({ data: registration, meta: { execution: "live-public-target-registration", persisted: false } }, { status: 201, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Target registration is invalid." }, { status: 400, headers });
  }
}
