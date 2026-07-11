import { SECTION_REGISTRY } from "./sections";
import { renderMerge, type StudioConfig } from "./config";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";
import { findBannedLanguage } from "@/lib/ai/banned";

export type SectionChange = {
  pageId: string;
  sectionId: string;
  visible?: boolean;
  position?: number;
};

export type TextEdit = { key: string; value: string; why: string };

export type Changeset = {
  themeId?: string;
  sectionChanges: SectionChange[];
  textEdits: TextEdit[];
};

export type DroppedItem = { item: SectionChange | TextEdit; reason: string };

const KNOWN_TEXT_KEYS = new Set<string>(SITE_TEXT_KEYS.map((e) => e.key));
const MAX_ACCEPTED = 20;

export function validateChangeset(
  changeset: Changeset,
  currentConfig: StudioConfig
): {
  accepted: { sectionChanges: SectionChange[]; textEdits: TextEdit[]; themeId?: string };
  dropped: DroppedItem[];
} {
  const dropped: DroppedItem[] = [];
  const seenPairs = new Set<string>();
  const duplicatePairs = new Set<string>();

  // First pass: find every {pageId, sectionId} pair that appears more than once.
  for (const c of changeset.sectionChanges) {
    const pairKey = `${c.pageId}::${c.sectionId}`;
    if (seenPairs.has(pairKey)) duplicatePairs.add(pairKey);
    seenPairs.add(pairKey);
  }

  const acceptedSectionChanges: SectionChange[] = [];
  for (const c of changeset.sectionChanges) {
    const pairKey = `${c.pageId}::${c.sectionId}`;
    if (duplicatePairs.has(pairKey)) {
      dropped.push({ item: c, reason: `Duplicate entry for ${c.pageId}/${c.sectionId} — skipped both.` });
      continue;
    }
    const registry = SECTION_REGISTRY[c.pageId];
    if (!registry) {
      dropped.push({ item: c, reason: `"${c.pageId}" is not a page this site governs.` });
      continue;
    }
    const def = registry.sections.find((s) => s.id === c.sectionId);
    if (!def) {
      dropped.push({ item: c, reason: `"${c.sectionId}" is not a section on ${c.pageId}.` });
      continue;
    }
    if (def.locked) {
      dropped.push({ item: c, reason: `"${def.label}" is locked and can't be changed.` });
      continue;
    }
    if (c.position !== undefined) {
      const materialized = renderMerge(c.pageId, currentConfig);
      if (c.position < 0 || c.position >= materialized.length) {
        dropped.push({
          item: c,
          reason: `Position ${c.position} is out of range for ${c.pageId} (0-${materialized.length - 1}).`,
        });
        continue;
      }
    }
    acceptedSectionChanges.push(c);
  }

  const acceptedTextEdits: TextEdit[] = [];
  for (const e of changeset.textEdits) {
    if (!KNOWN_TEXT_KEYS.has(e.key)) {
      dropped.push({ item: e, reason: `"${e.key}" is not a key this site governs.` });
      continue;
    }
    if (e.value.trim() === "") {
      dropped.push({ item: e, reason: "Blank edits are a reset — do that by hand, not through AI." });
      continue;
    }
    const banned = findBannedLanguage(e.value);
    if (banned.length > 0) {
      dropped.push({ item: e, reason: `Contains banned language (${banned.join(", ")}) — outside the brand voice.` });
      continue;
    }
    acceptedTextEdits.push(e);
  }

  // Cap total accepted items (section changes + text edits combined) at 20,
  // in the order they were validated — section changes first, then text edits.
  const combined: (SectionChange | TextEdit)[] = [...acceptedSectionChanges, ...acceptedTextEdits];
  const overCap = combined.slice(MAX_ACCEPTED);
  for (const item of overCap) {
    dropped.push({ item, reason: `Over the ${MAX_ACCEPTED}-item limit per request — skipped.` });
  }
  const capped = combined.slice(0, MAX_ACCEPTED);
  const finalSectionChanges = capped.filter((i): i is SectionChange => "sectionId" in i);
  const finalTextEdits = capped.filter((i): i is TextEdit => "key" in i);

  let themeId: string | undefined;
  if (changeset.themeId !== undefined) {
    // Theme validity is resolved by the caller's own resolveThemeId against
    // the real THEME_IDS list (Task 4 imports it) — this module only knows
    // about sections/text, so it passes themeId through unchecked here and
    // the Server Action layer (Task 4) re-validates it against THEME_IDS.
    themeId = changeset.themeId;
  }

  return {
    accepted: { sectionChanges: finalSectionChanges, textEdits: finalTextEdits, themeId },
    dropped,
  };
}
