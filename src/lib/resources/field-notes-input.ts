/**
 * Decides WHAT the field-notes generator is allowed to read, per provider
 * (spec §A-FN). External links carry only metadata — letting Claude
 * "summarize" a book from its title is a hallucination pipeline, so
 * amazon/web/youtube rows are framing-only regardless of what else is on
 * the row. Below a floor of usable text, no draft is generated at all.
 */
export type FieldNotesMode = "full" | "framing" | "insufficient";

export interface FieldNotesInput {
  mode: FieldNotesMode;
  content: string;
}

const FULL_BODY_MIN = 400;
const FULL_BODY_CAP = 12000;
const FRAMING_META_MIN = 40;

export function selectDraftingInput(row: {
  provider: string | null;
  bodyText: string | null;
  title: string;
  author: string | null;
  description: string | null;
  summary: string | null;
}): FieldNotesInput {
  const metaChars = [row.author ?? "", row.description ?? "", row.summary ?? ""]
    .join("").trim().length;

  const isExternal =
    row.provider === "amazon" || row.provider === "web" || row.provider === "youtube";

  if (!isExternal && (row.bodyText?.trim().length ?? 0) >= FULL_BODY_MIN) {
    return {
      mode: "full",
      content: `Title: ${row.title}\n\n${row.bodyText!.trim().slice(0, FULL_BODY_CAP)}`,
    };
  }

  if (row.title.trim() && metaChars >= FRAMING_META_MIN) {
    const authorLine =
      row.author && row.provider !== "youtube" ? `Author/creator: ${row.author}\n` : "";
    return {
      mode: "framing",
      content: `Title: ${row.title}\n${authorLine}About it: ${[row.description, row.summary].filter(Boolean).join("\n")}`,
    };
  }

  return { mode: "insufficient", content: "" };
}
