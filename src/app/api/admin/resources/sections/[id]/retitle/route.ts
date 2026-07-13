/**
 * POST /api/admin/resources/sections/[id]/retitle
 *
 * Re-titles every file-backed resource in a section from its source filename,
 * normalized to one uniform pattern (see tidyTitleFromFilename). Regenerates
 * the slug when the title changes so the public URL matches the new title.
 * Rows without a source filename (links, YouTube, Amazon) are left untouched.
 *
 * Deterministic — no AI, no tokens. Idempotent: re-running is a no-op once
 * every title already matches its filename.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users, resourceSections } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { tidyTitleFromFilename } from "@/lib/resources/title-from-filename";
import { uniqueResourceSlug } from "@/lib/resources/slug";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      slug: resources.slug,
      sourceFilename: resources.sourceFilename,
    })
    .from(resources)
    .where(and(eq(resources.sectionId, id), isNull(resources.deletedAt)));

  let retitled = 0;
  let skippedNoFile = 0;
  let unchanged = 0;
  const samples: { from: string; to: string }[] = [];

  for (const row of rows) {
    const filename = row.sourceFilename?.trim();
    if (!filename) {
      skippedNoFile++;
      continue;
    }
    const newTitle = tidyTitleFromFilename(filename);
    if (!newTitle || newTitle === row.title) {
      unchanged++;
      continue;
    }
    // Title changed → regenerate the slug from the new title. The new seed
    // differs from this row's current slug, so uniqueResourceSlug won't
    // self-collide.
    const newSlug = await uniqueResourceSlug(newTitle);
    await db
      .update(resources)
      .set({ title: newTitle, slug: newSlug })
      .where(eq(resources.id, row.id));
    if (samples.length < 8) samples.push({ from: row.title, to: newTitle });
    retitled++;
  }

  revalidatePath("/resources");
  revalidatePath("/admin/resources");

  return NextResponse.json({
    sectionName: section.name,
    total: rows.length,
    retitled,
    unchanged,
    skippedNoFile,
    samples,
  });
}
