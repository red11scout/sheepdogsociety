import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { readingProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ planId: string }> };

// Get user's progress for a plan
export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const progress = await db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.readingPlanId, planId),
        eq(readingProgress.userId, userId)
      )
    );

  const completedDays = progress.map((p) => p.dayNumber);
  return NextResponse.json({ completedDays });
}

const markSchema = z.object({
  dayNumber: z.number().int().positive(),
});

// Mark a day as completed
export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const body = await req.json();
  const parsed = markSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Toggle: if already completed, remove it
  const [existing] = await db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.readingPlanId, planId),
        eq(readingProgress.userId, userId),
        eq(readingProgress.dayNumber, parsed.data.dayNumber)
      )
    );

  if (existing) {
    await db.delete(readingProgress).where(eq(readingProgress.id, existing.id));
    return NextResponse.json({ completed: false });
  }

  await db.insert(readingProgress).values({
    userId,
    readingPlanId: planId,
    dayNumber: parsed.data.dayNumber,
  });

  return NextResponse.json({ completed: true }, { status: 201 });
}
