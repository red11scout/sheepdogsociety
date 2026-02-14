import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  // Admin sees all, others see approved only
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const isAdmin = user?.role === "admin";

  const conditions = isAdmin && showAll
    ? []
    : [eq(testimonies.isApproved, true)];

  const allTestimonies = await db
    .select({
      id: testimonies.id,
      title: testimonies.title,
      content: testimonies.content,
      isApproved: testimonies.isApproved,
      createdAt: testimonies.createdAt,
      userId: testimonies.userId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(testimonies)
    .innerJoin(users, eq(testimonies.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(testimonies.createdAt));

  return NextResponse.json({ testimonies: allTestimonies });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [testimony] = await db
    .insert(testimonies)
    .values({
      userId,
      title: parsed.data.title,
      content: parsed.data.content,
      isApproved: false,
    })
    .returning();

  return NextResponse.json({ testimony }, { status: 201 });
}
