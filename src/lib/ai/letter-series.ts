import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SYSTEM_PROMPT } from "./system-prompt";
import { findVoice } from "./voices";
import { scrubAiPayload } from "./scrub";

const MODEL = "claude-sonnet-4-5";
export const SERIES_PLAN_PROMPT_VERSION = "letter-series-plan.v1";

export const seriesPlanSchema = z.object({
  letters: z
    .array(
      z.object({
        position: z.number().int().min(1),
        title: z.string().min(4).max(160),
        intro: z
          .string()
          .min(60)
          .describe(
            "60-100 word warm pastoral opening. No em-dashes, no hashtags."
          ),
        scriptures: z
          .array(
            z.object({
              ref: z.string().min(3),
              note: z.string().min(10),
            })
          )
          .min(2)
          .max(3),
        guidance: z
          .string()
          .min(150)
          .describe(
            "200-280 word pastoral teaching anchored in one of the scriptures. End with one specific concrete pastoral move."
          ),
        notes: z
          .string()
          .min(40)
          .describe(
            "60-90 word 'Notes from the Watch' closing. Personal, brief, signed warmly."
          ),
      })
    )
    .min(2)
    .max(12),
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

  const userPrompt = `Plan a series of ${input.totalCount} weekly Letters for the Sheepdog Society on a single connected theme.

Series title: ${input.title}
Theme: ${input.theme}

Each letter is one week. The series should have a SHAPE: an opening that frames the theme, middle letters that take it apart from different angles (e.g. for "endurance": physical, vocational, marital, spiritual), and a closing letter that lands the whole thing in a way that sends the brother out steadier than he came in.

For EACH of the ${input.totalCount} letters, return:
- position: 1-indexed within the series
- title: the line a man remembers on Wednesday. Short, concrete, distinct from other titles in the series.
- intro: 60-100 words. Anchor on something a man recognizes in his own week, then pivot to the theme as it lands in THIS letter.
- scriptures: 2 to 3 real scripture references that genuinely fit. Standard book names. Each gets a one-sentence note on why it fits.
- guidance: 200-280 words of pastoral teaching, leaning on one of the scriptures above. Land with a concrete, specific move the brother can do this week.
- notes: 60-90 word "Notes from the Watch" closing. Personal, brief, warm.

Across the whole series: NO em-dashes, NO hashtags, no emoji. Plain prose. Real verses only. No fabricated quotations from any named theologian. Write like a man who has read his Bible his whole life talks at a kitchen table.`;

  const result = await generateObject({
    model: anthropic(MODEL),
    schema: seriesPlanSchema,
    system,
    prompt: userPrompt,
    temperature: 0.7,
    maxRetries: 1,
  });

  const cleaned = scrubAiPayload(result.object);
  return {
    ...cleaned,
    tokensIn: result.usage?.inputTokens ?? undefined,
    tokensOut: result.usage?.outputTokens ?? undefined,
  };
}
