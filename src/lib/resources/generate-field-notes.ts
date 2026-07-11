/**
 * AI-drafted "field notes" for a resource (spec §A-FN). Two modes per
 * selectDraftingInput: "full" (grounded in the resource's own body text)
 * and "framing" (metadata-only — the model has NOT read the resource and
 * must not pretend to). "insufficient" never reaches the generation path
 * below; it's a hard no-draft short-circuit before any Claude call.
 *
 * Single retry budget: if the structural, banned-language, or scripture
 * gate fails, we regenerate once. Second failure -> no draft (fail
 * silent; the row stays at fieldNotesStatus 'none' for a manual retry).
 */
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { scrubAiPayload } from "@/lib/ai/scrub";
import { findBannedLanguage } from "@/lib/ai/banned";
import { parseReference } from "@/lib/bible/books";
import { selectDraftingInput } from "./field-notes-input";

const MODEL = "claude-sonnet-4-5";
export const FIELD_NOTES_PROMPT_VERSION = "resource-field-notes.v1";

// Anthropic structured output rejects array min/maxItems and may reject
// string min/maxLength too (same workaround as categorize.ts, cluster.ts,
// and letter-series.ts). Schema carries zero size constraints; counts and
// lengths are enforced via the prompt + post-response validation below.
const notesSchema = z.object({
  paragraphs: z
    .array(z.string())
    .describe(
      "2 to 3 paragraphs (40-600 characters each) on what this resource says (full mode) or why we recommend it (framing mode)."
    ),
  scriptures: z
    .array(
      z.object({
        reference: z.string().describe('e.g. "John 15:5" — reference ONLY, never verse text'),
        note: z
          .string()
          .describe("One original sentence (10-200 characters) on why this passage matters here"),
      })
    )
    .describe("3 to 5 scripture references."),
  howToUse: z
    .string()
    .describe("60-500 characters on how a man uses this in a weekly study, concretely."),
});

type Notes = z.infer<typeof notesSchema>;

const FRAMING_RULE = `You have ONLY the metadata below — you have NOT read this work.
You MUST NOT claim, imply, or invent anything about its specific contents,
chapters, arguments, or stories. Write why our brotherhood recommends a
resource like this and how to put it to work in a study. Scriptures should
fit the resource's stated topic.`;

const FULL_RULE = `The full text is below. Ground every claim in it.`;

export async function generateFieldNotes(row: {
  provider: string | null;
  bodyText: string | null;
  title: string;
  author: string | null;
  description: string | null;
  summary: string | null;
}): Promise<{ html: string; tokensIn: number; tokensOut: number } | null> {
  const input = selectDraftingInput(row);
  if (input.mode === "insufficient") return null;

  const prompt = `Write field notes for a resource our men use in weekly Bible studies.

${input.mode === "framing" ? FRAMING_RULE : FULL_RULE}

Scripture rule: give references only, never quote verse text. 3 to 5 references.

Resource:
${input.content}`;

  let totalIn = 0;
  let totalOut = 0;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let object: Notes;
    try {
      const result = await generateObject({
        model: anthropic(MODEL),
        system: SYSTEM_PROMPT,
        prompt,
        schema: notesSchema,
        temperature: 0.4,
        maxRetries: 1,
      });
      object = scrubAiPayload(result.object);
      totalIn += result.usage?.inputTokens ?? 0;
      totalOut += result.usage?.outputTokens ?? 0;
    } catch {
      return null;
    }

    // Gate 1: structural shape. The schema can't enforce array/string
    // length bounds (Anthropic structured-output rejects them), so
    // re-check here instead — same pattern as encouragements/draft.
    if (object.paragraphs.length < 2 || object.paragraphs.length > 3) continue;
    if (object.paragraphs.some((p) => p.length < 40 || p.length > 600)) continue;
    if (object.scriptures.length < 3 || object.scriptures.length > 5) continue;
    if (object.scriptures.some((s) => s.note.length < 10 || s.note.length > 200)) continue;
    if (object.howToUse.length < 60 || object.howToUse.length > 500) continue;

    // Gate 2: banned language across all prose.
    const prose = [...object.paragraphs, object.howToUse, ...object.scriptures.map((s) => s.note)].join(" ");
    if (findBannedLanguage(prose).length > 0) continue;

    // Gate 3: every scripture reference must parse against the canon
    // (catches hallucinated books/chapters locally, zero API calls).
    const validScriptures = object.scriptures.filter((s) => parseReference(s.reference) !== null);
    if (validScriptures.length < 2) continue;

    const html = [
      ...object.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
      `<h3>Key scriptures</h3>`,
      `<ul>${validScriptures
        .map((s) => `<li><strong>${escapeHtml(s.reference)}</strong> — ${escapeHtml(s.note)}</li>`)
        .join("")}</ul>`,
      `<h3>Use it in a study</h3>`,
      `<p>${escapeHtml(object.howToUse)}</p>`,
    ].join("\n");

    return { html, tokensIn: totalIn, tokensOut: totalOut };
  }

  return null;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
