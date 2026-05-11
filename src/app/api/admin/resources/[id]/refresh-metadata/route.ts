/**
 * POST /api/admin/resources/[id]/refresh-metadata
 *
 * Re-runs URL enrichment against a resource's current `url` field and
 * writes back the link-derived metadata: provider, thumbnail_url,
 * embed_html, author, duration_seconds. Title and description are
 * preserved because admins often edit those.
 *
 * Use case: legacy rows that were created via the basic form before the
 * Add-from-link composer existed and have no thumbnail/embed.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { enrichLink } from "@/lib/resources/enrich";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = row.url?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "Resource has no URL to refresh" },
      { status: 400 }
    );
  }

  let enriched;
  try {
    enriched = await enrichLink(url);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Enrichment failed",
        detail: err instanceof Error ? err.message.slice(0, 300) : "unknown",
      },
      { status: 502 }
    );
  }

  const [updated] = await db
    .update(resources)
    .set({
      provider: enriched.provider,
      thumbnailUrl: enriched.thumbnailUrl,
      embedHtml: enriched.embedHtml,
      author: enriched.author,
      durationSeconds: enriched.durationSeconds,
    })
    .where(eq(resources.id, id))
    .returning();

  return NextResponse.json({
    resource: updated,
    enriched: {
      provider: enriched.provider,
      thumbnailUrl: enriched.thumbnailUrl,
      hasEmbed: !!enriched.embedHtml,
      author: enriched.author,
    },
  });
}
