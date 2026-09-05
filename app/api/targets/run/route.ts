import { NextResponse } from "next/server";
import {
  publicTargetRateLimited,
  readJsonRequest,
  requestOriginAllowed,
  runPublicAgentProbe,
} from "@/lib/connect/public-target";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!requestOriginAllowed(request)) return NextResponse.json({ error: "Cross-origin agent probes are not permitted." }, { status: 403, headers });
  if (publicTargetRateLimited(request, "run", 3, 5 * 60_000)) return NextResponse.json({ error: "Public-agent probes are limited to three runs per five minutes." }, { status: 429, headers: { ...headers, "Retry-After": "300" } });
  try {
    const body = await readJsonRequest(request, 16_384) as { verifiedTargetToken?: unknown };
    const report = await runPublicAgentProbe(body.verifiedTargetToken);
    return NextResponse.json({ data: report, meta: { execution: "live-verified-public-agent-probe", persisted: false } }, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Public-agent probe failed." }, { status: 400, headers });
  }
}
