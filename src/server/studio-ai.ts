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
import { renderMerge } from "@/lib/studio/config";
import type { Changeset } from "@/lib/studio/changeset";

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
