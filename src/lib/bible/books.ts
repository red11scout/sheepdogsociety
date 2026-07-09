/**
 * Canonical Bible book data + pure navigation/parsing math for the public
 * ESV reader (Phase 3). ZERO imports — Vitest covers this file fully and
 * hermetically (src/lib/bible/books.test.ts).
 *
 * The 8 genre groups mirror BibleProject's picker taxonomy (Drew's named
 * benchmark, phase2-design-study.md §1.4): Torah, Historical, Wisdom,
 * Major Prophets, Minor Prophets, Gospels, Letters, Apocalypse. Acts rides
 * with the Gospels (Luke-Acts) so the eight groups sum to 66 without a
 * ninth eyebrow, exactly like the benchmark's picker.
 */

export const GENRES = [
  "Torah",
  "Historical",
  "Wisdom",
  "Major Prophets",
  "Minor Prophets",
  "Gospels",
  "Letters",
  "Apocalypse",
] as const;

export type Genre = (typeof GENRES)[number];

export interface BibleBook {
  /** Canonical display name, e.g. "1 Corinthians". */
  name: string;
  /** URL segment, e.g. "1-corinthians". */
  slug: string;
  chapters: number;
  genre: Genre;
  /**
   * Normalized alternate spellings the reference parser accepts (lowercase,
   * no periods, single spaces). Unique-prefix matching on the name covers
   * most abbreviations ("gen", "1 cor", "song"); aliases exist only where
   * a prefix is ambiguous ("phil") or not derivable ("mt", "sos", "1 kgs").
   */
  aliases: string[];
}

