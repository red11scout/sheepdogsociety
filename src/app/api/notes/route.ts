import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt));

  return Response.json({ notes: userNotes });
}

const createNoteSchema = z.object({
  reference: z.string().min(1),
  content: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const [note] = await db
    .insert(notes)
    .values({ userId, reference: parsed.data.reference, content: parsed.data.content })
    .returning();

  return Response.json({ note }, { status: 201 });
}
