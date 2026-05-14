import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SYSTEM_PROMPT } from "./system-prompt";
import { findVoice } from "./voices";
import { scrubAiPayload } from "./scrub";

const MODEL = "claude-sonnet-4-5";
export const SERIES_PLAN_PROMPT_VERSION = "letter-series-plan.v1";

/**
 * Schema for a multi-letter series plan.
 *
 * Anthropic structured output rejects:
 *   - array minItems > 1 ("got: [2, 5]")
 *   - array maxItems entirely ("property 'maxItems' is not supported")
 *
 * To stay bulletproof against further API tightening, this schema
 * carries ZERO size/length constraints. Counts and lengths are enforced
 * in the prompt and re-checked in code post-response. If the model
 * misses, the admin gets a clear "try again" instead of a 502.
 */
export const seriesPlanSchema = z.object({
  letters: z.array(
    z.object({
      position: z.number().int(),
      title: z.string(),
      intro: z
        .string()
        .describe(
          "60-100 word warm pastoral opening. No em-dashes, no hashtags."
        ),
      scriptures: z.array(
        z.object({
          ref: z.string(),
          note: z.string(),
        })
      ),
      guidance: z
        .string()
        .describe(
          "200-280 word pastoral teaching anchored in one of the scriptures. End with one specific concrete pastoral move."
        ),
      notes: z
        .string()
        .describe(
          "60-90 word 'Notes from the Watch' closing. Personal, brief, signed warmly."
        ),
    })
  ),
});

export type SeriesPlan = z.infer<typeof seriesPlanSchema>;

export async function generateLetterSeries(input: {
  title: string;
  theme: string;
  voiceId: string;
  voiceFreeform?: string;
  totalCount: number;
}): Promise<SeriesPlan & { tokensIn?: number; tokensOut?: number }> {
  const voice = findVoice(input.voiceId);
  const voiceAddendum =
    voice?.systemAddendum ??
    (input.voiceFreeform
      ? `Write in the voice the admin describes here: "${input.voiceFreeform}". Honor every brand-voice and scripture rule above.`
      : "");

  const system = `${SYSTEM_PROMPT}\n\n${voiceAddendum}`.trim();

  const userPrompt = `Plan a series of EXACTLY ${input.totalCount} weekly Letters for the Sheepdog Society on a single connected theme.

Series title: ${input.title}
Theme: ${input.theme}

Each letter is one week. The series should have a SHAPE: an opening that frames the theme, middle letters that take it apart from different angles (e.g. for "endurance": physical, vocational, marital, spiritual), and a closing letter that lands the whole thing in a way that sends the brother out steadier than he came in.

You MUST return exactly ${input.totalCount} letter objects in the "letters" array — no more, no fewer.

For EACH of the ${input.totalCount} letters, return:
- position: 1-indexed within the series (1 through ${input.totalCount}, every position present, no duplicates)
- title: the line a man remembers on Wednesday. Short, concrete, distinct from other titles in the series.
- intro: 60-100 words. Anchor on something a man recognizes in his own week, then pivot to the theme as it lands in THIS letter.
- scriptures: EXACTLY 2 or 3 real scripture references that genuinely fit. Standard book names. Each gets a one-sentence note (10+ words) on why it fits. Never fewer than 2, never more than 3.
- guidance: 200-280 words of pastoral teaching, leaning on one of the scriptures above. Land with a concrete, specific move the brother can do this week.
- notes: 60-90 word "Notes from the Watch" closing. Personal, brief, warm.

Across the whole series: NO em-dashes, NO hashtags, no emoji. Plain prose. Real verses only. No fabricated quotations from any named theologian. Write like a man who has read his Bible his whole life talks at a kitchen table.`;

  // Two-attempt loop. The model occasionally drops a letter or returns
  // a single scriptures entry on the first pass; one silent retry hides
  // that from the admin. If both attempts fail validation, surface the
  // last error verbatim so the admin can see what went wrong and try
  // a different theme/voice if needed.
  let lastError = "";
  let totalIn = 0;
  let totalOut = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema: seriesPlanSchema,
      system,
      prompt: userPrompt,
      temperature: attempt === 1 ? 0.7 : 0.5, // tighter on retry
      maxRetries: 1,
    });
    totalIn += result.usage?.inputTokens ?? 0;
    totalOut += result.usage?.outputTokens ?? 0;

    const validation = validateSeriesPlan(result.object, input.totalCount);
    if (validation.ok) {
      const cleaned = scrubAiPayload(result.object);
      return {
        ...cleaned,
        tokensIn: totalIn || undefined,
        tokensOut: totalOut || undefined,
      };
    }
    lastError = validation.error;
    console.warn(`series-plan attempt ${attempt} failed validation: ${lastError}`);
  }

  throw new Error(lastError);
}

function validateSeriesPlan(
  obj: SeriesPlan,
  expectedCount: number
): { ok: true } | { ok: false; error: string } {
  const got = obj.letters.length;
  if (got !== expectedCount) {
    return {
      ok: false,
      error: `Model returned ${got} letters but you asked for ${expectedCount}. Try again — pick a smaller count or a tighter theme if it keeps drifting.`,
    };
  }
  for (const letter of obj.letters) {
    if (letter.scriptures.length < 2 || letter.scriptures.length > 3) {
      return {
        ok: false,
        error: `Letter ${letter.position} ("${letter.title}") came back with ${letter.scriptures.length} scriptures. Each letter needs 2 to 3. Try again.`,
      };
    }
    if (letter.intro.length < 40 || letter.guidance.length < 100 || letter.notes.length < 30) {
      return {
        ok: false,
        error: `Letter ${letter.position} ("${letter.title}") came back too short. Try again.`,
      };
    }
  }
  return { ok: true };
}
