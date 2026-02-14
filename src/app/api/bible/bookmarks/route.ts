import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { bibleBookmarks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bookmarks = await db
    .select()
    .from(bibleBookmarks)
    .where(eq(bibleBookmarks.userId, userId))
    .orderBy(desc(bibleBookmarks.createdAt));

  return Response.json({ bookmarks });
}

const bookmarkSchema = z.object({
  reference: z.string().min(1),
  label: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bookmarkSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const [bookmark] = await db
    .insert(bibleBookmarks)
    .values({
      userId,
      reference: parsed.data.reference,
      label: parsed.data.label ?? "",
    })
    .returning();

  return Response.json({ bookmark }, { status: 201 });
}
