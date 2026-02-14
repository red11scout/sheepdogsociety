import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;
  const body = await req.json();
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // Toggle: if exists, remove. If not, add.
  const [existing] = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.messageId, messageId),
        eq(reactions.userId, userId),
        eq(reactions.emoji, parsed.data.emoji)
      )
    );

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    return Response.json({ action: "removed" });
  }

  await db.insert(reactions).values({
    messageId,
    userId,
    emoji: parsed.data.emoji,
  });

  return Response.json({ action: "added" });
}
