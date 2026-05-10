"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { resourceSections } from "@/db/schema-new";
import { resources, users } from "@/db/schema";
import { eq, isNull, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { categorizeResource } from "@/lib/resources/categorize";
import { uniqueResourceSlug } from "@/lib/resources/slug";

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
      slug: resources.slug,
      summary: resources.summary,
      description: resources.description,
      type: resources.type,
      url: resources.url,
      fileKey: resources.fileKey,
      sourceFilename: resources.sourceFilename,
      sectionId: resources.sectionId,
      category: resources.category,
      isPublic: resources.isPublic,
      level: resources.level,
      audience: resources.audience,
      seriesName: resources.seriesName,
      topics: resources.topics,
      themes: resources.themes,
      booksOfBible: resources.booksOfBible,
      estimatedMinutes: resources.estimatedMinutes,
      aiCategorizedAt: resources.aiCategorizedAt,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .where(isNull(resources.deletedAt))
    .orderBy(desc(resources.createdAt))
    .limit(500);
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
  const slug = await uniqueResourceSlug(input.title);
  const [row] = await db
    .insert(resources)
    .values({
      title: input.title,
      slug,
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
  // Soft delete so the unique slug index frees up after the WHERE deleted_at clause.
  await db
    .update(resources)
    .set({ deletedAt: new Date(), isPublic: false })
    .where(eq(resources.id, id));
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
}

export async function recategorizeResource(id: string) {
  await requireAdmin();
  const [row] = await db
    .select({
      id: resources.id,
      title: resources.title,
      bodyText: resources.bodyText,
      sectionId: resources.sectionId,
    })
    .from(resources)
    .where(eq(resources.id, id));
  if (!row) throw new Error("Not found");
  if (!row.bodyText || row.bodyText.trim().length < 100) {
    throw new Error(
      "No extracted body text to categorize. PDFs and short docs need to be tagged manually."
    );
  }

  let sectionName: string | undefined;
  if (row.sectionId) {
    const [s] = await db
      .select({ name: resourceSections.name })
      .from(resourceSections)
      .where(eq(resourceSections.id, row.sectionId));
    sectionName = s?.name;
  }

  const cat = await categorizeResource({
    title: row.title,
    bodyText: row.bodyText,
    sectionName,
  });

  await db
    .update(resources)
    .set({
      summary: cat.summary,
      topics: cat.topics,
      themes: cat.themes,
      booksOfBible: cat.booksOfBible,
      audience: cat.audience,
      aiCategorizedAt: new Date(),
    })
    .where(eq(resources.id, id));

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  revalidatePath(`/resources/${row.id}`);
  return cat;
}

export async function moveResourceToSection(id: string, sectionId: string) {
  await requireAdmin();
  const [section] = await db
    .select({ slug: resourceSections.slug })
    .from(resourceSections)
    .where(eq(resourceSections.id, sectionId));
  if (!section) throw new Error("Section not found");
  await db
    .update(resources)
    .set({ sectionId, category: section.slug })
    .where(eq(resources.id, id));
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
      slug: resources.slug,
      summary: resources.summary,
      description: resources.description,
      url: resources.url,
      fileKey: resources.fileKey,
      type: resources.type,
      provider: resources.provider,
      thumbnailUrl: resources.thumbnailUrl,
      author: resources.author,
      durationSeconds: resources.durationSeconds,
      category: resources.category,
      sectionId: resources.sectionId,
      level: resources.level,
      audience: resources.audience,
      seriesName: resources.seriesName,
      topics: resources.topics,
      themes: resources.themes,
      booksOfBible: resources.booksOfBible,
      estimatedMinutes: resources.estimatedMinutes,
      hasBody: resources.bodyHtml,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .where(eq(resources.isPublic, true));

  // Map hasBody (text) → boolean for the client.
  const itemsClient = items.map((it) => ({
    ...it,
    hasBody: !!it.hasBody && it.hasBody.length > 0,
  }));

  return { sections, items: itemsClient };
}

export async function getPublicResourceBySlug(slug: string) {
  const [row] = await db
    .select({
      id: resources.id,
      title: resources.title,
      slug: resources.slug,
      summary: resources.summary,
      bodyHtml: resources.bodyHtml,
      bodyText: resources.bodyText,
      url: resources.url,
      fileKey: resources.fileKey,
      sourceFilename: resources.sourceFilename,
      sourceMime: resources.sourceMime,
      type: resources.type,
      provider: resources.provider,
      embedHtml: resources.embedHtml,
      thumbnailUrl: resources.thumbnailUrl,
      author: resources.author,
      durationSeconds: resources.durationSeconds,
      companionUrl: resources.companionUrl,
      companionFileKey: resources.companionFileKey,
      companionLabel: resources.companionLabel,
      sectionId: resources.sectionId,
      audience: resources.audience,
      topics: resources.topics,
      themes: resources.themes,
      booksOfBible: resources.booksOfBible,
      estimatedMinutes: resources.estimatedMinutes,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .where(eq(resources.slug, slug));

  if (!row || !row.id) return null;

  let section: { name: string; slug: string; icon: string | null } | null = null;
  if (row.sectionId) {
    const [s] = await db
      .select({
        name: resourceSections.name,
        slug: resourceSections.slug,
        icon: resourceSections.icon,
      })
      .from(resourceSections)
      .where(eq(resourceSections.id, row.sectionId));
    section = s ?? null;
  }
  return { ...row, section };
}
