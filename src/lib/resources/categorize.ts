import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { scrubAiText } from "@/lib/ai/scrub";

const MODEL = "claude-haiku-4-5-20251001";
export const CATEGORIZE_PROMPT_VERSION = "resource-categorize.v1";

export const categorizeSchema = z.object({
  summary: z
    .string()
    .min(40)
    .max(400)
    .describe(
      "One short paragraph (40-80 words) summarizing what this resource teaches and who it's for. Plain English. No marketing voice."
    ),
  topics: z
    .array(z.string().min(2).max(40))
    .min(1)
    .max(8)
    .describe(
      'Concrete topical tags a man would search for. e.g. "endurance", "fatherhood", "anxiety", "money", "leadership". Lowercase. No duplicates.'
    ),
  themes: z
    .array(z.string().min(2).max(40))
    .min(0)
    .max(6)
    .describe(
      'Broader theological themes. e.g. "sanctification", "covenant", "kingdom of God", "the cross". Lowercase.'
    ),
  booksOfBible: z
    .array(z.string().min(2).max(30))
    .min(0)
    .max(20)
    .describe(
      'Books of the Bible the resource works through, in standard English form. e.g. "Romans", "1 Peter", "Genesis". Empty if not text-anchored.'
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

  // Normalize: lowercase tags, trim, dedupe.
  const norm = (xs: string[]) =>
    Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean).map((x) => x.toLowerCase())));
  const bookTitleCase = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .map((w) => (/^\d+$/.test(w) ? w : w[0]?.toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ");

  return {
    summary: scrubAiText(result.object.summary),
    topics: norm(result.object.topics),
    themes: norm(result.object.themes),
    booksOfBible: Array.from(
      new Set(result.object.booksOfBible.map((b) => bookTitleCase(b)).filter(Boolean))
    ),
    audience: result.object.audience,
    tokensIn: result.usage?.inputTokens ?? undefined,
    tokensOut: result.usage?.outputTokens ?? undefined,
  };
}
