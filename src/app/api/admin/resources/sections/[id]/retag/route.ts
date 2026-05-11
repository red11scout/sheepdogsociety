/**
 * POST /api/admin/resources/sections/[id]/retag
 *
 * Re-runs categorizeResource() against every row in a section that has
 * extractable body text. Bulk equivalent of clicking the per-row
 * "sparkles" tag button. Useful when a batch of bulk-uploaded rows
 * shipped with empty topics/themes (silent Claude failure at upload
 * time, rate limiting, etc.) — the public search depends on these
 * tags, so an empty topics array means searching for "marriage" or
 * "fatherhood" returns nothing.
 *
 * Sequential: one Claude call per resource. With Haiku 4.5 at ~3s
 * per call, 50 rows = 2-3 minutes. Returns a per-row outcome list so
 * the admin can see what landed and what failed.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users } from "@/db/schema";
import { resourceSections } from "@/db/schema-new";
import { eq, and, isNull, sql as drizzleSql } from "drizzle-orm";
import { categorizeResource } from "@/lib/resources/categorize";

export const runtime = "nodejs";
export const maxDuration = 300;

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
  const [section] = await db
    .select()
    .from(resourceSections)
    .where(eq(resourceSections.id, id));
  if (!section)
    return NextResponse.json({ error: "Section not found" }, { status: 404 });

  // Only re-tag rows with enough body text for Claude to actually work
  // with. Short/empty rows just get skipped — the admin can re-upload
  // with content if they want them tagged.
  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      bodyText: resources.bodyText,
    })
    .from(resources)
    .where(
      and(
        eq(resources.sectionId, id),
        isNull(resources.deletedAt),
        drizzleSql`length(coalesce(${resources.bodyText}, '')) > 100`
      )
    );

  const outcomes: Array<{
    id: string;
    title: string;
    status: "tagged" | "skipped" | "failed";
    error?: string;
    topics?: string[];
  }> = [];

  for (const row of rows) {
    try {
      const cat = await categorizeResource({
        title: row.title,
        bodyText: row.bodyText ?? "",
        sectionName: section.name,
      });
      await db
        .update(resources)
        .set({
          summary: cat.summary,
          topics: cat.topics,
          themes: cat.themes,
          booksOfBible: cat.booksOfBible,
          audience: cat.audience,
          aiCategorizedAt: new Date(),
        })
        .where(eq(resources.id, row.id));
      outcomes.push({
        id: row.id,
        title: row.title,
        status: "tagged",
        topics: cat.topics,
      });
    } catch (err) {
      outcomes.push({
        id: row.id,
        title: row.title,
        status: "failed",
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    }
  }

  return NextResponse.json({
    sectionName: section.name,
    processed: outcomes.length,
    tagged: outcomes.filter((o) => o.status === "tagged").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
    outcomes,
  });
}
