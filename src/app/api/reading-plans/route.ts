import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { readingPlans, readingProgress, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await db
    .select({
      id: readingPlans.id,
      name: readingPlans.name,
      description: readingPlans.description,
      totalDays: readingPlans.totalDays,
      readings: readingPlans.readings,
      isActive: readingPlans.isActive,
      createdBy: readingPlans.createdBy,
      createdAt: readingPlans.createdAt,
      completedDays: sql<number>`(
        select count(*)::int from reading_progress
        where reading_plan_id = ${readingPlans.id}
        and user_id = ${userId}
      )`,
    })
    .from(readingPlans)
    .where(eq(readingPlans.isActive, true));

  return NextResponse.json({ plans });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  readings: z.array(
    z.object({
      day: z.number().int().positive(),
      readings: z.array(z.string()),
    })
  ),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !["admin", "group_leader"].includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [plan] = await db
    .insert(readingPlans)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      totalDays: parsed.data.readings.length,
      readings: parsed.data.readings,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json({ plan }, { status: 201 });
}
