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
 * Auth: header Bearer ONLY. Vercel Cron sends an Authorization:
 * Bearer <CRON_SECRET> header, and a manual re-fire uses curl with the
 * same header. No ?key= query-param fallback here: query strings leak
 * into request logs, browser history, and referrers, and this endpoint
 * can put four unreviewed letters on the calendar. (The older
 * publish-scheduled-letters cron still accepts ?key=; this route
 * deliberately does not.)
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured = nothing protects this endpoint, refuse.
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
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
