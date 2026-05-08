/**
 * Belt-and-braces scrubbing for AI output. The system prompt forbids these
 * patterns, but the model still slips them in occasionally, so every AI
 * response (text bodies, summaries, scripture notes) runs through this
 * before being saved or rendered.
 *
 * Two hard rules from the brand voice:
 *   1. No em-dashes (— U+2014) or en-dashes (– U+2013) used as clause
 *      separators. Replace with comma + space, or split into sentences.
 *   2. No hashtags (#word). This is a Christian men's letter, not Twitter.
 *
 * The scrubber is intentionally conservative: it only touches characters
 * the user has explicitly banned, and tries to preserve sentence shape.
 */

export function scrubAiText(input: string): string {
  if (!input) return input;
  let out = input;

  // 1. Em-dashes and en-dashes in body text.
  //
  // Common patterns the model produces:
  //   "stand and watch — that's what brothers do"
  //   " — men who know the Word — "
  //   "a hard truth—nobody likes it"
  //
  // Replace ` — ` or `—` (with surrounding spaces collapsed) with `, `
  // when it's between words, or with a period when it looks like a clause
  // join that's already a complete sentence. The simple, safe move: turn
  // every variant into a comma-space and let the editor catch the rare
  // case that needed a period.
  out = out.replace(/\s*[—–]\s*/g, ", ");

  // 2. Double hyphens used as a stand-in for em-dashes.
  out = out.replace(/\s*--\s*/g, ", ");

  // 3. Hashtags. Strip them whole (the `#` plus the word that follows).
  // Preserve the word? Most of the time the model uses them as social-media
  // tags at the END of a paragraph, so we drop them entirely.
  out = out.replace(/(^|\s)#([A-Za-z0-9_]+)/g, "$1");

  // Tidy: collapse the comma-comma artifacts that happen when an em-dash
  // sat next to other punctuation.
  out = out.replace(/, ,/g, ",");
  out = out.replace(/,\s*\./g, ".");
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/\s{2,}/g, " ");

  return out.trim();
}

/**
 * Recursive scrub for objects whose string fields are AI output. Used by
 * the encouragement draft route to clean intro/guidance/notes/scripture
 * notes before persisting.
 */
export function scrubAiPayload<T>(value: T): T {
  if (typeof value === "string") {
    return scrubAiText(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => scrubAiPayload(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubAiPayload(v);
    }
    return out as T;
  }
  return value;
}
