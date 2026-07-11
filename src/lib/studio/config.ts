import { SECTION_REGISTRY, type SectionDef } from "./sections";

/** One section's staged visibility. Array order in `StudioConfig.pages[x].sections`
 *  is the config's ordering intent — see `renderMerge` for how it's applied. */
export type SectionState = { id: string; visible: boolean };

/** Migration 0020 config shape, stored verbatim in `site_studio.draft` /
 *  `.published`. An empty/absent page entry renders today's site exactly
 *  (spec guard rail 7). */
export type StudioConfig = {
  themeId: string;
  pages: Record<string, { sections: SectionState[] }>;
};

export const DEFAULT_CONFIG: StudioConfig = { themeId: "pasture-iron", pages: {} };

/** Spec render-merge rule — used identically on studio read, public render,
 *  and restore: config order/visibility applies only to ids it names;
 *  registry sections missing from config render visible at registry
 *  position; unknown config ids are dropped; locked sections are forced
 *  visible and keep registry position (excluded from re-sequencing even
 *  when named); duplicates in config: first wins. */
export function renderMerge(
  pageId: string,
  config: StudioConfig
): { id: string; visible: boolean; locked: boolean }[] {
  const page = SECTION_REGISTRY[pageId];
  if (!page) return [];
  const named = new Map<string, SectionState>();
  for (const s of config.pages[pageId]?.sections ?? []) {
    if (!named.has(s.id)) named.set(s.id, s);
  }
  const registryIds = page.sections.map((s) => s.id);
  const namedOrder = [...named.keys()].filter((id) => {
    const def = page.sections.find((s) => s.id === id);
    return def && !def.locked;
  });
  // Walk registry order; unlocked ids that appear in config are re-sequenced
  // among themselves per config order. Locked + unnamed ids hold registry slots.
  const namedSlots = registryIds.filter((id) => namedOrder.includes(id));
  let cursor = 0;
  return page.sections.map((def: SectionDef) => {
    let id = def.id;
    if (namedSlots.includes(def.id)) {
      id = namedOrder[cursor++];
    }
    const cfg = named.get(id);
    const locked = !!page.sections.find((s) => s.id === id)?.locked;
    return { id, visible: locked ? true : (cfg?.visible ?? true), locked };
  });
}

/** Unknown/retired themeId falls back to `pasture-iron` — the theme values-
 *  identical to today's globals.css (spec: "unknown themeId falls back to
 *  pasture-iron"). */
export function resolveThemeId(config: StudioConfig, knownIds: string[]): string {
  return knownIds.includes(config.themeId) ? config.themeId : "pasture-iron";
}
