import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { blogPosts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const posts = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      status: blogPosts.status,
      category: blogPosts.category,
      isFeatured: blogPosts.isFeatured,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      authorId: blogPosts.authorId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .orderBy(desc(blogPosts.createdAt));

  return NextResponse.json({ posts });
}

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

  const { title, excerpt, category } = parsed.data;
  const slug = slugify(title) + "-" + Date.now().toString(36);

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      excerpt: excerpt ?? "",
      category: category ?? "",
      status: "draft",
      authorId: userId,
    })
    .returning();

  return NextResponse.json({ post }, { status: 201 });
}
