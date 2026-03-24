import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, scriptureOfDay } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await db
    .select()
    .from(scriptureOfDay)
    .orderBy(desc(scriptureOfDay.date));

  return NextResponse.json({ entries });
}

const createSchema = z.object({
  date: z.string().min(1),
  reference: z.string().min(1),
  text: z.string().optional(),
  translation: z.string().default("ESV"),
  theme: z.string().optional(),
  reflection: z.string().optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [entry] = await db
    .insert(scriptureOfDay)
    .values({
      date: parsed.data.date,
      reference: parsed.data.reference,
      text: parsed.data.text ?? "",
      translation: parsed.data.translation,
      theme: parsed.data.theme ?? "",
      reflection: parsed.data.reflection ?? "",
    })
    .returning();

  return NextResponse.json({ entry }, { status: 201 });
}
