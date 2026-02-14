import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { channels, channelMembers, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

// GET: List user's DM channels
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get DM channels where user is a member
  const dmChannels = await db
    .select({
      id: channels.id,
      name: channels.name,
      type: channels.type,
      createdAt: channels.createdAt,
    })
    .from(channels)
    .innerJoin(channelMembers, eq(channelMembers.channelId, channels.id))
    .where(
      and(
        eq(channels.type, "dm"),
        eq(channelMembers.userId, userId),
        eq(channels.isArchived, false)
      )
    );

  return Response.json({ channels: dmChannels });
}

// POST: Create or find existing DM between two users
const createDmSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createDmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { targetUserId } = parsed.data;

  if (targetUserId === userId) {
    return Response.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  // Check if DM channel already exists between these two users
  const existingDms = await db
    .select({ channelId: channelMembers.channelId })
    .from(channelMembers)
    .innerJoin(channels, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channels.type, "dm"),
        eq(channelMembers.userId, userId)
      )
    );

  for (const dm of existingDms) {
    const [otherMember] = await db
      .select()
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, dm.channelId),
          eq(channelMembers.userId, targetUserId)
        )
      );

    if (otherMember) {
      // DM already exists
      return Response.json({ channelId: dm.channelId });
    }
  }

  // Get target user's name for channel label
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId));

  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  // Create new DM channel
  const [dmChannel] = await db
    .insert(channels)
    .values({
      name: `${currentUser?.firstName ?? ""} & ${targetUser.firstName}`,
      type: "dm",
      createdBy: userId,
    })
    .returning();

  // Add both users as members
  await db.insert(channelMembers).values([
    { channelId: dmChannel.id, userId },
    { channelId: dmChannel.id, userId: targetUserId },
  ]);

  return Response.json({ channelId: dmChannel.id }, { status: 201 });
}