export const BOOKS: readonly BibleBook[] = [
  // Torah
  { name: "Genesis", slug: "genesis", chapters: 50, genre: "Torah", aliases: ["gn"] },
  { name: "Exodus", slug: "exodus", chapters: 40, genre: "Torah", aliases: [] },
  { name: "Leviticus", slug: "leviticus", chapters: 27, genre: "Torah", aliases: ["lv"] },
  { name: "Numbers", slug: "numbers", chapters: 36, genre: "Torah", aliases: ["nm", "nb"] },
  { name: "Deuteronomy", slug: "deuteronomy", chapters: 34, genre: "Torah", aliases: ["dt"] },
  // Historical
  { name: "Joshua", slug: "joshua", chapters: 24, genre: "Historical", aliases: [] },
  { name: "Judges", slug: "judges", chapters: 21, genre: "Historical", aliases: ["jdg", "jdgs"] },
  { name: "Ruth", slug: "ruth", chapters: 4, genre: "Historical", aliases: [] },
  { name: "1 Samuel", slug: "1-samuel", chapters: 31, genre: "Historical", aliases: ["1 sm"] },
  { name: "2 Samuel", slug: "2-samuel", chapters: 24, genre: "Historical", aliases: ["2 sm"] },
  { name: "1 Kings", slug: "1-kings", chapters: 22, genre: "Historical", aliases: ["1 kgs"] },
  { name: "2 Kings", slug: "2-kings", chapters: 25, genre: "Historical", aliases: ["2 kgs"] },
  { name: "1 Chronicles", slug: "1-chronicles", chapters: 29, genre: "Historical", aliases: [] },
  { name: "2 Chronicles", slug: "2-chronicles", chapters: 36, genre: "Historical", aliases: [] },
  { name: "Ezra", slug: "ezra", chapters: 10, genre: "Historical", aliases: [] },
  { name: "Nehemiah", slug: "nehemiah", chapters: 13, genre: "Historical", aliases: [] },
  { name: "Esther", slug: "esther", chapters: 10, genre: "Historical", aliases: [] },
  // Wisdom
  { name: "Job", slug: "job", chapters: 42, genre: "Wisdom", aliases: [] },
  { name: "Psalms", slug: "psalms", chapters: 150, genre: "Wisdom", aliases: ["pss"] },
  { name: "Proverbs", slug: "proverbs", chapters: 31, genre: "Wisdom", aliases: ["prv"] },
  { name: "Ecclesiastes", slug: "ecclesiastes", chapters: 12, genre: "Wisdom", aliases: [] },
  {
    name: "Song of Solomon",
    slug: "song-of-solomon",
    chapters: 8,
    genre: "Wisdom",
    aliases: ["sos", "song of songs", "songs"],
  },
  // Major Prophets
  { name: "Isaiah", slug: "isaiah", chapters: 66, genre: "Major Prophets", aliases: [] },
  { name: "Jeremiah", slug: "jeremiah", chapters: 52, genre: "Major Prophets", aliases: [] },
  { name: "Lamentations", slug: "lamentations", chapters: 5, genre: "Major Prophets", aliases: [] },
  { name: "Ezekiel", slug: "ezekiel", chapters: 48, genre: "Major Prophets", aliases: ["ezk"] },
  { name: "Daniel", slug: "daniel", chapters: 12, genre: "Major Prophets", aliases: ["dn"] },
  // Minor Prophets
  { name: "Hosea", slug: "hosea", chapters: 14, genre: "Minor Prophets", aliases: [] },
  { name: "Joel", slug: "joel", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Amos", slug: "amos", chapters: 9, genre: "Minor Prophets", aliases: [] },
  { name: "Obadiah", slug: "obadiah", chapters: 1, genre: "Minor Prophets", aliases: [] },
  { name: "Jonah", slug: "jonah", chapters: 4, genre: "Minor Prophets", aliases: [] },
  { name: "Micah", slug: "micah", chapters: 7, genre: "Minor Prophets", aliases: [] },
  { name: "Nahum", slug: "nahum", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Habakkuk", slug: "habakkuk", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Zephaniah", slug: "zephaniah", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Haggai", slug: "haggai", chapters: 2, genre: "Minor Prophets", aliases: [] },
  { name: "Zechariah", slug: "zechariah", chapters: 14, genre: "Minor Prophets", aliases: [] },
  { name: "Malachi", slug: "malachi", chapters: 4, genre: "Minor Prophets", aliases: [] },
  // Gospels (+ Acts, Luke-Acts — see the module comment)
  { name: "Matthew", slug: "matthew", chapters: 28, genre: "Gospels", aliases: ["mt"] },
  { name: "Mark", slug: "mark", chapters: 16, genre: "Gospels", aliases: ["mk", "mrk"] },
  { name: "Luke", slug: "luke", chapters: 24, genre: "Gospels", aliases: ["lk"] },
  { name: "John", slug: "john", chapters: 21, genre: "Gospels", aliases: ["jn", "jhn"] },
  { name: "Acts", slug: "acts", chapters: 28, genre: "Gospels", aliases: [] },
  // Letters
  { name: "Romans", slug: "romans", chapters: 16, genre: "Letters", aliases: ["rm"] },
  { name: "1 Corinthians", slug: "1-corinthians", chapters: 16, genre: "Letters", aliases: [] },
  { name: "2 Corinthians", slug: "2-corinthians", chapters: 13, genre: "Letters", aliases: [] },
  { name: "Galatians", slug: "galatians", chapters: 6, genre: "Letters", aliases: [] },
  { name: "Ephesians", slug: "ephesians", chapters: 6, genre: "Letters", aliases: [] },
  { name: "Philippians", slug: "philippians", chapters: 4, genre: "Letters", aliases: ["phil", "php"] },
  { name: "Colossians", slug: "colossians", chapters: 4, genre: "Letters", aliases: [] },
  { name: "1 Thessalonians", slug: "1-thessalonians", chapters: 5, genre: "Letters", aliases: [] },
  { name: "2 Thessalonians", slug: "2-thessalonians", chapters: 3, genre: "Letters", aliases: [] },
  { name: "1 Timothy", slug: "1-timothy", chapters: 6, genre: "Letters", aliases: [] },
  { name: "2 Timothy", slug: "2-timothy", chapters: 4, genre: "Letters", aliases: [] },
  { name: "Titus", slug: "titus", chapters: 3, genre: "Letters", aliases: [] },
  { name: "Philemon", slug: "philemon", chapters: 1, genre: "Letters", aliases: ["phlm", "phm"] },
  { name: "Hebrews", slug: "hebrews", chapters: 13, genre: "Letters", aliases: [] },
  { name: "James", slug: "james", chapters: 5, genre: "Letters", aliases: ["jas"] },
  { name: "1 Peter", slug: "1-peter", chapters: 5, genre: "Letters", aliases: ["1 pt"] },
  { name: "2 Peter", slug: "2-peter", chapters: 3, genre: "Letters", aliases: ["2 pt"] },
  { name: "1 John", slug: "1-john", chapters: 5, genre: "Letters", aliases: ["1 jn"] },
  { name: "2 John", slug: "2-john", chapters: 1, genre: "Letters", aliases: ["2 jn"] },
  { name: "3 John", slug: "3-john", chapters: 1, genre: "Letters", aliases: ["3 jn"] },
  { name: "Jude", slug: "jude", chapters: 1, genre: "Letters", aliases: [] },
  // Apocalypse
  { name: "Revelation", slug: "revelation", chapters: 22, genre: "Apocalypse", aliases: ["rv", "apocalypse"] },
];

const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));

export function getBookBySlug(slug: string): BibleBook | undefined {
  return BY_SLUG.get(slug);
}

