import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  groups,
  groupMembers,
  channels,
  channelMembers,
  users,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  meetingSchedule: z.string().max(200).optional(),
  meetingLocation: z.string().max(200).optional(),
  maxMembers: z.number().int().min(2).max(50).optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all active groups with member count and whether current user is a member
  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      meetingSchedule: groups.meetingSchedule,
      meetingLocation: groups.meetingLocation,
      maxMembers: groups.maxMembers,
      isActive: groups.isActive,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
      memberCount: sql<number>`count(distinct ${groupMembers.id})::int`,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(eq(groups.isActive, true))
    .groupBy(groups.id);

  // Get user's memberships
  const myMemberships = await db
    .select({
      groupId: groupMembers.groupId,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const membershipMap = new Map(
    myMemberships.map((m) => [m.groupId, m.role])
  );

  const enriched = allGroups.map((g) => ({
    ...g,
    myRole: membershipMap.get(g.id) ?? null,
    isMember: membershipMap.has(g.id),
  }));

  return NextResponse.json({ groups: enriched });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check user is at least a group leader
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !["admin", "group_leader"].includes(user.role)) {
    return NextResponse.json({ error: "Only admins and group leaders can create groups" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, meetingSchedule, meetingLocation, maxMembers } = parsed.data;

  // Create group
  const [group] = await db
    .insert(groups)
    .values({
      name,
      description: description ?? "",
      meetingSchedule: meetingSchedule ?? "",
      meetingLocation: meetingLocation ?? "",
      maxMembers: maxMembers ?? 15,
      createdBy: userId,
    })
    .returning();

  // Add creator as leader
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    role: "leader",
  });

  // Auto-create a group channel
  const [channel] = await db
    .insert(channels)
    .values({
      name: name.toLowerCase().replace(/\s+/g, "-"),
      type: "group",
      description: `Group channel for ${name}`,
      groupId: group.id,
      createdBy: userId,
    })
    .returning();

  // Add creator to channel
  await db.insert(channelMembers).values({
    channelId: channel.id,
    userId,
  });

  return NextResponse.json({ group, channel }, { status: 201 });
}
