import { parseReference } from "@/lib/bible/books";

const ESV_API_BASE = "https://api.esv.org/v3/passage/text/";

export type ReferenceVerdict = "valid" | "invalid" | "unavailable";

/** Pure canon-parse check: does this string resolve to a real book/chapter/verse? */
export function localParse(ref: string): "parses" | "invalid" {
  return parseReference(ref) ? "parses" : "invalid";
}

/**
 * Verifies an AI-proposed scripture reference before it burns any ESV
 * budget. Local canon parse first (zero network for obviously-fake refs);
 * only a locally-valid reference goes on to ESV, mirroring getESVPassage's
 * request shape (src/lib/bible/esv.ts:11-48). Never throws: any network
 * failure, missing key, or non-200 response classifies as "unavailable"
 * rather than surfacing an error, so autopilot can distinguish "this isn't
 * scripture" from "we couldn't check right now."
 */
export async function verifyReference(ref: string): Promise<ReferenceVerdict> {
  if (localParse(ref) === "invalid") {
    return "invalid";
  }

  try {
    const apiKey = process.env.ESV_API_KEY?.trim();
    if (!apiKey) {
      return "unavailable";
    }

    // Request shape deliberately mirrors getESVPassage (src/lib/bible/esv.ts:11-48) —
    // keep both in sync; if one changes, the other must drift with it.
    const params = new URLSearchParams({
      q: ref,
      "include-headings": "false",
      "include-footnotes": "false",
      "include-verse-numbers": "true",
      "include-short-copyright": "true",
      "include-passage-references": "true",
    });

    const res = await fetch(`${ESV_API_BASE}?${params}`, {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      return "unavailable";
    }

    const data: { passages: string[] } = await res.json();
    const text = (data.passages ?? []).join("\n\n").trim();
    return text ? "valid" : "invalid";
  } catch {
    return "unavailable";
  }
}