/** The 8 genre groups in canon order, each with its books in canon order. */
export function booksByGenre(): { genre: Genre; books: BibleBook[] }[] {
  return GENRES.map((genre) => ({
    genre,
    books: BOOKS.filter((b) => b.genre === genre),
  }));
}

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

/** The chapter before {slug, chapter}, crossing book boundaries. Null at Genesis 1. */
export function prevChapter(slug: string, chapter: number): ChapterRef | null {
  const idx = BOOKS.findIndex((b) => b.slug === slug);
  if (idx === -1) return null;
  if (chapter > 1) return { book: BOOKS[idx], chapter: chapter - 1 };
  if (idx === 0) return null;
  const prev = BOOKS[idx - 1];
  return { book: prev, chapter: prev.chapters };
}

/** The chapter after {slug, chapter}, crossing book boundaries. Null at Revelation 22. */
export function nextChapter(slug: string, chapter: number): ChapterRef | null {
  const idx = BOOKS.findIndex((b) => b.slug === slug);
  if (idx === -1) return null;
  if (chapter < BOOKS[idx].chapters) return { book: BOOKS[idx], chapter: chapter + 1 };
  if (idx === BOOKS.length - 1) return null;
  return { book: BOOKS[idx + 1], chapter: 1 };
}

/* ------------------------------------------------------------------ */
/* Forgiving reference parser — the type-ahead IS the reference search  */
/* ------------------------------------------------------------------ */

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
  /** Present when the input carried a verse ("john 3:16"). Not range-checked. */
  verse?: number;
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,;'']/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// [123]? book-number, lazy letters, optional chapter, optional ":"- or
// space-separated verse, tolerated trailing junk ("john 3:16-17" arrives
// here as "john 3:16 17" after normalize).
const REF_RE = /^([123])?\s*([a-z][a-z ]*?)\s*(?:(\d+)(?:\s*:?\s*(\d+))?(?:\s.*)?)?$/;

function findBook(numPart: string | undefined, letters: string): BibleBook | null {
  const candidate = (numPart ? `${numPart} ` : "") + letters;
  const exact = BOOKS.find((b) => b.name.toLowerCase() === candidate);
  if (exact) return exact;
  const alias = BOOKS.find((b) => b.aliases.includes(candidate));
  if (alias) return alias;
  const prefixed = BOOKS.filter((b) => b.name.toLowerCase().startsWith(candidate));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/**
 * Forgiving reference parser: "john 3", "John 3:16", "1 cor 13", "1cor13",
 * "ps23", "Ps. 23", bare "gen" (chapter defaults to 1). Null on unknown or
 * ambiguous books and out-of-range chapters.
 */
export function parseReference(input: string): ParsedReference | null {
  const m = REF_RE.exec(normalize(input));
  if (!m) return null;
  const book = findBook(m[1], m[2]);
  if (!book) return null;
  const chapter = m[3] ? Number(m[3]) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;
  const verse = m[4] ? Number(m[4]) : undefined;
  return verse === undefined ? { book, chapter } : { book, chapter, verse };
}

/** "John 3:16" -> "/bible/john/3#v16"; null when unparseable. */
export function referenceToUrl(reference: string): string | null {
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const anchor = parsed.verse ? `#v${parsed.verse}` : "";
  return `/bible/${parsed.book.slug}/${parsed.chapter}${anchor}`;
}

/* ------------------------------------------------------------------ */
/* ESV plain-text chapter parser                                        */
/* ------------------------------------------------------------------ */

export interface VerseSegment {
  /** null = untagged lead text (e.g. a psalm superscription). */
  verse: number | null;
  text: string;
}

export interface ScriptureParagraph {
  segments: VerseSegment[];
}

/**
 * Converts the ESV API's plain-text chapter (inline [N] verse markers,
 * blank-line paragraph breaks, indented poetry lines) into structured
 * paragraphs of verse segments for the superscript treatment.
 *
 * Documented simplification: line breaks WITHIN a paragraph collapse to
 * spaces, so poetry flows as prose per stanza (stanza breaks arrive as
 * blank lines and stay paragraphs). Pinned by books.test.ts.
 */
export function parseESVChapterText(raw: string): ScriptureParagraph[] {
  return raw
    .replace(/\s*\(ESV\)\s*$/, "") // defensive: reader params disable it
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const parts = block.split(/\[(\d+)\]\s*/);
      const segments: VerseSegment[] = [];
      const lead = parts[0].trim();
      if (lead) segments.push({ verse: null, text: lead });
      for (let i = 1; i < parts.length; i += 2) {
        const text = (parts[i + 1] ?? "").trim();
        if (text) segments.push({ verse: Number(parts[i]), text });
      }
      return { segments };
    })
    .filter((p) => p.segments.length > 0);
}
