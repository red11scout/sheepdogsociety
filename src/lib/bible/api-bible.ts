const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

// Bible version IDs from API.Bible
// These will need to be looked up after API key registration
const BIBLE_IDS: Record<string, string> = {
  NIV: "78a9f6124f344018-01", // Placeholder — update with actual ID
  NKJV: "de4e12af7f28f599-02", // Placeholder — update with actual ID
};

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
  version: "NIV" | "NKJV"
): Promise<{
  text: string;
  reference: string;
  copyright: string;
}> {
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    throw new Error("API_BIBLE_KEY not configured");
  }

  const bibleId = BIBLE_IDS[version];
  if (!bibleId) {
    throw new Error(`Unknown Bible version: ${version}`);
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
    throw new Error(`API.Bible error: ${res.status}`);
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
