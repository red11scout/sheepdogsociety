/** A single governable section on a public page. `locked` sections are
 *  Scripture, page heroes, or dynamic/DB content — never hideable,
 *  reorderable, or AI-touchable (spec guard rail 6). */
export type SectionDef = { id: string; label: string; hint: string; locked?: true };

/** Per-page section registry — the render-merge rule's source of truth for
 *  ids, order, and lock state. Homepage only in DS-1; ids below are
 *  load-bearing (Task 7 wires the homepage assembly against them verbatim). */
export const SECTION_REGISTRY: Record<
  string,
  { pageId: string; label: string; sections: SectionDef[] }
> = {
  home: {
    pageId: "home",
    label: "Homepage",
    sections: [
      { id: "hero", label: "Front page hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "verse", label: "Acts 20:28 band", hint: "Scripture stays.", locked: true },
      { id: "what-this-is", label: "What this is", hint: "The five plain answers." },
      { id: "gatherings", label: "Next gatherings", hint: "Live from the events calendar.", locked: true },
      { id: "letter", label: "This week's Letter", hint: "Live from the Letter.", locked: true },
      { id: "story", label: "Brother's story", hint: "Live from Stories.", locked: true },
      { id: "join-cta", label: "Join invitation", hint: "The closing ask." },
    ],
  },
};
