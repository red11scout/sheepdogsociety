"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { aiGenerations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MODELS, BRAND_VOICE, withBrandVoice } from "@/lib/ai/prompts";
import { findBannedLanguage } from "@/lib/ai/banned";
import { SECTION_REGISTRY } from "@/lib/studio/sections";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge, resolveThemeId } from "@/lib/studio/config";
import { validateChangeset, type Changeset } from "@/lib/studio/changeset";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { saveDraftConfig, saveDraftText } from "@/server/studio";
import { THEME_IDS } from "@/lib/studio/themes";

const MODEL = MODELS.default;
const RECOMMEND_PROMPT_VERSION = "studio-recommend.v1";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") throw new Error("Not an admin");
  return userId;
}

// Anthropic structured output rejects array minItems/maxItems and string
// min/maxLength — schema stays bounds-free; the prompt asks for 2-4 items
// and any count is accepted, unbounded, by design (house rule).
const recommendSchema = z.object({
  suggestions: z.array(
    z.object({
      what: z.string(),
      why: z.string(),
    })
  ),
});

export async function recommendForPage(
  pageId: string
): Promise<
  | { ok: true; suggestions: { what: string; why: string; changeset?: Changeset }[] }
  | { ok: false; error: string }
> {
  try {
    const userId = await requireAdmin();
    const registry = SECTION_REGISTRY[pageId];
    if (!registry) return { ok: false, error: "Unknown page." };

    const config = await getStudioConfig();
    const merged = renderMerge(pageId, config);
    const unlockedCount = merged.filter((s) => !s.locked).length;
    const hiddenCount = merged.filter((s) => !s.locked && !s.visible).length;

    const prompt = withBrandVoice(`You are looking at the "${registry.label}" page of a Christian men's brotherhood website. It has ${merged.length} sections total, ${unlockedCount} of which Jeremy (the admin) can show/hide/reorder, and ${hiddenCount} of those are currently hidden.

Suggest 2-4 simple, concrete improvements Jeremy could make to this page's layout or wording. Each suggestion needs a "what" (one short sentence, the action) and a "why" (one short sentence, the reason). Do not suggest anything about locked sections, Scripture, or forms — those never change.`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: recommendSchema,
    });

    const clean = result.object.suggestions.filter(
      (s) => findBannedLanguage(s.why).length === 0 && findBannedLanguage(s.what).length === 0
    );

    await db.insert(aiGenerations).values({
      type: "studio_recommend",
      prompt,
      promptVersion: RECOMMEND_PROMPT_VERSION,
      model: MODEL,
      output: JSON.stringify(result.object),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "studio_page",
      entityId: pageId,
      userId,
    });

    return { ok: true, suggestions: clean };
  } catch (err) {
    console.error("recommendForPage error", err);
    return { ok: false, error: "Could not get recommendations. Try again shortly." };
  }
}

const assistSchema = z.object({
  draft: z.string(),
  why: z.string(),
});

const ASSIST_INSTRUCTIONS: Record<"rewrite" | "tighten" | "warm-up", string> = {
  rewrite: "Rewrite this line in the brand voice. Keep the meaning. Vary the phrasing meaningfully.",
  tighten: "Tighten this line — cut filler, shorten where possible, keep the meaning.",
  "warm-up": "Warm this line up — more inviting, less formal, same meaning and roughly the same length.",
};

const ASSIST_PROMPT_VERSION = "studio-assist.v1";

export async function assistField(
  key: string,
  currentText: string,
  mode: "rewrite" | "tighten" | "warm-up"
): Promise<{ ok: true; draft: string; why: string } | { ok: false; error: string }> {
  try {
    const userId = await requireAdmin();
    const entry = SITE_TEXT_KEYS.find((e) => e.key === key);
    if (!entry) return { ok: false, error: "Unknown text key." };

    const prompt = withBrandVoice(`${ASSIST_INSTRUCTIONS[mode]}

Field: "${entry.label}"
Current text:
"""
${currentText}
"""`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: assistSchema,
    });

    if (findBannedLanguage(result.object.draft).length > 0) {
      return { ok: false, error: "That draft used words outside the brand voice. Try again." };
    }

    await db.insert(aiGenerations).values({
      type: "studio_assist",
      prompt,
      promptVersion: `${ASSIST_PROMPT_VERSION}.${mode}`,
      model: MODEL,
      output: JSON.stringify(result.object),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "site_text",
      entityId: key,
      userId,
    });

    return { ok: true, draft: result.object.draft, why: result.object.why };
  } catch (err) {
    console.error("assistField error", err);
    return { ok: false, error: "Could not get a rewrite. Try again shortly." };
  }
}

