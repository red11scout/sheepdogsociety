import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, resources, aiGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateFieldNotes, FIELD_NOTES_PROMPT_VERSION } from "@/lib/resources/generate-field-notes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.fieldNotesStatus === "approved") {
    // Approved notes are live on the public site; unpublish first.
    return NextResponse.json({ error: "Approved notes are live. Unpublish before redrafting." }, { status: 409 });
  }

  const result = await generateFieldNotes(row);

  if (result.status === "insufficient") {
    await db
      .update(resources)
      .set({ fieldNotesStatus: "insufficient" })
      .where(eq(resources.id, id));
    return NextResponse.json({ status: "insufficient" });
  }

  if (result.status === "failed") {
    return NextResponse.json({ status: "failed" });
  }

  await db
    .update(resources)
    .set({ fieldNotesHtml: result.html, fieldNotesStatus: "draft", fieldNotesGeneratedAt: new Date() })
    .where(eq(resources.id, id));

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
      entityId: id,
      userId,
    });
  } catch (err) {
    console.error("field-notes ai_generations log failed", err);
  }

  return NextResponse.json({ status: "draft" });
}
