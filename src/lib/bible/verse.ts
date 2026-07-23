import { referenceToUrl } from "./books";

/**
 * Verse text for the footer scripture marquee popovers. Same rules as the
 * reader: Scripture renders VERBATIM from the API — ESV first, WEB
 * public-domain fallback — never AI-generated, never edited. Whitespace is
 * the only thing touched. 24h fetch cache on both providers.
 */

export interface MarqueeVerse {
  ref: string;
  /** null = both providers failed — the marquee renders a plain,
   *  non-interactive ref for this entry. */
  text: string | null;
  translation: "ESV" | "WEB" | null;
  /** /bible/<book>/<chapter> deep link (null if the ref doesn't parse). */
  url: string | null;
}

/** Collapse runs of whitespace; the words themselves are untouched. */
export function condenseVerseText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

async function fetchESVVerse(ref: string): Promise<string> {
  const apiKey = process.env.ESV_API_KEY?.trim();
  if (!apiKey) throw new Error("ESV_API_KEY not configured");
  const params = new URLSearchParams({
    q: ref,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "false",
    "include-short-copyright": "false",
    "include-passage-references": "false",
  });
  const res = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
    headers: { Authorization: `Token ${apiKey}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`ESV API error: ${res.status}`);
  const data = (await res.json()) as { passages?: string[] };
  const text = condenseVerseText((data.passages ?? []).join(" "));
  if (!text) throw new Error("ESV returned no passage");
  return text;
}

async function fetchWEBVerse(ref: string): Promise<string> {
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(ref)}?translation=web`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`bible-api.com error: ${res.status}`);
  const data = (await res.json()) as {
    text?: string;
    verses?: { text: string }[];
  };
  const raw =
    data.text ?? (data.verses ?? []).map((v) => v.text).join(" ");
  const text = condenseVerseText(raw ?? "");
  if (!text) throw new Error("bible-api.com returned no text");
  return text;
}

export async function getMarqueeVerses(
  refs: readonly string[]
): Promise<MarqueeVerse[]> {
  return Promise.all(
    refs.map(async (ref): Promise<MarqueeVerse> => {
      const url = referenceToUrl(ref);
      try {
        return { ref, text: await fetchESVVerse(ref), translation: "ESV", url };
      } catch {
        try {
          return { ref, text: await fetchWEBVerse(ref), translation: "WEB", url };
        } catch {
          return { ref, text: null, translation: null, url };
        }
      }
    })
  );
}
