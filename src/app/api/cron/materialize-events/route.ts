import { NextResponse } from "next/server";
import { ensureSeriesHorizon } from "@/server/event-series";

export const runtime = "nodejs";

/**
 * GET /api/cron/materialize-events
 *
 * Daily horizon top-up: every active series keeps 8 weeks of real
 * events rows ahead of it. Idempotent; safe to re-run any time.
 *
 * Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>. We also
 * accept ?key=<CRON_SECRET> for manual smoke tests from a browser.
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
    const { created } = await ensureSeriesHorizon();
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
