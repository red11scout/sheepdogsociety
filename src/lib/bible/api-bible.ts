const API_BIBLE_BASE = "https://rest.api.bible/v1";

// All verified English Bible translations from API.Bible
// IDs confirmed via GET /v1/bibles?language=eng on 2026-02-14
export const API_BIBLE_TRANSLATIONS: {
  id: string;
  abbr: string;
  name: string;
  popular?: boolean;
}[] = [
  { id: "78a9f6124f344018-01", abbr: "NIV", name: "New International Version", popular: true },
  { id: "63097d2a0a2f7db3-01", abbr: "NKJV", name: "New King James Version", popular: true },
  { id: "de4e12af7f28f599-01", abbr: "KJV", name: "King James Version", popular: true },
  { id: "a761ca71e0b3ddcf-01", abbr: "NASB", name: "New American Standard Bible 2020", popular: true },
  { id: "d6e14a625393b4da-01", abbr: "NLT", name: "New Living Translation", popular: true },
  { id: "6f11a7de016f942e-01", abbr: "MSG", name: "The Message", popular: true },
  { id: "bba9f40183526463-01", abbr: "BSB", name: "Berean Standard Bible" },
  { id: "06125adad2d5898a-01", abbr: "ASV", name: "American Standard Version" },
  { id: "9879dbb7cfe39e4d-04", abbr: "WEB", name: "World English Bible" },
  { id: "01b29f4b342acc35-01", abbr: "LSV", name: "Literal Standard Version" },
  { id: "65eec8e0b60e656b-01", abbr: "FBV", name: "Free Bible Version" },
  { id: "b8ee27bcd1cae43a-01", abbr: "NASB95", name: "New American Standard Bible 1995" },
  { id: "5b888a42e2d9a89d-01", abbr: "NIrV", name: "New International Reader's Version" },
  { id: "179568874c45066f-01", abbr: "DRA", name: "Douay-Rheims American 1899" },
  { id: "c315fa9f71d4af3a-01", abbr: "GNV", name: "Geneva Bible" },
  { id: "55212e3cf5d04d49-01", abbr: "KJVCPB", name: "Cambridge Paragraph Bible KJV" },
  { id: "685d1470fe4d5c3b-01", abbr: "ASVBT", name: "ASV Byzantine Text with Apocrypha" },
  { id: "40072c4a5aba4022-01", abbr: "RV", name: "Revised Version 1885" },
];

// Build lookup map for quick ID resolution
const BIBLE_ID_MAP: Record<string, string> = {};
for (const t of API_BIBLE_TRANSLATIONS) {
  BIBLE_ID_MAP[t.abbr] = t.id;
}

type ApiBiblePassage = {
  data: {
    id: string;
    reference: string;
    content: string;
    copyright: string;
  };
};

export async function getApiBiblePassage(
  reference: string,
  version: string
): Promise<{
  text: string;
  reference: string;
  copyright: string;
}> {
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    throw new Error("API_BIBLE_KEY not configured");
  }

  const bibleId = BIBLE_ID_MAP[version];
  if (!bibleId) {
    throw new Error(`Unknown Bible version: ${version}. Available: ${Object.keys(BIBLE_ID_MAP).join(", ")}`);
  }

  // Convert reference to API.Bible format (e.g., "GEN.1" for Genesis 1)
  const passageId = formatPassageId(reference);

  const res = await fetch(
    `${API_BIBLE_BASE}/bibles/${bibleId}/passages/${passageId}?content-type=text&include-verse-numbers=true`,
    {
      headers: {
        "api-key": apiKey,
      },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(`API.Bible error ${res.status} for ${version} (${bibleId}):`, errorBody);
    throw new Error(`API.Bible error: ${res.status} — ${version} translation may be unavailable`);
  }

  const data: ApiBiblePassage = await res.json();

  return {
    text: stripHtml(data.data.content),
    reference: data.data.reference,
    copyright: data.data.copyright,
  };
}

// Convert "Genesis 1" -> "GEN.1", "John 3:16" -> "JHN.3.16"
function formatPassageId(reference: string): string {
  const bookMap: Record<string, string> = {
    genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM",
    deuteronomy: "DEU", joshua: "JOS", judges: "JDG", ruth: "RUT",
    "1 samuel": "1SA", "2 samuel": "2SA", "1 kings": "1KI", "2 kings": "2KI",
    "1 chronicles": "1CH", "2 chronicles": "2CH", ezra: "EZR",
    nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA", psalm: "PSA",
    proverbs: "PRO", ecclesiastes: "ECC", "song of solomon": "SNG",
    isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK",
    daniel: "DAN", hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA",
    jonah: "JON", micah: "MIC", nahum: "NAM", habakkuk: "HAB",
    zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL",
    matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN",
    acts: "ACT", romans: "ROM", "1 corinthians": "1CO", "2 corinthians": "2CO",
    galatians: "GAL", ephesians: "EPH", philippians: "PHP", colossians: "COL",
    "1 thessalonians": "1TH", "2 thessalonians": "2TH", "1 timothy": "1TI",
    "2 timothy": "2TI", titus: "TIT", philemon: "PHM", hebrews: "HEB",
    james: "JAS", "1 peter": "1PE", "2 peter": "2PE", "1 john": "1JN",
    "2 john": "2JN", "3 john": "3JN", jude: "JUD", revelation: "REV",
  };

  // Parse "Genesis 1:1-3" -> { book: "genesis", chapter: "1", verses: "1-3" }
  const match = reference.match(/^(\d?\s*\w+(?:\s+\w+)?)\s+(\d+)(?::(.+))?$/i);
  if (!match) return reference;

  const bookName = match[1].toLowerCase().trim();
  const chapter = match[2];
  const verses = match[3];

  const bookCode = bookMap[bookName];
  if (!bookCode) return reference;

  if (verses) {
    return `${bookCode}.${chapter}.${verses}`;
  }
  return `${bookCode}.${chapter}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
