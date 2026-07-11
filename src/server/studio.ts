"use server";

import { revalidatePath, updateTag } from "next/cache";
import { asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { siteStudio, siteText, studioVersions, users } from "@/db/schema";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { resolveThemeId, type StudioConfig } from "@/lib/studio/config";
import { normalize } from "@/lib/studio/get";
import { SECTION_REGISTRY } from "@/lib/studio/sections";
import { summarize } from "@/lib/studio/summary";
import { THEMES, THEME_IDS } from "@/lib/studio/themes";

/** Serializes Apply/Restore. NOT 815551 — that lock belongs to letter
 *  series creation (wizard + autopilot + single-letter create). */
const STUDIO_LOCK = 815552;

const MAX_VALUE_LENGTH = 2000;

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") throw new Error("Not an admin");
  return userId;
}

function textEntry(key: string) {
  return SITE_TEXT_KEYS.find((e) => e.key === key);
}

function sectionLabelMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const page of Object.values(SECTION_REGISTRY))
    for (const s of page.sections) out[s.id] = s.label;
  return out;
}

function themeNameMap(): Record<string, string> {
  return Object.fromEntries(THEMES.map((t) => [t.id, t.name]));
}

type Snapshot = { config: StudioConfig; textOverrides: Record<string, string> };

/** Task 4 carry-in: getStudioConfig's normalize is shallow — keep malformed
 *  jsonb out of the column at THIS write boundary instead. Validates shape,
 *  resolves themeId, drops unknown page/section ids (render-merge idiom). */
function validateConfig(input: unknown): { ok: true; config: StudioConfig } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Malformed config." };
  }
  const c = input as Record<string, unknown>;
  if (typeof c.themeId !== "string") return { ok: false, error: "Malformed config: themeId must be a string." };
  if (typeof c.pages !== "object" || c.pages === null || Array.isArray(c.pages)) {
    return { ok: false, error: "Malformed config: pages must be an object." };
  }
  const pages: StudioConfig["pages"] = {};
  for (const [pageId, page] of Object.entries(c.pages as Record<string, unknown>)) {
    const registry = SECTION_REGISTRY[pageId];
    if (!registry) continue; // unknown page ids dropped
    if (typeof page !== "object" || page === null || Array.isArray(page)) {
      return { ok: false, error: `Malformed config: page "${pageId}" must be an object.` };
    }
    const sections = (page as Record<string, unknown>).sections;
    if (!Array.isArray(sections)) {
      return { ok: false, error: `Malformed config: page "${pageId}" sections must be an array.` };
    }
    const known = new Set(registry.sections.map((s) => s.id));
    const kept: { id: string; visible: boolean }[] = [];
    for (const s of sections) {
      if (typeof s !== "object" || s === null) return { ok: false, error: "Malformed config: bad section entry." };
      const { id, visible } = s as Record<string, unknown>;
      if (typeof id !== "string" || typeof visible !== "boolean") {
        return { ok: false, error: "Malformed config: sections must be {id: string, visible: boolean}." };
      }
      if (known.has(id)) kept.push({ id, visible }); // unknown section ids dropped
    }
    pages[pageId] = { sections: kept };
  }
  return {
    ok: true,
    config: { themeId: resolveThemeId({ themeId: c.themeId, pages: {} }, THEME_IDS), pages },
  };
}

/** Single-row pilot read (letter_autopilot precedent); creates the row on
 *  first touch. `tx` may be the root db too. */
async function pilotRow(tx: typeof db) {
  const [pilot] = await tx.select().from(siteStudio).orderBy(asc(siteStudio.id)).limit(1);
  return pilot ?? (await tx.insert(siteStudio).values({}).returning())[0];
}

export async function saveDraftConfig(config: StudioConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    const checked = validateConfig(config);
    if (!checked.ok) return { ok: false, error: checked.error };
    const row = await pilotRow(db);
    await db
      .update(siteStudio)
      .set({ draft: checked.config, updatedAt: new Date(), updatedBy: userId })
      .where(eq(siteStudio.id, row.id));
    return { ok: true };
  } catch (err) {
    console.error("saveDraftConfig failed", err);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function saveDraftText(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    const entry = textEntry(key);
    if (!entry) return { ok: false, error: "Unknown text key." };
    if (typeof value !== "string" || value.length > MAX_VALUE_LENGTH) {
      return { ok: false, error: "That text is too long. Keep it under 2,000 characters." };
    }
    // Empty string is a legit staged reset. Carrier row (value: '') when the
    // key has no published override yet; conflict path must not touch value.
    await db
      .insert(siteText)
      .values({
        key,
        label: entry.label,
        groupName: entry.group,
        value: "",
        draftValue: value,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .onConflictDoUpdate({
        target: siteText.key,
        set: { draftValue: value, updatedAt: new Date(), updatedBy: userId },
      });
    return { ok: true };
  } catch (err) {
    console.error("saveDraftText failed", err);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function applyDraft(): Promise<{ ok: boolean; error?: string; summary?: string }> {
  try {
    const userId = await requireAdmin();
    let summary = "";
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${STUDIO_LOCK})`);
      const row = await pilotRow(tx as unknown as typeof db);

      const currentOverrides = async () => {
        const rows = await tx.select({ key: siteText.key, value: siteText.value }).from(siteText);
        return Object.fromEntries(rows.filter((r) => r.value.trim() !== "").map((r) => [r.key, r.value]));
      };

      // Baseline version on first apply: the pre-apply published state.
      const [{ n }] = await tx.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM studio_versions`);
      const prevSnap: Snapshot = { config: normalize(row.published), textOverrides: await currentOverrides() };
      if (n === 0) {
        await tx.insert(studioVersions).values({
          snapshot: prevSnap,
          summary: "Before the first Studio change",
          createdBy: userId,
        });
      }

      // Publish config.
      await tx
        .update(siteStudio)
        .set({ published: row.draft, updatedAt: new Date(), updatedBy: userId })
        .where(eq(siteStudio.id, row.id));

      // Promote text drafts: blank draft = reset (delete row); else promote.
      await tx.execute(sql`DELETE FROM site_text WHERE draft_value IS NOT NULL AND btrim(draft_value) = ''`);
      await tx.execute(sql`
        UPDATE site_text SET value = draft_value, draft_value = NULL,
          updated_at = now(), updated_by = ${userId}
        WHERE draft_value IS NOT NULL`);
      // No orphan blank rows: carriers either promoted or deleted above.

      // Snapshot the NEW published state; newest row == current state.
      const nextSnap: Snapshot = { config: normalize(row.draft), textOverrides: await currentOverrides() };
      summary = summarize(prevSnap, nextSnap, sectionLabelMap(), themeNameMap());
      await tx.insert(studioVersions).values({ snapshot: nextSnap, summary, createdBy: userId });
      await tx.execute(sql`
        DELETE FROM studio_versions WHERE id NOT IN
          (SELECT id FROM studio_versions ORDER BY id DESC LIMIT 50)`);
    });
    updateTag("studio");
    updateTag("site-text");
    revalidatePath("/", "layout");
    return { ok: true, summary };
  } catch (err) {
    console.error("applyDraft failed", err);
    return { ok: false, error: "Could not apply. Nothing changed. Try again." };
  }
}

