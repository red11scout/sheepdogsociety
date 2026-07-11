import { NextResponse } from "next/server";
import { runAutopilot } from "@/server/letters/autopilot";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GET /api/cron/autopilot-letters
 *
 * Fires Mondays 13:00 UTC (7am Central) via vercel.json. Runs the Letter
 * autopilot engine: if enabled and the scheduled queue is low, it writes
 * the next four-week block of letters, verifies scripture, schedules the
 * survivors, generates covers, and emails the shepherd a summary. The
 * engine is disabled by default and killable from the admin Autopilot
 * card; this route only reports what the run did.
 *
 * Auth: Vercel Cron sends an Authorization: Bearer <CRON_SECRET> header.
 * We accept that, OR a query string ?key=<CRON_SECRET> for manual smoke
 * tests from a browser.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured = nothing protects this endpoint, refuse.
    return false;
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runAutopilot();
    return NextResponse.json(report);
  } catch (err) {
    console.error("autopilot run failed:", err);
    return NextResponse.json(
      {
        error: "Autopilot run failed",
        detail: err instanceof Error ? err.message.slice(0, 400) : "",
      },
      { status: 500 }
    );
  }
}
