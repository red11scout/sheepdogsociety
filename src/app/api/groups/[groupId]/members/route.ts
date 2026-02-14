import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { groups, groupMembers, channelMembers, channels, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ groupId: string }> };

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["leader", "asst_leader", "member"]).optional(),
});

// Join a group (self) or add a member (leader)
export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetUserId = parsed.data.userId;
  const isSelfJoin = targetUserId === userId;

  if (!isSelfJoin) {
    // Only leaders can add other members
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!membership || membership.role === "member") {
      return NextResponse.json({ error: "Only group leaders can add members" }, { status: 403 });
    }
  }

  // Check max members
  const existingMembers = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  if (existingMembers.length >= group.maxMembers) {
    return NextResponse.json({ error: "Group is full" }, { status: 400 });
  }

  // Check not already a member
  const [existing] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId))
    );

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Add to group
  const [member] = await db
    .insert(groupMembers)
    .values({
      groupId,
      userId: targetUserId,
      role: parsed.data.role ?? "member",
      invitedBy: isSelfJoin ? undefined : userId,
    })
    .returning();

  // Also add to group channel
  const groupChannel = await db
    .select()
    .from(channels)
    .where(and(eq(channels.groupId, groupId), eq(channels.type, "group")));

  for (const ch of groupChannel) {
    await db
      .insert(channelMembers)
      .values({ channelId: ch.id, userId: targetUserId })
      .onConflictDoNothing();
  }

  return NextResponse.json({ member }, { status: 201 });
}

// Leave a group or remove a member
export async function DELETE(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") ?? userId;
  const isSelfLeave = targetUserId === userId;

  if (!isSelfLeave) {
    // Only leaders can remove members
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    if (!membership || membership.role === "member") {
      return NextResponse.json({ error: "Only group leaders can remove members" }, { status: 403 });
    }
  }

  // Remove from group
  await db
    .delete(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId))
    );

  // Remove from group channels
  const groupChannel = await db
    .select()
    .from(channels)
    .where(and(eq(channels.groupId, groupId), eq(channels.type, "group")));

  for (const ch of groupChannel) {
    await db
      .delete(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, ch.id),
          eq(channelMembers.userId, targetUserId)
        )
      );
  }

  return NextResponse.json({ ok: true });
}
