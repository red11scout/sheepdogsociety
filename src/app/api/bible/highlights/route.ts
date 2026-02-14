import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { bibleHighlights } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const highlights = await db
    .select()
    .from(bibleHighlights)
    .where(eq(bibleHighlights.userId, userId))
    .orderBy(desc(bibleHighlights.createdAt));

  return Response.json({ highlights });
}

const highlightSchema = z.object({
  reference: z.string().min(1),
  color: z.enum(["gold", "blue", "green", "red"]).default("gold"),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = highlightSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const [highlight] = await db
    .insert(bibleHighlights)
    .values({
      userId,
      reference: parsed.data.reference,
      color: parsed.data.color,
    })
    .returning();

  return Response.json({ highlight }, { status: 201 });
}
