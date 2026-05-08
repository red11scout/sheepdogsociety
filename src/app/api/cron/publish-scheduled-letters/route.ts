import { NextResponse } from "next/server";
import { db } from "@/db";
import { weeklyEncouragements } from "@/db/schema-new";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { broadcastEncouragement } from "@/server/encouragements";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET /api/cron/publish-scheduled-letters
 *
 * Fires every 15 minutes via vercel.json. Finds every weekly_encouragement
 * with status='scheduled' whose scheduled_for is in the past, flips it to
 * 'published', and revalidates the public pages so the new letter is live.
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

  const now = new Date();
  let due: { id: string; slug: string; title: string }[] = [];
  try {
    due = await db
      .select({
        id: weeklyEncouragements.id,
        slug: weeklyEncouragements.slug,
        title: weeklyEncouragements.title,
      })
      .from(weeklyEncouragements)
      .where(
        and(
          eq(weeklyEncouragements.status, "scheduled"),
          isNull(weeklyEncouragements.deletedAt),
          lte(weeklyEncouragements.scheduledFor, now)
        )
      )
      .limit(50);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Query failed (migration 0007 may not be applied)",
        detail: err instanceof Error ? err.message : "",
      },
      { status: 500 }
    );
  }

  if (due.length === 0) {
    return NextResponse.json({ ok: true, published: 0, at: now.toISOString() });
  }

  // Flip due letters to published in one UPDATE. Re-check status at write
  // time so a manually-edited row (status flipped to draft after our SELECT)
  // doesn't get force-published.
  const ids = due.map((r) => r.id);
  try {
    await db
      .update(weeklyEncouragements)
      .set({ status: "published", updatedAt: new Date() })
      .where(
        and(
          eq(weeklyEncouragements.status, "scheduled"),
          inArray(weeklyEncouragements.id, ids)
        )
      );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Update failed",
        detail: err instanceof Error ? err.message : "",
        wouldHavePublished: due.length,
      },
      { status: 500 }
    );
  }

  // Fire Resend broadcasts for each newly-published letter. Idempotent:
  // broadcastEncouragement skips rows where broadcast_id is already set.
  // Failures don't block the publish — admin can retry from the editor.
  const broadcastResults: Array<{
    id: string;
    title: string;
    sent: boolean;
    reason?: string;
  }> = [];
  for (const row of due) {
    try {
      const r = await broadcastEncouragement(row.id);
      broadcastResults.push({ id: row.id, title: row.title, ...r });
    } catch (err) {
      broadcastResults.push({
        id: row.id,
        title: row.title,
        sent: false,
        reason: err instanceof Error ? err.message.slice(0, 200) : "",
      });
    }
  }

  // Revalidate public surfaces so the newly-published letters render.
  try {
    revalidatePath("/encouragements");
    for (const row of due) {
      revalidatePath(`/encouragements/${row.slug}`);
    }
  } catch {
    // revalidatePath throws on edge runtime; nodejs is fine
  }

  return NextResponse.json({
    ok: true,
    published: due.length,
    titles: due.map((r) => r.title),
    broadcasts: broadcastResults,
    at: now.toISOString(),
  });
}
