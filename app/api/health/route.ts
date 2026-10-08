import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — read-only readiness probe.
 *
 * No auth, no mutations, no secret values. Reports 200 when the deployment is
 * fully operational and 503 when it is not, so a monitor can distinguish "site
 * reachable" from "production actually ready".
 */
export async function GET() {
  const result = await runHealthChecks();

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
