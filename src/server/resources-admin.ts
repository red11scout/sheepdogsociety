"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resourceSections } from "@/db/schema-new";
import { resources, users } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

// ============================================================
// Sections
// ============================================================
export async function listSections() {
  return await db
    .select()
    .from(resourceSections)
    .where(isNull(resourceSections.deletedAt))
    .orderBy(asc(resourceSections.sortOrder), asc(resourceSections.name));
}

export async function createSection(input: {
  name: string;
  description?: string;
  icon?: string;
}) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Name required");
  let slug = slugify(name);
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: resourceSections.id })
      .from(resourceSections)
      .where(eq(resourceSections.slug, slug));
    if (!existing) break;
    suffix += 1;
    slug = `${slugify(name)}-${suffix}`;
  }

  const [row] = await db
    .insert(resourceSections)
    .values({
      name,
      slug,
      description: input.description ?? "",
      icon: input.icon ?? "scroll",
    })
    .returning();
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  return row;
}

export async function updateSection(input: {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (input.name != null) patch.name = input.name;
  if (input.description != null) patch.description = input.description;
  if (input.icon != null) patch.icon = input.icon;
  if (input.sortOrder != null) patch.sortOrder = input.sortOrder;

  await db
    .update(resourceSections)
    .set(patch)
    .where(eq(resourceSections.id, input.id));
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function softDeleteSection(id: string) {
  await requireAdmin();
  await db
    .update(resourceSections)
    .set({ deletedAt: new Date() })
    .where(eq(resourceSections.id, id));
  revalidatePath("/admin/resources");
}

// ============================================================
// Resources
// ============================================================
export async function listResourcesForAdmin() {
  return await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      type: resources.type,
      url: resources.url,
      fileKey: resources.fileKey,
      category: resources.category,
      isPublic: resources.isPublic,
      level: resources.level,
      seriesName: resources.seriesName,
      createdAt: resources.createdAt,
    })
    .from(resources);
}

export async function createResource(input: {
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  type?: "link" | "file" | "video";
  category?: string;
  level?: string;
}) {
  const userId = await requireAdmin();
  const [row] = await db
    .insert(resources)
    .values({
      title: input.title,
      description: input.description ?? "",
      url: input.url ?? "",
      fileKey: input.fileKey ?? "",
      type: input.type ?? (input.fileKey ? "file" : "link"),
      category: input.category ?? "general",
      level: input.level ?? "all",
      isPublic: true,
      uploadedBy: userId,
    })
    .returning();
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  return row;
}

export async function updateResource(input: {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  fileKey?: string;
  category?: string;
  level?: string;
  isPublic?: boolean;
}) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (input.title != null) patch.title = input.title;
  if (input.description != null) patch.description = input.description;
  if (input.url != null) patch.url = input.url;
  if (input.fileKey != null) patch.fileKey = input.fileKey;
  if (input.category != null) patch.category = input.category;
  if (input.level != null) patch.level = input.level;
  if (input.isPublic != null) patch.isPublic = input.isPublic;
  await db.update(resources).set(patch).where(eq(resources.id, input.id));
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function deleteResource(id: string) {
  await requireAdmin();
  await db.delete(resources).where(eq(resources.id, id));
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function listSectionsAndResourcesForPublic() {
  const sections = await db
    .select()
    .from(resourceSections)
    .where(isNull(resourceSections.deletedAt))
    .orderBy(asc(resourceSections.sortOrder), asc(resourceSections.name));

  const items = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      url: resources.url,
      fileKey: resources.fileKey,
      type: resources.type,
      category: resources.category,
      level: resources.level,
      seriesName: resources.seriesName,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .where(eq(resources.isPublic, true));

  return { sections, items };
}
