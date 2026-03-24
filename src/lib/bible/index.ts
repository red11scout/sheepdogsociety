import { getESVPassage, searchESV } from "./esv";
import { getApiBiblePassage, API_BIBLE_TRANSLATIONS } from "./api-bible";

// Free Bible API fallback (no key required) — supports KJV, ASV, WEB
async function getFreeBiblePassage(
  reference: string,
  translation: string = "kjv"
): Promise<{ text: string; reference: string; copyright: string }> {
  const versionMap: Record<string, string> = {
    KJV: "kjv",
    ASV: "asv",
    WEB: "web",
    BBE: "bbe",
  };
  const ver = versionMap[translation] ?? "kjv";
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(reference)}?translation=${ver}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`bible-api.com error: ${res.status}`);
  const data = await res.json();
  const text =
    data.verses
      ?.map((v: { verse: number; text: string }) => `[${v.verse}] ${v.text.trim()}`)
      .join("\n") ?? data.text ?? "";
  return {
    text,
    reference: data.reference ?? reference,
    copyright: "Public Domain",
  };
}

// All available translations
export const AVAILABLE_TRANSLATIONS = [
  { abbr: "KJV", name: "King James Version", popular: true },
  { abbr: "ESV", name: "English Standard Version", popular: true },
  ...API_BIBLE_TRANSLATIONS.filter((t) => t.abbr !== "KJV").map((t) => ({
    abbr: t.abbr,
    name: t.name,
    popular: t.popular ?? false,
  })),
  { abbr: "ASV", name: "American Standard Version", popular: false },
  { abbr: "WEB", name: "World English Bible", popular: false },
];

// Free translations that work without API keys
const FREE_TRANSLATIONS = ["KJV", "ASV", "WEB", "BBE"];

export async function getPassage(
  reference: string,
  translation: string = "KJV"
): Promise<{
  text: string;
  reference: string;
  translation: string;
  copyright: string;
}> {
  // Try free API first for supported translations (always works)
  if (FREE_TRANSLATIONS.includes(translation)) {
    try {
      const result = await getFreeBiblePassage(reference, translation);
      return { ...result, translation };
    } catch {
      // Fall through to other APIs
    }
  }

  // Try ESV API if key is configured
  if (translation === "ESV" && process.env.ESV_API_KEY?.trim()) {
    try {
      const result = await getESVPassage(reference);
      return { ...result, translation: "ESV" };
    } catch {
      // Fall through to free fallback
    }
  }

  // Try API.Bible if key is configured
  if (process.env.API_BIBLE_KEY?.trim()) {
    try {
      const result = await getApiBiblePassage(reference, translation);
      return { ...result, translation };
    } catch {
      // Fall through to free fallback
    }
  }

  // Ultimate fallback: KJV from free API
  const result = await getFreeBiblePassage(reference, "KJV");
  return { ...result, translation: "KJV" };
}

export async function searchBible(
  query: string,
  translation: string = "ESV"
): Promise<{ results: { reference: string; content: string }[] }> {
  if (translation === "ESV" && process.env.ESV_API_KEY?.trim()) {
    try {
      return await searchESV(query);
    } catch {
      return { results: [] };
    }
  }
  return { results: [] };
}

// Bible book data for navigation
export const BIBLE_BOOKS = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];