export async function discardDraft(): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    await db.transaction(async (tx) => {
      const row = await pilotRow(tx as unknown as typeof db);
      await tx
        .update(siteStudio)
        .set({ draft: row.published, updatedAt: new Date(), updatedBy: userId })
        .where(eq(siteStudio.id, row.id));
      await tx
        .update(siteText)
        .set({ draftValue: null, updatedAt: new Date(), updatedBy: userId })
        .where(isNotNull(siteText.draftValue));
    });
    return { ok: true };
  } catch (err) {
    console.error("discardDraft failed", err);
    return { ok: false, error: "Could not discard. Try again." };
  }
}

/** Loads a version into the DRAFT only (going live is still an explicit
 *  Apply). Touches NO cache tags. Registry-unknown snapshot text keys are
 *  dropped; count comes back in `note`. */
export async function restoreVersion(
  id: number
): Promise<{ ok: boolean; error?: string; note?: string }> {
  try {
    const userId = await requireAdmin();
    let dropped = 0;
    let found = false;
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${STUDIO_LOCK})`);
      const [version] = await tx.select().from(studioVersions).where(eq(studioVersions.id, id));
      if (!version) return;
      found = true;
      const snap = version.snapshot as Snapshot;
      const snapConfig = normalize(snap?.config);
      const snapText: Record<string, string> =
        snap?.textOverrides && typeof snap.textOverrides === "object" ? snap.textOverrides : {};

      // Config restored into draft wholesale, through the render-merge rule
      // (validateConfig drops stale ids the registry no longer knows).
      const checked = validateConfig(snapConfig);
      const draftConfig = checked.ok ? checked.config : normalize(undefined);
      const row = await pilotRow(tx as unknown as typeof db);
      await tx
        .update(siteStudio)
        .set({ draft: draftConfig, updatedAt: new Date(), updatedBy: userId })
        .where(eq(siteStudio.id, row.id));

      // Full diff against CURRENT published overrides, staged into drafts.
      const rows = await tx.select({ key: siteText.key, value: siteText.value }).from(siteText);
      const currentKeys = new Set(rows.filter((r) => r.value.trim() !== "").map((r) => r.key));
      const existingKeys = new Set(rows.map((r) => r.key));

      // Currently overridden but absent from the snapshot → stage a reset.
      for (const key of currentKeys) {
        if (!(key in snapText)) {
          await tx
            .update(siteText)
            .set({ draftValue: "", updatedAt: new Date(), updatedBy: userId })
            .where(eq(siteText.key, key));
        }
      }
      // Every snapshot override → carrier-insert or stage the draft value.
      for (const [key, value] of Object.entries(snapText)) {
        if (typeof value !== "string") {
          dropped++;
          continue;
        }
        const entry = textEntry(key);
        if (!entry) {
          dropped++; // registry-unknown snapshot keys dropped
          continue;
        }
        if (existingKeys.has(key)) {
          await tx
            .update(siteText)
            .set({ draftValue: value, updatedAt: new Date(), updatedBy: userId })
            .where(eq(siteText.key, key));
        } else {
          await tx.insert(siteText).values({
            key,
            label: entry.label,
            groupName: entry.group,
            value: "",
            draftValue: value,
            updatedAt: new Date(),
            updatedBy: userId,
          });
        }
      }
    });
    if (!found) return { ok: false, error: "That version no longer exists." };
    return dropped > 0
      ? { ok: true, note: `${dropped} retired text ${dropped === 1 ? "line" : "lines"} from that version no longer exist and ${dropped === 1 ? "was" : "were"} skipped.` }
      : { ok: true };
  } catch (err) {
    console.error("restoreVersion failed", err);
    return { ok: false, error: "Could not restore. Nothing changed. Try again." };
  }
}

export async function listVersions(): Promise<{ id: number; summary: string; createdAt: string }[]> {
  try {
    await requireAdmin();
    const rows = await db
      .select({ id: studioVersions.id, summary: studioVersions.summary, createdAt: studioVersions.createdAt })
      .from(studioVersions)
      .orderBy(desc(studioVersions.id));
    return rows.map((r) => ({ id: r.id, summary: r.summary, createdAt: r.createdAt.toISOString() }));
  } catch (err) {
    console.error("listVersions failed", err);
    return [];
  }
}
