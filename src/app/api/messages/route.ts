import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  parentMessageId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.status !== "active") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [message] = await db
    .insert(messages)
    .values({
      channelId: parsed.data.channelId,
      userId,
      content: parsed.data.content,
      parentMessageId: parsed.data.parentMessageId ?? null,
    })
    .returning();

  return Response.json({
    message: {
      ...message,
      author: {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        avatarUrl: currentUser.avatarUrl,
        role: currentUser.role,
      },
      reactions: [],
      replyCount: 0,
    },
  });
}
