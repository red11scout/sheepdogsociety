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
  about: {
    pageId: "about",
    label: "About",
    sections: [
      { id: "hero", label: "About hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "mission", label: "Our mission", hint: "The mission statement." },
      { id: "foundation", label: "Acts 20:28 band", hint: "Scripture stays.", locked: true },
      { id: "leadership", label: "Leadership model", hint: "The starfish, not a spider." },
      { id: "believe", label: "Three convictions", hint: "Scripture · Grace · Brotherhood cards." },
      { id: "culture", label: "Our culture", hint: "How we hold the line, four points." },
    ],
  },
  join: {
    pageId: "join",
    label: "Join",
    sections: [
      { id: "hero", label: "Join hero + form", hint: "Headline, path switcher, and the live sign-up form.", locked: true },
      { id: "principles", label: "Five core principles", hint: "What you are joining." },
    ],
  },
  faq: {
    pageId: "faq",
    label: "FAQ",
    sections: [
      { id: "hero", label: "FAQ hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "questions", label: "Questions & answers", hint: "The three grouped accordions.", locked: true },
      { id: "cta", label: "Still have a question?", hint: "Closing link to Contact." },
    ],
  },
  contact: {
    pageId: "contact",
    label: "Contact",
    sections: [
      { id: "hero", label: "Contact hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "form", label: "Contact form", hint: "The live message form.", locked: true },
    ],
  },
  giving: {
    pageId: "giving",
    label: "Giving",
    sections: [
      { id: "hero", label: "Giving hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "why-we-give", label: "Why we give", hint: "Quotes 2 Corinthians 9:7 — stays visible.", locked: true },
      { id: "ways-to-give", label: "Ways to give", hint: "The three-card grid." },
      { id: "partners", label: "Partners CTA", hint: "Closing link to Contact." },
    ],
  },
  "what-to-expect": {
    pageId: "what-to-expect",
    label: "What to Expect",
    sections: [
      { id: "hero", label: "Hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "rhythm", label: "Five things that happen", hint: "What happens at a table." },
      { id: "verse-plate", label: "Acts 20:28 band", hint: "Scripture stays.", locked: true },
      { id: "faq", label: "Quick answers", hint: "The eight-question list." },
      { id: "cta", label: "Closing invitation", hint: "Links to Groups and Join." },
    ],
  },
  "how-we-gather": {
    pageId: "how-we-gather",
    label: "How We Gather",
    sections: [
      { id: "hero", label: "Hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "rhythms", label: "Four rhythms", hint: "Weekly, monthly, quarterly, annual." },
      { id: "guidelines", label: "Group size guidelines", hint: "Two to twelve, then plant another." },
      { id: "cta", label: "Closing invitation", hint: "Links to Groups and Join." },
    ],
  },
  events: {
    pageId: "events",
    label: "Events",
    sections: [
      { id: "hero", label: "Events hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "upcoming", label: "Upcoming gatherings", hint: "Live from the events calendar.", locked: true },
      { id: "past-gatherings", label: "Past gatherings", hint: "Live recap photos, when any exist.", locked: true },
    ],
  },
  letter: {
    pageId: "letter",
    label: "The Letter (index)",
    sections: [
      { id: "hero", label: "Letter hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "issue-grid", label: "Published letters", hint: "Live from the Letter.", locked: true },
    ],
  },
  stories: {
    pageId: "stories",
    label: "Stories",
    sections: [
      { id: "hero", label: "Stories hero", hint: "The first thing every visitor reads.", locked: true },
      { id: "stories-ledger", label: "Approved stories", hint: "Live from Stories.", locked: true },
      { id: "cta", label: "Share your story CTA", hint: "Closing link to Contact." },
    ],
  },
  resources: {
    pageId: "resources",
    label: "Resources",
    sections: [
      { id: "browser", label: "Resource library", hint: "The whole interactive browser — search, filters, results. One section by design; it has no separate framing copy to govern.", locked: true },
    ],
  },
};
