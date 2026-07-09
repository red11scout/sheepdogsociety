import { getESVChapterText } from "./esv";
import {
  getBookBySlug,
  parseESVChapterText,
  type BibleBook,
  type ScriptureParagraph,
} from "./books";

export interface ChapterResult {
  book: BibleBook;
  chapter: number;
  translation: "ESV" | "WEB";
  /** true when ESV failed and the public-domain WEB text was served —
   *  the page shows a visible notice (spec §4 licensing/resilience). */
  fallback: boolean;
  paragraphs: ScriptureParagraph[];
}

/** WEB fallback via bible-api.com (public domain, no key, 24h cache). */
async function getWEBChapter(
  book: BibleBook,
  chapter: number
): Promise<ScriptureParagraph[]> {
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(`${book.name} ${chapter}`)}?translation=web`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`bible-api.com error: ${res.status}`);
  const data = (await res.json()) as {
    verses?: { verse: number; text: string }[];
  };
  const segments = (data.verses ?? [])
    .map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() }))
    .filter((s) => s.text.length > 0);
  if (segments.length === 0) throw new Error("bible-api.com returned no verses");
  // bible-api.com carries no paragraph structure — one paragraph per chapter.
  return [{ segments }];
}

/**
 * One chapter for the public reader. Returns null for an unknown book slug
 * or an out-of-range chapter (routes turn that into notFound()). Falls back
 * to WEB with fallback:true when ESV fails for any reason (missing key,
 * non-200, empty passage). Throws only when BOTH providers fail — pages
 * catch that and render a calm unavailable state.
 */
export async function getESVChapter(
  bookSlug: string,
  chapter: number
): Promise<ChapterResult | null> {
  const book = getBookBySlug(bookSlug);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null;
  }

  try {
    const text = await getESVChapterText(`${book.name} ${chapter}`);
    return {
      book,
      chapter,
      translation: "ESV",
      fallback: false,
      paragraphs: parseESVChapterText(text),
    };
  } catch {
    const paragraphs = await getWEBChapter(book, chapter);
    return { book, chapter, translation: "WEB", fallback: true, paragraphs };
  }
}
