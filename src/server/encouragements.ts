"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import {
  weeklyEncouragements,
  type ScriptureRef,
} from "@/db/schema-new";
import { users } from "@/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
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
    .slice(0, 80);
}

export async function listEncouragements() {
  return await db
    .select()
    .from(weeklyEncouragements)
    .where(isNull(weeklyEncouragements.deletedAt))
    .orderBy(desc(weeklyEncouragements.issueNumber));
}

export async function listPublishedEncouragements() {
  return await db
    .select({
      id: weeklyEncouragements.id,
      issueNumber: weeklyEncouragements.issueNumber,
      title: weeklyEncouragements.title,
      slug: weeklyEncouragements.slug,
      publishDate: weeklyEncouragements.publishDate,
      intro: weeklyEncouragements.intro,
      coverImageUrl: weeklyEncouragements.coverImageUrl,
      coverImageAlt: weeklyEncouragements.coverImageAlt,
    })
    .from(weeklyEncouragements)
    .where(
      and(
        eq(weeklyEncouragements.status, "published"),
        isNull(weeklyEncouragements.deletedAt)
      )
    )
    .orderBy(desc(weeklyEncouragements.publishDate));
}

export async function getPublishedEncouragementBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(weeklyEncouragements)
    .where(
      and(
        eq(weeklyEncouragements.slug, slug),
        eq(weeklyEncouragements.status, "published"),
        isNull(weeklyEncouragements.deletedAt)
      )
    );
  return row ?? null;
}

export async function getEncouragement(id: string) {
  const [row] = await db
    .select()
    .from(weeklyEncouragements)
    .where(eq(weeklyEncouragements.id, id));
  return row ?? null;
}

export async function createEncouragement(input: {
  title: string;
  theme?: string;
  voice?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
}) {
  const userId = await requireAdmin();
  const title = input.title.trim() || "Untitled";

  const [{ next }] = await db
    .select({
      next: sql<number>`COALESCE(MAX(${weeklyEncouragements.issueNumber}), 0) + 1`,
    })
    .from(weeklyEncouragements);

  const baseSlug = slugify(`issue-${next}-${title}`);
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: weeklyEncouragements.id })
      .from(weeklyEncouragements)
      .where(eq(weeklyEncouragements.slug, slug));
    if (!existing) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const [row] = await db
    .insert(weeklyEncouragements)
    .values({
      issueNumber: next,
      title,
      slug,
      authorId: userId,
      scriptures: [] as ScriptureRef[],
      theme: input.theme?.trim() ?? "",
      voice: input.voice?.trim() ?? "",
      coverImageUrl: input.coverImageUrl ?? "",
      coverImageAlt: input.coverImageAlt ?? "",
    })
    .returning();

  revalidatePath("/admin/encouragements");
  return row;
}

export async function updateEncouragement(input: {
  id: string;
  title?: string;
  intro?: string;
  updates?: string;
  scriptures?: ScriptureRef[];
  guidance?: string;
  notes?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  publishDate?: string | null;
  theme?: string;
  voice?: string;
}) {
  await requireAdmin();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title != null) patch.title = input.title;
  if (input.intro != null) patch.intro = input.intro;
  if (input.updates != null) patch.updates = input.updates;
  if (input.scriptures != null) patch.scriptures = input.scriptures;
  if (input.guidance != null) patch.guidance = input.guidance;
  if (input.notes != null) patch.notes = input.notes;
  if (input.coverImageUrl != null) patch.coverImageUrl = input.coverImageUrl;
  if (input.coverImageAlt != null) patch.coverImageAlt = input.coverImageAlt;
  if (input.publishDate !== undefined) patch.publishDate = input.publishDate;
  if (input.theme != null) patch.theme = input.theme;
  if (input.voice != null) patch.voice = input.voice;

  await db
    .update(weeklyEncouragements)
    .set(patch)
    .where(eq(weeklyEncouragements.id, input.id));
  revalidatePath("/admin/encouragements");
  revalidatePath(`/admin/encouragements/${input.id}`);
}

export async function applyDraft(input: {
  id: string;
  draft: {
    intro: string;
    scriptures: { ref: string; note: string }[];
    guidance: string;
    notes: string;
  };
}) {
  await requireAdmin();
  await db
    .update(weeklyEncouragements)
    .set({
      intro: input.draft.intro,
      scriptures: input.draft.scriptures as ScriptureRef[],
      guidance: input.draft.guidance,
      notes: input.draft.notes,
      updatedAt: new Date(),
    })
    .where(eq(weeklyEncouragements.id, input.id));
  revalidatePath("/admin/encouragements");
  revalidatePath(`/admin/encouragements/${input.id}`);
}

export async function setEncouragementStatus(id: string, status: string) {
  await requireAdmin();
  const valid = ["draft", "scheduled", "published", "archived"];
  if (!valid.includes(status)) throw new Error("Invalid status");
  await db
    .update(weeklyEncouragements)
    .set({ status, updatedAt: new Date() })
    .where(eq(weeklyEncouragements.id, id));
  revalidatePath("/admin/encouragements");
  revalidatePath("/encouragements");
}

export async function softDeleteEncouragement(id: string) {
  await requireAdmin();
  await db
    .update(weeklyEncouragements)
    .set({ deletedAt: new Date() })
    .where(eq(weeklyEncouragements.id, id));
  revalidatePath("/admin/encouragements");
}
