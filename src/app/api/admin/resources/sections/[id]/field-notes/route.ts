import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, resources, aiGenerations } from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { generateFieldNotes, FIELD_NOTES_PROMPT_VERSION } from "@/lib/resources/generate-field-notes";

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
  // "insufficient" rows are excluded once persisted (they're parked for a
  // manual write, not a retry target) — only true never-attempted rows are
  // pending. orderBy gives deterministic forward progress across runs once
  // a section exceeds BATCH_CAP.
  const pending = await db
    .select()
    .from(resources)
    .where(
      and(eq(resources.sectionId, id), eq(resources.fieldNotesStatus, "none"), isNull(resources.deletedAt))
    )
    .orderBy(asc(resources.createdAt))
    .limit(BATCH_CAP);

  let drafted = 0;
  let insufficient = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      const result = await generateFieldNotes(row);
      if (result.status === "insufficient") {
        await db
          .update(resources)
          .set({ fieldNotesStatus: "insufficient" })
          .where(eq(resources.id, row.id));
        insufficient++;
        continue;
      }
      if (result.status === "failed") {
        failed++;
        continue;
      }
      await db
        .update(resources)
        .set({ fieldNotesHtml: result.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
        .where(eq(resources.id, row.id));
      try {
        await db.insert(aiGenerations).values({
          type: "draft",
          prompt: `field-notes: ${row.title}`,
          promptVersion: FIELD_NOTES_PROMPT_VERSION,
          model: "claude-sonnet-4-5",
          output: result.html.slice(0, 4000),
          inputTokens: result.tokensIn,
          outputTokens: result.tokensOut,
          entityType: "resource",
          entityId: row.id,
          userId,
        });
      } catch (logErr) {
        console.error("field-notes ai_generations log failed", row.id, logErr);
      }
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
