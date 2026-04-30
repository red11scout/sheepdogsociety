/**
 * Centralized prompt scaffolding for every Claude call in the app.
 *
 * Single rule: every AI route prepends `withBrandVoice(prompt)` so the
 * banned-words list and the Hemingway voice rule are non-negotiable. The
 * existing `SYSTEM_PROMPT` (src/lib/ai/system-prompt.ts) stays as the seed
 * source so routes that already import it keep working unchanged.
 *
 * Bible verse text is NEVER generated. Use `{{VERSE: ref}}` placeholders.
 */

import { SYSTEM_PROMPT } from "./system-prompt";

/** Public re-export for back-compat with existing imports. */
export { SYSTEM_PROMPT };

/**
 * Hemingway-grade brand-voice rules. Concatenated with SYSTEM_PROMPT to
 * form the canonical `BRAND_VOICE` constant. Editable from /admin/settings
 * in a future phase; for now this constant is the source of truth.
 */
export const BRAND_VOICE_ADDENDUM = `STYLE RULES:
- Short Anglo-Saxon sentences. Strong verbs. Plain nouns.
- Imperative paired with invitation, never command alone.
- One idea per paragraph. Three sentences max in most paragraphs.
- No exclamation points except inside scripture quotes.
- No em-dashes when a comma works.
- No corporate filler. No "we are excited to," "click here," "amazing."
- Specifics beat slogans. "Tuesday morning at the diner on 5th" beats "authentic brotherhood community."
- Tender and tough. Tough on sin, tender with sinners.
- Never preach. Point to Christ.

DO NOT use these words: delve, leverage, navigate, robust, tapestry, journey (as a noun), rise, reclaim, fight back, real men, alpha, based, toxic masculinity.

DO NOT use these clichés: walk with God, do life together, in today's fast-paced world, level up, unpack, the journey of faith.

DO NOT generate Bible verse text. Use placeholders like {{VERSE: Romans 5:3-4}} and the system fetches the actual ESV text. This is a hard rule.

DO NOT use political or culture-war framing.`;

export const BRAND_VOICE = `${SYSTEM_PROMPT}

${BRAND_VOICE_ADDENDUM}`;

/**
 * Wrap any user prompt with the canonical brand voice. Use this in every
 * server-side `streamText({ system, prompt })` call.
 *
 * Usage:
 *   streamText({
 *     model: anthropic("claude-sonnet-4-5"),
 *     system: BRAND_VOICE,           // not raw SYSTEM_PROMPT
 *     prompt: withBrandVoice(userPrompt),
 *   });
 */
export function withBrandVoice(userPrompt: string): string {
  return `${userPrompt}

Reply in the brand voice described in the system prompt. Reply with ONLY the requested output — no preamble, no quoting, no explanation.`;
}

/**
 * Pinned model identifiers. Centralized so a model bump is a one-line change.
 * Brief #2: never switch away from claude-sonnet-4-5 without explicit approval.
 */
export const MODELS = {
  /** Default for most generative work — drafting, rewriting, expansion. */
  default: "claude-sonnet-4-5",
  /** Fast lane for tight rewrites, summaries, headlines. */
  fast: "claude-haiku-4-5",
} as const;
