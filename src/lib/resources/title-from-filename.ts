/**
 * Derive a clean, uniform study title from an uploaded document's filename.
 *
 * The library grew by dropping ~100 .docx files into the bulk uploader, and
 * their names were inconsistent: stray extensions, mixed dash styles, trailing
 * spaces, ALL-CAPS words, and a few redundant "Men's Bible Study" prefixes.
 * This normalizes every filename to one pattern so the public /resources list
 * reads as a tidy, uniform set — and so the same rule can shape future uploads
 * (see the bulk-upload route). Conservative on purpose: it fixes formatting,
 * never rewrites the actual words.
 *
 * The pattern: `Main Title` or `Main Title – Subtitle`, Title Case, no
 * extension, single spaces, en-dash (" – ") subtitle separator.
 */

// Words kept lowercase in Title Case unless first or last.
const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "onto", "or", "over", "per", "the", "to", "vs", "vs.",
  "via", "with", "without",
]);

/**
 * Case a single word without destroying deliberate casing:
 *  - ALL-CAPS (2+ letters) → Title case ("GOD" → "God")
 *  - all-lowercase → capitalize first letter ("amendment" → "Amendment")
 *  - already mixed case → leave alone ("God's", "Work-Life", "2nd", "iPhone")
 */
function caseWord(word: string, isEdge: boolean): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  if (!isEdge && SMALL_WORDS.has(lower)) return lower;

  const letters = word.replace(/[^A-Za-z]/g, "");
  const isAllCaps = letters.length >= 2 && letters === letters.toUpperCase();
  const isAllLower = letters.length > 0 && letters === letters.toLowerCase();

  if (isAllCaps) {
    // Lowercase the whole word, then capitalize the first char if it's a
    // letter ("FROM" → "From", "GOD'S" → "God's").
    const lowered = word.toLowerCase();
    return /^[a-z]/.test(lowered)
      ? lowered.charAt(0).toUpperCase() + lowered.slice(1)
      : lowered;
  }
  if (isAllLower) {
    // Capitalize the first char ONLY when the word starts with a letter, so
    // ordinals and numbers survive ("2nd" stays "2nd", "amendment" → "Amendment").
    return /^[a-z]/.test(word)
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word;
  }
  return word; // mixed case — leave as authored
}

function titleCase(input: string): string {
  const words = input.split(" ").filter(Boolean);
  return words
    .map((w, i) => caseWord(w, i === 0 || i === words.length - 1))
    .join(" ");
}

export function tidyTitleFromFilename(filename: string): string {
  let s = filename;

  // 1. Drop any path and the document extension.
  s = s.replace(/^.*[/\\]/, "").replace(/\.(docx?|pdf)$/i, "");

  // 2. Underscores act as spaces.
  s = s.replace(/_+/g, " ");

  // 3. Strip a redundant leading "Men's Bible Study" label (a few files carry
  //    it; the section already says "Bible Studies"). Curly or straight
  //    apostrophe, optional "Introduction for/to" lead, any separator after.
  s = s.replace(
    /^\s*(?:introduction\s+(?:for|to)\s+)?men[’']?s\s+bible\s+study\s*[-–—:]?\s*/i,
    ""
  );

  // 4. Normalize dash separators (subtitle dividers) to a single en dash with
  //    single spaces. A dash counts as a separator when it has a space on at
  //    least ONE side ("A – B", "A- B", "A -B"). A dash with NO space on
  //    either side is a real hyphen ("Work-Life", "Red-Pilled", "4-week") and
  //    is left untouched.
  s = s.replace(/\s+[-–—]+\s*|[-–—]+\s+/g, " – ");

  // 5. Collapse whitespace and trim (kills the trailing-space-before-.docx
  //    class of filename).
  s = s.replace(/\s+/g, " ").trim();

  // 6. Uniform Title Case (preserves proper nouns, acronyms, hyphenated and
  //    mixed-case words; lowercases small connector words mid-title).
  s = titleCase(s);

  return s;
}
