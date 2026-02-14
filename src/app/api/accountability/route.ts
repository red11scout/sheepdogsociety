import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { accountabilityPairs, accountabilityCheckins, users } from "@/db/schema";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all pairs where user is involved
  const pairs = await db
    .select({
      id: accountabilityPairs.id,
      user1Id: accountabilityPairs.user1Id,
      user2Id: accountabilityPairs.user2Id,
      status: accountabilityPairs.status,
      startedAt: accountabilityPairs.startedAt,
    })
    .from(accountabilityPairs)
    .where(
      and(
        or(
          eq(accountabilityPairs.user1Id, userId),
          eq(accountabilityPairs.user2Id, userId)
        ),
        eq(accountabilityPairs.status, "active")
      )
    );

  // Get partner info for each pair
  const enriched = await Promise.all(
    pairs.map(async (pair) => {
      const partnerId =
        pair.user1Id === userId ? pair.user2Id : pair.user1Id;
      const [partner] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, partnerId));

      // Get recent check-ins
      const recentCheckins = await db
        .select()
        .from(accountabilityCheckins)
        .where(eq(accountabilityCheckins.pairId, pair.id))
        .orderBy(desc(accountabilityCheckins.createdAt))
        .limit(5);

      // Calculate streak (consecutive weeks with check-ins)
      const checkinCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(accountabilityCheckins)
        .where(
          and(
            eq(accountabilityCheckins.pairId, pair.id),
            eq(accountabilityCheckins.userId, userId)
          )
        );

      return {
        ...pair,
        partner,
        recentCheckins,
        totalCheckins: checkinCount[0]?.count ?? 0,
      };
    })
  );

  return NextResponse.json({ pairs: enriched });
}

const createPairSchema = z.object({
  partnerId: z.string().min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createPairSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.partnerId === userId) {
    return NextResponse.json({ error: "Cannot pair with yourself" }, { status: 400 });
  }

  // Check no active pair already exists between these two
  const existing = await db
    .select()
    .from(accountabilityPairs)
    .where(
      and(
        eq(accountabilityPairs.status, "active"),
        or(
          and(
            eq(accountabilityPairs.user1Id, userId),
            eq(accountabilityPairs.user2Id, parsed.data.partnerId)
          ),
          and(
            eq(accountabilityPairs.user1Id, parsed.data.partnerId),
            eq(accountabilityPairs.user2Id, userId)
          )
        )
      )
    );

  if (existing.length > 0) {
    return NextResponse.json({ error: "Active pair already exists" }, { status: 400 });
  }

  const [pair] = await db
    .insert(accountabilityPairs)
    .values({
      user1Id: userId,
      user2Id: parsed.data.partnerId,
    })
    .returning();

  return NextResponse.json({ pair }, { status: 201 });
}
