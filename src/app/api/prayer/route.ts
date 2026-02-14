import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  prayerRequests,
  prayerRequestPrayers,
  users,
  groupMembers,
} from "@/db/schema";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  privacyLevel: z.enum(["public", "group", "private", "anonymous"]).optional(),
  groupId: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "active";
  const filter = searchParams.get("filter"); // "mine" | "all"

  // Get user's group IDs for group-level privacy
  const myGroupIds = (
    await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId))
  ).map((g) => g.groupId);

  // Build visibility conditions:
  // 1. Public requests (anyone can see)
  // 2. Group requests (only if user is in that group)
  // 3. Anonymous (show to all but hide author)
  // 4. Private (only the author)
  // 5. User's own requests (always visible to them)
  const visibilityConditions = [
    eq(prayerRequests.privacyLevel, "public"),
    eq(prayerRequests.privacyLevel, "anonymous"),
    eq(prayerRequests.userId, userId),
  ];

  if (myGroupIds.length > 0) {
    visibilityConditions.push(
      and(
        eq(prayerRequests.privacyLevel, "group"),
        inArray(prayerRequests.groupId, myGroupIds)
      )!
    );
  }

  const baseConditions = [
    eq(prayerRequests.status, status as "active" | "answered" | "archived"),
    or(...visibilityConditions)!,
  ];

  if (filter === "mine") {
    baseConditions.push(eq(prayerRequests.userId, userId));
  }

  const requests = await db
    .select({
      id: prayerRequests.id,
      title: prayerRequests.title,
      content: prayerRequests.content,
      privacyLevel: prayerRequests.privacyLevel,
      groupId: prayerRequests.groupId,
      status: prayerRequests.status,
      answeredAt: prayerRequests.answeredAt,
      createdAt: prayerRequests.createdAt,
      userId: prayerRequests.userId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
      prayerCount: sql<number>`(
        select count(*)::int from prayer_request_prayers
        where prayer_request_id = ${prayerRequests.id}
      )`,
      userPrayed: sql<boolean>`exists(
        select 1 from prayer_request_prayers
        where prayer_request_id = ${prayerRequests.id}
        and user_id = ${userId}
      )`,
    })
    .from(prayerRequests)
    .innerJoin(users, eq(prayerRequests.userId, users.id))
    .where(and(...baseConditions))
    .orderBy(desc(prayerRequests.createdAt));

  // Mask author info for anonymous requests
  const masked = requests.map((r) => {
    if (r.privacyLevel === "anonymous" && r.userId !== userId) {
      return {
        ...r,
        userId: null,
        authorFirstName: "Anonymous",
        authorLastName: "Brother",
        authorAvatarUrl: null,
      };
    }
    return r;
  });

  return NextResponse.json({ requests: masked });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, content, privacyLevel, groupId } = parsed.data;

  const [request] = await db
    .insert(prayerRequests)
    .values({
      userId,
      title,
      content,
      privacyLevel: privacyLevel ?? "public",
      groupId: groupId ?? null,
    })
    .returning();

  return NextResponse.json({ request }, { status: 201 });
}
