import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { accountabilityCheckins, accountabilityPairs } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ pairId: string }> };

const checkinSchema = z.object({
  mood: z.string().max(50).optional(),
  highlights: z.string().max(1000).optional(),
  struggles: z.string().max(1000).optional(),
  prayerNeeds: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pairId } = await params;

  // Verify user is part of this pair
  const [pair] = await db
    .select()
    .from(accountabilityPairs)
    .where(
      and(
        eq(accountabilityPairs.id, pairId),
        or(
          eq(accountabilityPairs.user1Id, userId),
          eq(accountabilityPairs.user2Id, userId)
        )
      )
    );

  if (!pair) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [checkin] = await db
    .insert(accountabilityCheckins)
    .values({
      pairId,
      userId,
      mood: parsed.data.mood ?? "",
      highlights: parsed.data.highlights ?? "",
      struggles: parsed.data.struggles ?? "",
      prayerNeeds: parsed.data.prayerNeeds ?? "",
    })
    .returning();

  return NextResponse.json({ checkin }, { status: 201 });
}
