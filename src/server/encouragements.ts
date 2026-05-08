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
import { render } from "@react-email/render";
import { resend, FROM_NEWSLETTER } from "@/lib/email";
import { EncouragementEmail } from "@/emails/encouragement";

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

export async function setEncouragementStatus(
  id: string,
  status: string,
  options?: { sendBroadcast?: boolean }
) {
  await requireAdmin();
  const valid = ["draft", "scheduled", "published", "archived"];
  if (!valid.includes(status)) throw new Error("Invalid status");
  await db
    .update(weeklyEncouragements)
    .set({ status, updatedAt: new Date() })
    .where(eq(weeklyEncouragements.id, id));

  // If we're flipping to published AND the admin opted in to broadcast,
  // fire it. broadcastEncouragement is idempotent — it skips if already
  // sent.
  let broadcastResult: { sent: boolean; broadcastId?: string; reason?: string } | null = null;
  if (status === "published" && options?.sendBroadcast !== false) {
    broadcastResult = await broadcastEncouragement(id);
  }

  revalidatePath("/admin/encouragements");
  revalidatePath("/encouragements");
  return { broadcast: broadcastResult };
}

/**
 * Send the encouragement to the Resend audience as a broadcast. Idempotent:
 * if broadcast_id is already populated, returns early without sending.
 *
 * Uses the same shape as the legacy publishLetter pattern in
 * src/server/letters.ts: create the broadcast, immediately send it, store
 * the broadcast id back on the row. Failures don't throw — the caller
 * gets a structured result and the letter stays published on the website.
 */
export async function broadcastEncouragement(
  id: string
): Promise<{ sent: boolean; broadcastId?: string; reason?: string }> {
  const [row] = await db
    .select()
    .from(weeklyEncouragements)
    .where(eq(weeklyEncouragements.id, id));
  if (!row) return { sent: false, reason: "not found" };
  if (row.broadcastId) {
    return { sent: false, broadcastId: row.broadcastId, reason: "already sent" };
  }
  if (!process.env.RESEND_AUDIENCE_ID || !process.env.RESEND_API_KEY) {
    return {
      sent: false,
      reason:
        "RESEND_AUDIENCE_ID and RESEND_API_KEY must both be set on the server",
    };
  }
  if (row.status !== "published") {
    return { sent: false, reason: "letter is not published yet" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";
  const publicUrl = `${siteUrl}/encouragements/${row.slug}`;

  const scriptures = Array.isArray(row.scriptures)
    ? (row.scriptures as ScriptureRef[])
    : [];

  let html: string;
  try {
    html = await render(
      EncouragementEmail({
        issueNumber: row.issueNumber,
        theme: row.theme,
        title: row.title,
        intro: row.intro,
        scriptures,
        guidance: row.guidance,
        notes: row.notes,
        publicUrl,
        unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
      })
    );
  } catch (err) {
    console.error("EncouragementEmail render failed:", err);
    return {
      sent: false,
      reason:
        err instanceof Error
          ? `email render failed: ${err.message.slice(0, 200)}`
          : "email render failed",
    };
  }

  const text = [
    `${row.title}`,
    row.theme ? `(${row.theme})` : null,
    "",
    row.intro ?? "",
    "",
    ...scriptures.map((s) => `${s.ref}${s.note ? ` — ${s.note}` : ""}`),
    "",
    row.guidance ?? "",
    "",
    row.notes ?? "",
    "",
    `Read on the site: ${publicUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const subject = row.title;

  try {
    const broadcast = await resend().broadcasts.create({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      from: FROM_NEWSLETTER,
      subject,
      replyTo: process.env.RESEND_FROM_AUTH ?? FROM_NEWSLETTER,
      html,
      text,
    });
    if (!broadcast.data?.id) {
      return {
        sent: false,
        reason: `resend broadcasts.create returned no id: ${
          broadcast.error ? JSON.stringify(broadcast.error).slice(0, 200) : "(unknown)"
        }`,
      };
    }
    const broadcastId = broadcast.data.id;
    await resend().broadcasts.send(broadcastId);
    await db
      .update(weeklyEncouragements)
      .set({ broadcastId, broadcastAt: new Date(), updatedAt: new Date() })
      .where(eq(weeklyEncouragements.id, id));
    return { sent: true, broadcastId };
  } catch (err) {
    console.error("Resend broadcast failed:", err);
    return {
      sent: false,
      reason:
        err instanceof Error
          ? `resend send failed: ${err.message.slice(0, 200)}`
          : "resend send failed",
    };
  }
}

export async function softDeleteEncouragement(id: string) {
  await requireAdmin();
  await db
    .update(weeklyEncouragements)
    .set({ deletedAt: new Date() })
    .where(eq(weeklyEncouragements.id, id));
  revalidatePath("/admin/encouragements");
}
