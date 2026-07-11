"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { siteText, users } from "@/db/schema";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";

const MAX_VALUE_LENGTH = 2000;

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") throw new Error("Not an admin");
  return userId;
}

function entryFor(key: string) {
  return SITE_TEXT_KEYS.find((e) => e.key === key);
}

function revalidateSiteText(key: string) {
  // Next.js 16: bare revalidateTag(tag) is deprecated in favor of a
  // required second "profile" arg. Passing a profile (e.g. "max") opts
  // into stale-while-revalidate semantics and skips the immediate
  // pathWasRevalidated flag — updateTag(tag) is the intended Server
  // Action replacement: same tag invalidation, but read-your-own-writes
  // stays immediate, matching the brief's "edits are live immediately".
  updateTag("site-text");
  // Only two pages consume site_text in this phase.
  revalidatePath(key.startsWith("about.") ? "/about" : "/");
}

export async function saveSiteText(
  key: string,
  value: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    const entry = entryFor(key);
    if (!entry) return { ok: false, error: "Unknown text key." };
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      return { ok: false, error: "That text is too long. Keep it under 2,000 characters." };
    }
    if (!value.trim()) {
      await db.delete(siteText).where(eq(siteText.key, key));
      revalidateSiteText(key);
      return { ok: true };
    }
    await db
      .insert(siteText)
      .values({
        key,
        label: entry.label,
        groupName: entry.group,
        value,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: siteText.key,
        set: { value, label: entry.label, groupName: entry.group, updatedAt: new Date(), updatedBy: userId },
      });
    revalidateSiteText(key);
    return { ok: true };
  } catch (err) {
    console.error("saveSiteText failed", err);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function resetSiteText(
  key: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!entryFor(key)) return { ok: false, error: "Unknown text key." };
    await db.delete(siteText).where(eq(siteText.key, key));
    revalidateSiteText(key);
    return { ok: true };
  } catch (err) {
    console.error("resetSiteText failed", err);
    return { ok: false, error: "Could not reset. Try again." };
  }
}
