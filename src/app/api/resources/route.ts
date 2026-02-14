import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { resources, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allResources = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      type: resources.type,
      url: resources.url,
      fileKey: resources.fileKey,
      isPublic: resources.isPublic,
      groupId: resources.groupId,
      uploadedBy: resources.uploadedBy,
      createdAt: resources.createdAt,
      uploaderFirstName: users.firstName,
      uploaderLastName: users.lastName,
    })
    .from(resources)
    .innerJoin(users, eq(resources.uploadedBy, users.id))
    .where(eq(resources.isPublic, true))
    .orderBy(desc(resources.createdAt));

  return NextResponse.json({ resources: allResources });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(["link", "file", "video"]),
  url: z.string().max(2000).optional(),
  fileKey: z.string().max(500).optional(),
  groupId: z.string().uuid().optional().nullable(),
  isPublic: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (
    !user ||
    !["admin", "group_leader", "asst_leader"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [resource] = await db
    .insert(resources)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      type: parsed.data.type,
      url: parsed.data.url ?? "",
      fileKey: parsed.data.fileKey ?? "",
      uploadedBy: userId,
      groupId: parsed.data.groupId ?? null,
      isPublic: parsed.data.isPublic ?? true,
    })
    .returning();

  return NextResponse.json({ resource }, { status: 201 });
}
