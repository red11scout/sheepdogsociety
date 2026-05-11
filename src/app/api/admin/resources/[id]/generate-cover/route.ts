/**
 * POST /api/admin/resources/[id]/generate-cover
 *
 * Generate an AI cover image for a single resource using the title +
 * summary + section context. Saves to Vercel Blob, writes the URL to
 * resources.thumbnail_url. Use the per-row "image" icon on the admin
 * resources page to invoke. Re-runnable — overwrites the previous
 * thumbnail.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resources, users } from "@/db/schema";
import { resourceSections } from "@/db/schema-new";
import { eq } from "drizzle-orm";
import {
  buildCoverPrompt,
  generateCoverImage,
} from "@/lib/resources/cover-image";

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
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let sectionName: string | null = null;
  if (row.sectionId) {
    const [s] = await db
      .select({ name: resourceSections.name })
      .from(resourceSections)
      .where(eq(resourceSections.id, row.sectionId));
    sectionName = s?.name ?? null;
  }

  const prompt = buildCoverPrompt({
    title: row.title,
    summary: row.summary,
    sectionName,
    cluster: row.cluster,
  });

  let result;
  try {
    result = await generateCoverImage({
      resourceId: row.id,
      prompt,
      quality: "low",
      size: "landscape",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Image generation failed",
        detail: err instanceof Error ? err.message.slice(0, 300) : "unknown",
      },
      { status: 502 }
    );
  }

  const [updated] = await db
    .update(resources)
    .set({ thumbnailUrl: result.url })
    .where(eq(resources.id, id))
    .returning();

  return NextResponse.json({
    resource: { id: updated.id, thumbnailUrl: updated.thumbnailUrl },
    prompt: result.prompt,
  });
}
