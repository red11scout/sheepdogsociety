"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { letters, letterVersions, users } from "@/db/schema";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("unauthorized");
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.role !== "admin") throw new Error("forbidden");
  return u;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "untitled"
  );
}

async function nextIssueNumber(): Promise<number> {
  const [row] = await db
    .select({ max: max(letters.issueNumber) })
    .from(letters)
    .where(isNull(letters.deletedAt));
  return (row?.max ?? 0) + 1;
}

// CREATE A NEW EMPTY DRAFT and redirect to its editor.
export async function createLetter() {
  const me = await requireAdmin();
  const issueNumber = await nextIssueNumber();
  const slug = `draft-${Date.now().toString(36)}`;
  const [created] = await db
    .insert(letters)
    .values({
      slug,
      issueNumber,
      title: "Untitled letter",
      body: { type: "doc", content: [{ type: "paragraph" }] },
      bodyHtml: "",
      authorId: me.id,
      status: "draft",
    })
    .returning();
  redirect(`/admin/letters/${created.id}`);
}

interface AutosaveInput {
  id: string;
  title: string;
  subtitle?: string;
  themeWord?: string;
  body: object; // Tiptap ProseMirror JSON
  bodyHtml: string;
  excerpt?: string;
}

export async function autosaveLetter(input: AutosaveInput) {
  await requireAdmin();
  // Update letter row
  await db
    .update(letters)
    .set({
      title: input.title,
      subtitle: input.subtitle ?? null,
      themeWord: input.themeWord ?? null,
      body: input.body,
      bodyHtml: input.bodyHtml,
      excerpt: input.excerpt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(letters.id, input.id));

  // Snapshot to letter_versions
  const [{ count } = { count: 0 }] = await db
    .select({ count: max(letterVersions.versionNumber) })
    .from(letterVersions)
    .where(eq(letterVersions.letterId, input.id));
  const nextVersion = (count ?? 0) + 1;

  await db.insert(letterVersions).values({
    letterId: input.id,
    versionNumber: nextVersion,
    title: input.title,
    body: input.body,
    bodyHtml: input.bodyHtml,
  });

  return { ok: true, savedAt: new Date().toISOString(), versionNumber: nextVersion };
}

interface PublishInput {
  id: string;
  finalSlug?: string;
  themeWord?: string;
}

export async function publishLetter(input: PublishInput) {
  await requireAdmin();
  const [letter] = await db
    .select()
    .from(letters)
    .where(eq(letters.id, input.id))
    .limit(1);
  if (!letter) throw new Error("not found");

  const slug = input.finalSlug || slugify(letter.title);

  await db
    .update(letters)
    .set({
      slug,
      status: "published",
      publishedAt: new Date(),
      themeWord: input.themeWord ?? letter.themeWord,
      updatedAt: new Date(),
    })
    .where(eq(letters.id, input.id));

  revalidatePath("/letter");
  revalidatePath(`/letter/${slug}`);
  revalidatePath("/");
  return { ok: true, slug };
}

export async function softDeleteLetter(id: string) {
  await requireAdmin();
  await db
    .update(letters)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(letters.id, id));
  revalidatePath("/admin/letters");
  revalidatePath("/letter");
}

export async function restoreLetter(id: string) {
  await requireAdmin();
  await db
    .update(letters)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(letters.id, id));
  revalidatePath("/admin/letters");
  revalidatePath("/admin/trash");
}

export async function listLetters(opts: { includeDeleted?: boolean } = {}) {
  await requireAdmin();
  const where = opts.includeDeleted
    ? undefined
    : isNull(letters.deletedAt);
  const rows = await db
    .select()
    .from(letters)
    .where(where)
    .orderBy(desc(letters.updatedAt));
  return rows;
}

export async function getLetter(id: string) {
  await requireAdmin();
  const [row] = await db
    .select()
    .from(letters)
    .where(and(eq(letters.id, id), isNull(letters.deletedAt)))
    .limit(1);
  return row ?? null;
}
