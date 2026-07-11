import { parseReference } from "@/lib/bible/books";
import { getESVPassage } from "@/lib/bible/esv";

export type ReferenceVerdict = "valid" | "invalid" | "unavailable";

/** Pure canon-parse check: does this string resolve to a real book/chapter/verse? */
export function localParse(ref: string): "parses" | "invalid" {
  return parseReference(ref) ? "parses" : "invalid";
}

/**
 * Verifies an AI-proposed scripture reference before it burns any ESV
 * budget. Local canon parse first (zero network for obviously-fake refs);
 * only a locally-valid reference goes on to getESVPassage
 * (src/lib/bible/esv.ts), the same fetcher the Bible reader uses. Never
 * throws: getESVPassage throws on a missing key, network failure, or
 * non-200 response, and every throw classifies as "unavailable"; a
 * passage that comes back empty is "invalid". That split lets autopilot
 * distinguish "this isn't scripture" from "we couldn't check right now."
 */
export async function verifyReference(ref: string): Promise<ReferenceVerdict> {
  if (localParse(ref) === "invalid") {
    return "invalid";
  }

  try {
    const { text } = await getESVPassage(ref);
    return text.trim() ? "valid" : "invalid";
  } catch {
    return "unavailable";
  }
}
