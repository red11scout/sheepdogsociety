import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, resources } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { generateFieldNotes } from "@/lib/resources/generate-field-notes";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Spec: capped batch per run; a failed item stays draft-less rather than
 *  blocking its section. 15 rows ≈ well inside 300s at one sonnet call each. */
const BATCH_CAP = 15;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const pending = await db
    .select()
    .from(resources)
    .where(
      and(eq(resources.sectionId, id), eq(resources.fieldNotesStatus, "none"), isNull(resources.deletedAt))
    )
    .limit(BATCH_CAP);

  let drafted = 0;
  let insufficient = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const notes = await generateFieldNotes(row);
      if (!notes) {
        insufficient++;
        continue;
      }
      await db
        .update(resources)
        .set({ fieldNotesHtml: notes.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
        .where(eq(resources.id, row.id));
      drafted++;
    } catch (err) {
      console.error("field-notes batch item failed", row.id, err);
      failed++;
    }
  }

  const [{ count: remaining }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resources)
    .where(
      and(eq(resources.sectionId, id), eq(resources.fieldNotesStatus, "none"), isNull(resources.deletedAt))
    );

  return NextResponse.json({ processed: pending.length, drafted, insufficient, failed, remaining });
}