// Bounds-free by house rule — counts/lengths enforced in validateChangeset,
// not in this schema.
const changesetSchema = z.object({
  themeId: z.string().optional(),
  sectionChanges: z.array(
    z.object({
      pageId: z.string(),
      sectionId: z.string(),
      visible: z.boolean().optional(),
      position: z.number().optional(),
    })
  ),
  textEdits: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      why: z.string(),
    })
  ),
});

const DESCRIBE_PROMPT_VERSION = "studio-describe.v1";

export async function describeChangeset(
  goal: string
): Promise<
  | { ok: true; applied: number; dropped: { summary: string; reason: string }[] }
  | { ok: false; error: string }
> {
  try {
    const userId = await requireAdmin();
    const config = await getStudioConfig();

    const prompt = withBrandVoice(`Jeremy (the admin of this Christian men's brotherhood website) wants: "${goal}"

Turn this into a changeset: which sections to show/hide/reorder, and/or which text fields to rewrite. Only use section and text-field ids you're confident exist on this site — if you're unsure, leave that part out rather than guessing. Keep textEdits short and in the site's plain, warm, direct voice.`);

    const result = await generateObject({
      model: anthropic(MODEL),
      system: BRAND_VOICE,
      prompt,
      schema: changesetSchema,
    });

    const raw: Changeset = result.object;
    const { accepted, dropped } = validateChangeset(raw, config);

    let themeId: string | undefined;
    if (accepted.themeId !== undefined) {
      const resolved = resolveThemeId({ themeId: accepted.themeId, pages: {} }, THEME_IDS);
      if (accepted.themeId === resolved) {
        themeId = resolved;
      } else {
        dropped.push({
          item: { pageId: "", sectionId: "" },
          reason: `"${accepted.themeId}" is not a real theme — kept the current one.`,
        });
      }
    }

    let applied = 0;
    if (themeId || accepted.sectionChanges.length > 0) {
      const nextPages = { ...config.pages };
      for (const change of accepted.sectionChanges) {
        const existing = nextPages[change.pageId]?.sections ?? [];
        const idx = existing.findIndex((s) => s.id === change.sectionId);
        const nextSections = [...existing];
        if (idx >= 0) {
          nextSections[idx] = { ...nextSections[idx], visible: change.visible ?? nextSections[idx].visible };
        } else {
          nextSections.push({ id: change.sectionId, visible: change.visible ?? true });
        }
        nextPages[change.pageId] = { sections: nextSections };
        applied++;
      }
      const configRes = await saveDraftConfig({
        ...config,
        themeId: themeId ?? config.themeId,
        pages: nextPages,
      });
      if (!configRes.ok) return { ok: false, error: configRes.error ?? "Could not save changes." };
      if (themeId) applied++;
    }

    for (const edit of accepted.textEdits) {
      const textRes = await saveDraftText(edit.key, edit.value);
      if (textRes.ok) applied++;
    }

    await db.insert(aiGenerations).values({
      type: "studio_describe",
      prompt,
      promptVersion: DESCRIBE_PROMPT_VERSION,
      model: MODEL,
      output: JSON.stringify(raw),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      entityType: "studio_changeset",
      entityId: null,
      userId,
    });

    return {
      ok: true,
      applied,
      dropped: dropped.map((d) => ({
        summary: "key" in d.item ? d.item.key : `${d.item.pageId}/${d.item.sectionId}`,
        reason: d.reason,
      })),
    };
  } catch (err) {
    console.error("describeChangeset error", err);
    return { ok: false, error: "Could not process that. Try describing it differently." };
  }
}
