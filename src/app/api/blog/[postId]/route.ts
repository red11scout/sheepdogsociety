import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { blogPosts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ postId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const [post] = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      content: blogPosts.content,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      updatedAt: blogPosts.updatedAt,
      authorId: blogPosts.authorId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(blogPosts)
    .innerJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.id, postId));

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  excerpt: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  // Check ownership or admin
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (post.authorId !== userId && user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.status === "published" && !post.publishedAt) {
    updates.publishedAt = new Date();
  }

  const [updated] = await db
    .update(blogPosts)
    .set(updates)
    .where(eq(blogPosts.id, postId))
    .returning();

  return NextResponse.json({ post: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (post.authorId !== userId && user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  return NextResponse.json({ ok: true });
}
