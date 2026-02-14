import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, devotionals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [devotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id));

  if (!devotional)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ devotional });
}

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
  scriptureReference: z.string().min(1).max(200).optional(),
  scriptureText: z.string().optional(),
  prayerPrompt: z.string().optional(),
  discussionQuestions: z.array(z.string()).optional(),
  isApproved: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Admin-only
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [existing] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id));

  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(devotionals)
    .set(parsed.data)
    .where(eq(devotionals.id, id))
    .returning();

  return NextResponse.json({ devotional: updated });
}
