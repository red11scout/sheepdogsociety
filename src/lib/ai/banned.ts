/**
 * Programmatic gate for the brand-voice bans that until now lived only in
 * the system prompt (src/lib/ai/system-prompt.ts:15-16) with nothing
 * checking the output. Used by resources field notes (A-FN) and the
 * Letter autopilot (Phase C). "journey" is banned only as a noun — too
 * ambiguous to machine-check, left to the prompt.
 */
export const BANNED_WORDS = [
  "delve",
  "leverage",
  "navigate",
  "robust",
  "tapestry",
  "rise",
  "reclaim",
  "unpack",
  "based",
  "alpha",
];

export const BANNED_PHRASES = [
  "fight back",
  "real men",
  "toxic masculinity",
  "walk with god",
  "do life together",
  "in today's fast-paced world",
  "level up",
  "the journey of faith",
  "at the end of the day",
  "speak life",
  "season of life",
];

export function findBannedLanguage(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) hits.push(phrase);
  }
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) hits.push(word);
  }
  // Preserve first-appearance order within the text itself.
  const seen = new Set<string>();
  return hits
    .filter((h) => (seen.has(h) ? false : (seen.add(h), true)))
    .sort((a, b) => lower.indexOf(a) - lower.indexOf(b));
}
