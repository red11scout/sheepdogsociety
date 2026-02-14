import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get members with user info
  const members = await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const myMembership = members.find((m) => m.userId === userId);

  return NextResponse.json({
    group,
    members,
    myRole: myMembership?.role ?? null,
    isMember: !!myMembership,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  meetingSchedule: z.string().max(200).optional(),
  meetingLocation: z.string().max(200).optional(),
  maxMembers: z.number().int().min(2).max(50).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  // Check the user is a leader of this group or admin
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  const isGroupLeader = membership?.role === "leader" || membership?.role === "asst_leader";
  if (!isGroupLeader && user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(groups)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(groups.id, groupId))
    .returning();

  return NextResponse.json({ group: updated });
}

// Soft-delete a group (admin only)
export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  // Only admins can delete groups
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete groups" }, { status: 403 });
  }

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(groups)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(groups.id, groupId))
    .returning();

  return NextResponse.json({ group: updated });
}
