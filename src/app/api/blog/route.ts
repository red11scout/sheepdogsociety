import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { blogPosts, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.any(), // TipTap JSON
  excerpt: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).optional(),
});

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const authorId = searchParams.get("authorId");

  let query = db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      authorId: blogPosts.authorId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(blogPosts)
    .innerJoin(users, eq(blogPosts.authorId, users.id))
    .orderBy(desc(blogPosts.createdAt))
    .$dynamic();

  // Non-admin users only see published posts (unless looking at their own)
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const isLeader =
    user?.role === "admin" ||
    user?.role === "group_leader" ||
    user?.role === "asst_leader";

  if (status === "draft" && isLeader) {
    query = query.where(eq(blogPosts.status, "draft"));
  } else if (authorId === userId) {
    // Own posts — all statuses
  } else {
    query = query.where(eq(blogPosts.status, "published"));
  }

  const posts = await query;
  return NextResponse.json({ posts });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only leaders+ can create blog posts
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (
    !user ||
    !["admin", "group_leader", "asst_leader"].includes(user.role)
  ) {
    return NextResponse.json({ error: "Not authorized to create posts" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, content, excerpt, coverImageUrl, status } = parsed.data;
  const slug = slugify(title) + "-" + Date.now().toString(36);
  const isPublished = status === "published";

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      content,
      excerpt: excerpt ?? "",
      coverImageUrl: coverImageUrl ?? "",
      authorId: userId,
      status: status ?? "draft",
      publishedAt: isPublished ? new Date() : null,
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}
