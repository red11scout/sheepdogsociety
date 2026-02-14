import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { channels, messages, users, reactions } from "@/db/schema";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = 50;

  // Get channel info
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  if (!channel) {
    return Response.json({ error: "Channel not found" }, { status: 404 });
  }

  // Get messages with author info
  const whereClause = cursor
    ? and(
        eq(messages.channelId, channelId),
        eq(messages.isDeleted, false),
        lt(messages.createdAt, new Date(cursor))
      )
    : and(eq(messages.channelId, channelId), eq(messages.isDeleted, false));

  const messageList = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      userId: messages.userId,
      content: messages.content,
      parentMessageId: messages.parentMessageId,
      isEdited: messages.isEdited,
      isDeleted: messages.isDeleted,
      createdAt: messages.createdAt,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
      authorRole: users.role,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(whereClause)
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  const hasMore = messageList.length > limit;
  const items = hasMore ? messageList.slice(0, limit) : messageList;

  // Get reaction counts for these messages
  const messageIds = items.map((m) => m.id);
  let reactionData: { messageId: string; emoji: string; count: number; userReacted: boolean }[] = [];

  if (messageIds.length > 0) {
    const rawReactions = await db
      .select({
        messageId: reactions.messageId,
        emoji: reactions.emoji,
        userId: reactions.userId,
      })
      .from(reactions)
      .where(sql`${reactions.messageId} = ANY(${messageIds})`);

    // Aggregate reactions
    const reactionMap = new Map<string, Map<string, { count: number; userReacted: boolean }>>();
    for (const r of rawReactions) {
      if (!reactionMap.has(r.messageId)) {
        reactionMap.set(r.messageId, new Map());
      }
      const emojiMap = reactionMap.get(r.messageId)!;
      if (!emojiMap.has(r.emoji)) {
        emojiMap.set(r.emoji, { count: 0, userReacted: false });
      }
      const entry = emojiMap.get(r.emoji)!;
      entry.count++;
      if (r.userId === userId) entry.userReacted = true;
    }

    reactionData = [];
    for (const [messageId, emojiMap] of reactionMap) {
      for (const [emoji, data] of emojiMap) {
        reactionData.push({ messageId, emoji, ...data });
      }
    }
  }

  // Get reply counts for thread parents
  const replyCounts: Record<string, number> = {};
  if (messageIds.length > 0) {
    const replyRows = await db
      .select({
        parentId: messages.parentMessageId,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(
        and(
          sql`${messages.parentMessageId} = ANY(${messageIds})`,
          eq(messages.isDeleted, false)
        )
      )
      .groupBy(messages.parentMessageId);

    for (const row of replyRows) {
      if (row.parentId) {
        replyCounts[row.parentId] = Number(row.count);
      }
    }
  }

  // Format response
  const formattedMessages = items.reverse().map((m) => ({
    id: m.id,
    channelId: m.channelId,
    userId: m.userId,
    content: m.content,
    parentMessageId: m.parentMessageId,
    isEdited: m.isEdited,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt,
    author: {
      id: m.userId,
      firstName: m.authorFirstName ?? "",
      lastName: m.authorLastName ?? "",
      avatarUrl: m.authorAvatarUrl,
      role: m.authorRole,
    },
    reactions: reactionData
      .filter((r) => r.messageId === m.id)
      .map((r) => ({
        emoji: r.emoji,
        count: r.count,
        userReacted: r.userReacted,
      })),
    replyCount: replyCounts[m.id] ?? 0,
  }));

  return Response.json({
    channel,
    messages: formattedMessages,
    hasMore,
    nextCursor: hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null,
  });
}
