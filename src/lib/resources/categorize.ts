import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { scrubAiText } from "@/lib/ai/scrub";

const MODEL = "claude-haiku-4-5-20251001";
export const CATEGORIZE_PROMPT_VERSION = "resource-categorize.v1";

// Anthropic structured output rejects array min/maxItems and may reject
// string min/maxLength too. Schema carries zero size constraints —
// counts and lengths are enforced via the SYSTEM prompt + bounded
// truncation in the result mapping.
export const categorizeSchema = z.object({
  summary: z
    .string()
    .describe(
      "One short paragraph (40-80 words) summarizing what this resource teaches and who it's for. Plain English. No marketing voice."
    ),
  topics: z
    .array(z.string())
    .describe(
      'Concrete topical tags a man would search for. 1 to 8 tags. e.g. "endurance", "fatherhood", "anxiety", "money", "leadership". Lowercase. No duplicates.'
    ),
  themes: z
    .array(z.string())
    .describe(
      'Broader theological themes. 0 to 6 tags. e.g. "sanctification", "covenant", "kingdom of God", "the cross". Lowercase.'
    ),
  booksOfBible: z
    .array(z.string())
    .describe(
      'Books of the Bible the resource works through, in standard English form. 0 to 20 entries. e.g. "Romans", "1 Peter", "Genesis". Empty if not text-anchored.'
    ),
  audience: z
    .enum(["newcomer", "all", "leader"])
    .describe(
      "newcomer = a man who is new to faith or new to the brotherhood; leader = aimed at men leading other men; all = either."
    ),
});

export type CategorizeResult = z.infer<typeof categorizeSchema>;

const SYSTEM = `You categorize Bible studies, leader guides, and discipleship resources for a Christian men's ministry.

Rules:
- Be concrete. "endurance under pressure at work" beats "trials".
- Use real Bible book names only. Do not invent passages.
- topics + themes are short tags, not sentences.
- Plain English. No Christianese.
- If the document is mostly empty or scaffolding, return reasonable best-effort tags from the title.`;

/**
 * One Claude call per resource. Pass title + plaintext body (truncated).
 * Used at upload time and on-demand re-categorize.
 */
export async function categorizeResource(input: {
  title: string;
  bodyText: string;
  sectionName?: string;
}): Promise<CategorizeResult & { tokensIn?: number; tokensOut?: number }> {
  // Truncate body — Word docs can be huge. 12k chars is plenty of context for tagging.
  const body = input.bodyText.slice(0, 12000);

  const userPrompt = `Title: ${input.title}
${input.sectionName ? `Section: ${input.sectionName}\n` : ""}
Body (excerpt):
"""
${body || "(no body content extracted)"}
"""

Categorize this resource per the schema.`;

  const result = await generateObject({
    model: anthropic(MODEL),
    schema: categorizeSchema,
    system: SYSTEM,
    prompt: userPrompt,
    temperature: 0.3,
    maxRetries: 1,
  });

  // Normalize: lowercase tags, trim, dedupe, cap length. The schema
  // can no longer enforce these bounds (Anthropic structured-output
  // rejects array min/maxItems), so we enforce them here.
  const norm = (xs: string[], maxLen: number, maxCount: number) =>
    Array.from(
      new Set(
        xs
          .map((x) => x.trim())
          .filter((x) => x.length > 0 && x.length <= maxLen)
          .map((x) => x.toLowerCase())
      )
    ).slice(0, maxCount);
  const bookTitleCase = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .map((w) => (/^\d+$/.test(w) ? w : w[0]?.toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ");

  const summary = scrubAiText(result.object.summary).slice(0, 400);

  return {
    summary,
    topics: norm(result.object.topics ?? [], 40, 8),
    themes: norm(result.object.themes ?? [], 40, 6),
    booksOfBible: Array.from(
      new Set(
        (result.object.booksOfBible ?? [])
          .map((b) => bookTitleCase(b))
          .filter((b) => b.length > 0 && b.length <= 30)
      )
    ).slice(0, 20),
    audience: result.object.audience,
    tokensIn: result.usage?.inputTokens ?? undefined,
    tokensOut: result.usage?.outputTokens ?? undefined,
  };
}
