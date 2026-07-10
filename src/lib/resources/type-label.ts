/**
 * Plain-English resource type label. Replaces the Phase-2 icon system the
 * users called confusing (Amazon books and generic files shared a scroll
 * icon). Precedence: provider wins, then a readable extracted body, then
 * mime, then Download. See spec §A.3.
 */
export type ResourceTypeLabel = "Book" | "Video" | "Article" | "Guide" | "Download";

export function typeLabel(input: {
  provider: string | null;
  sourceMime: string | null;
  hasBody: boolean;
  fileKey: string;
}): ResourceTypeLabel {
  if (input.provider === "amazon") return "Book";
  if (input.provider === "youtube") return "Video";
  if (input.provider === "web") return "Article";
  // Readable extracted body (mammoth .docx etc.) renders on the detail
  // page, so it is a Guide regardless of the file's mime.
  if (input.hasBody) return "Guide";
  if (input.sourceMime?.startsWith("video/")) return "Video";
  if (input.sourceMime === "application/pdf") return "Guide";
  return "Download";
}
