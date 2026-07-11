# DS-2 — Design Studio Coverage (Remaining Public Pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every remaining public page (about, join, faq, contact, giving, what-to-expect, how-we-gather, events, letter, stories, resources) gets a Design Studio section registry + governed text keys, is wired through `renderMerge`, and is selectable from `/admin/studio`'s page picker — with zero DOM change while every config stays empty.

**Architecture:** Reuse the DS-1 engine unchanged (render-merge, `draftMode()`-outside-cache loaders, middleware compare-strip, Apply/Discard/Restore, advisory lock 815552). DS-2 only *adds data* (section registries, text keys) and *wires pages* (the same `sections` record + `renderMerge(pageId, config).filter(...).map(...)` pattern already proven on the homepage), plus makes `/admin/studio` page-aware instead of homepage-only.

**Tech Stack:** Next.js 16 App Router (RSC), Drizzle/Neon, Vitest, existing `src/lib/studio/*` + `src/lib/site-text/*` modules.

## Global Constraints

- Do NOT modify `src/lib/studio/config.ts` (render-merge algorithm), `src/server/studio.ts` (Apply/Discard/Restore), `src/middleware.ts`, `src/app/(public)/layout.tsx`, or `src/lib/studio/themes*` — DS-1 architecture is frozen; this plan only adds registry data and page wiring.
- Locked sections (spec guard rail 6): every Scripture/ember band, every page hero, every dynamic/DB-content section (lists, forms). Locked sections are never hideable/reorderable; `renderMerge` already forces them visible — no new code needed to enforce this, only correct `locked: true` data.
- Scripture is never a `site_text` key (existing rule, `src/lib/site-text/registry.ts` header comment).
- Empty/absent config + no drafts must render each page byte-identical to today (DOM-diff, modulo build hashes) — spec §"Section registries + page wiring", "Per-page bar."
- `SITE_TEXT_KEYS` stays `as const satisfies readonly SiteTextEntry[]` — new groups are new string literals added to the `SiteTextEntry["group"]` union.
- Voice rules apply to any new admin-facing copy (hints, labels): no em-dashes where a comma works, no banned words (see repo CLAUDE.md).
- `npm test`, `npx tsc --noEmit`, `npm run check:contrast`, and `npm run lint` must all pass before any task is marked complete.

---

## File Structure

- `src/lib/studio/sections.ts` — gains 11 new `SECTION_REGISTRY` entries (about, join, faq, contact, giving, what-to-expect, how-we-gather, events, letter, stories, resources). Pure data, no logic change.
- `src/lib/site-text/registry.ts` — gains new groups (`"Join"`, `"FAQ"`, `"Contact"`, `"Giving"`, `"What to Expect"`, `"How We Gather"`, `"Events"`, `"The Letter"`, `"Stories"`) and their keys. `SiteTextEntry["group"]` union grows accordingly.
- `src/app/(public)/about/page.tsx`, `join/page.tsx`, `faq/page.tsx`, `giving/page.tsx`, `what-to-expect/page.tsx`, `how-we-gather/page.tsx`, `events/page.tsx`, `letter/page.tsx`, `stories/page.tsx`, `resources/page.tsx` — each converted to the homepage's `sections` record + `renderMerge` pattern.
- `src/app/(public)/contact/page.tsx` — split: new `src/components/public/contact-form.tsx` (client, holds the existing form state/fetch logic verbatim) + `page.tsx` becomes an async server component wired through `renderMerge`.
- `src/app/(app)/admin/studio/page.tsx` + `studio.tsx` — gain a page selector; text entries and section list become page-scoped instead of hardcoded to `"home"`/`"Homepage"`.

---

### Task 1: Section registry — all 11 remaining pages

**Files:**
- Modify: `src/lib/studio/sections.ts`
- Test: `src/lib/studio/sections.test.ts` (new)

**Interfaces:**
- Consumes: `SectionDef` type (existing, `{ id, label, hint, locked? }`).
- Produces: `SECTION_REGISTRY` keys `"about" | "join" | "faq" | "contact" | "giving" | "what-to-expect" | "how-we-gather" | "events" | "letter" | "stories" | "resources"` (plus existing `"home"`), each `{ pageId, label, sections: SectionDef[] }`. Every later task's page wiring depends on these exact ids matching its `sections` record keys 1:1.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/studio/sections.test.ts
import { describe, expect, it } from "vitest";
import { SECTION_REGISTRY } from "./sections";

const EXPECTED_PAGE_IDS = [
  "home", "about", "join", "faq", "contact", "giving",
  "what-to-expect", "how-we-gather", "events", "letter", "stories", "resources",
];

describe("SECTION_REGISTRY", () => {
  it("has every governed page, keyed by its own pageId", () => {
    for (const id of EXPECTED_PAGE_IDS) {
      expect(SECTION_REGISTRY[id]).toBeDefined();
      expect(SECTION_REGISTRY[id].pageId).toBe(id);
    }
  });

  it("every page has unique, non-empty section ids", () => {
    for (const page of Object.values(SECTION_REGISTRY)) {
      const ids = page.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.length > 0)).toBe(true);
    }
  });

  it("every page has at least one locked section (a hero or dynamic block)", () => {
    for (const page of Object.values(SECTION_REGISTRY)) {
      expect(page.sections.some((s) => s.locked)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/studio/sections.test.ts`
Expected: FAIL — `SECTION_REGISTRY["about"]` is undefined.

- [ ] **Step 3: Add the 11 registry entries**

Append these entries into the existing `SECTION_REGISTRY` object in `src/lib/studio/sections.ts` (the `home` entry stays untouched):

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/studio/sections.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/sections.ts src/lib/studio/sections.test.ts
git commit -m "feat(studio): section registries for all remaining public pages"
```

---

### Task 2: Text key registry — new governed groups

**Files:**
- Modify: `src/lib/site-text/registry.ts`
- Test: `src/lib/site-text/registry.test.ts` (extend if it exists, else create)

**Interfaces:**
- Consumes: `SiteTextEntry` type (existing).
- Produces: new `SiteTextKey` literals used verbatim by Tasks 4-8's page wiring: `join.principles.title` group `"Join"`; `faq.cta.title`, `faq.cta.body` group `"FAQ"`; `contact.hero.headline1`, `contact.hero.headline2`, `contact.hero.paragraph` group `"Contact"`; `giving.hero.*`, `giving.why.*`, `giving.partners.*` group `"Giving"`; `wte.hero.*`, `wte.cta.*` group `"What to Expect"`; `hwg.hero.*`, `hwg.cta.*` group `"How We Gather"`; `events.hero.*`, `events.upcoming.empty` group `"Events"`; `letter.hero.*`, `letter.empty.body` group `"The Letter"`; `stories.hero.*`, `stories.empty.body`, `stories.cta.*` group `"Stories"`.

- [ ] **Step 1: Write the failing test**

If `src/lib/site-text/registry.test.ts` does not exist, create it:

```ts
// src/lib/site-text/registry.test.ts
import { describe, expect, it } from "vitest";
import { SITE_TEXT_KEYS, SITE_TEXT_DEFAULTS } from "./registry";

describe("SITE_TEXT_KEYS", () => {
  it("has no duplicate keys", () => {
    const keys = SITE_TEXT_KEYS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every key has a non-empty default", () => {
    for (const key of Object.keys(SITE_TEXT_DEFAULTS)) {
      expect(SITE_TEXT_DEFAULTS[key as keyof typeof SITE_TEXT_DEFAULTS].length).toBeGreaterThan(0);
    }
  });

  it("covers every DS-2 group", () => {
    const groups = new Set(SITE_TEXT_KEYS.map((e) => e.group));
    for (const g of ["Join", "FAQ", "Contact", "Giving", "What to Expect", "How We Gather", "Events", "The Letter", "Stories"]) {
      expect(groups.has(g as never)).toBe(true);
    }
  });
});
```

If the file already exists (check first with `ls src/lib/site-text/registry.test.ts`), add only the third `it` block above to it instead of duplicating the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/site-text/registry.test.ts`
Expected: FAIL — `groups.has("Join")` is false (and `SiteTextEntry["group"]` union rejects the new groups, so `tsc` also fails at this point — expected).

- [ ] **Step 3: Widen the group union and append entries**

In `src/lib/site-text/registry.ts`, change the `group` field's type:

```ts
export interface SiteTextEntry {
  key: string;
  label: string;
  group:
    | "Homepage"
    | "About"
    | "Join"
    | "FAQ"
    | "Contact"
    | "Giving"
    | "What to Expect"
    | "How We Gather"
    | "Events"
    | "The Letter"
    | "Stories";
  defaultValue: string;
  multiline: boolean;
}
```

Then append these entries to `SITE_TEXT_KEYS`, immediately before the closing `] as const satisfies readonly SiteTextEntry[];`:

```ts
  // ── Join ──────────────────────────────────────────────────
  { key: "join.principles.title", label: "Principles — section title", group: "Join", multiline: false,
    defaultValue: "Five core principles" },
  // ── FAQ ───────────────────────────────────────────────────
  { key: "faq.cta.title", label: "Closing CTA — title", group: "FAQ", multiline: false,
    defaultValue: "Still have a question?" },
  { key: "faq.cta.body", label: "Closing CTA — body", group: "FAQ", multiline: true,
    defaultValue: "Send us a note. We read every one." },
  // ── Contact ───────────────────────────────────────────────
  { key: "contact.hero.headline1", label: "Hero headline — line 1", group: "Contact", multiline: false,
    defaultValue: "Send a note." },
  { key: "contact.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Contact", multiline: false,
    defaultValue: "We read every one." },
  { key: "contact.hero.paragraph", label: "Hero paragraph (before the email link)", group: "Contact", multiline: true,
    defaultValue: "Use the form below, or write us straight at" },
  // ── Giving ────────────────────────────────────────────────
  { key: "giving.hero.headline1", label: "Hero headline — line 1", group: "Giving", multiline: false,
    defaultValue: "Fuel the" },
  { key: "giving.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Giving", multiline: false,
    defaultValue: "brotherhood." },
  { key: "giving.why.title", label: "Why we give — title", group: "Giving", multiline: false,
    defaultValue: "Always free for every man." },
  { key: "giving.ways.title", label: "Ways to give — section title", group: "Giving", multiline: false,
    defaultValue: "Ways to give" },
  { key: "giving.partners.title", label: "Partners CTA — title", group: "Giving", multiline: false,
    defaultValue: "Churches. Organizations. Brothers." },
  // ── What to Expect ────────────────────────────────────────
  { key: "wte.hero.headline1", label: "Hero headline — line 1", group: "What to Expect", multiline: false,
    defaultValue: "Come hungry." },
  { key: "wte.hero.headline2", label: "Hero headline — line 2 (italic)", group: "What to Expect", multiline: false,
    defaultValue: "Bring nothing else." },
  { key: "wte.cta.title", label: "Closing CTA — title", group: "What to Expect", multiline: false,
    defaultValue: "There is a chair." },
  // ── How We Gather ─────────────────────────────────────────
  { key: "hwg.hero.headline1", label: "Hero headline — line 1", group: "How We Gather", multiline: false,
    defaultValue: "Four rhythms." },
  { key: "hwg.hero.headline2", label: "Hero headline — line 2 (italic)", group: "How We Gather", multiline: false,
    defaultValue: "One brotherhood." },
  { key: "hwg.cta.title", label: "Closing CTA — title", group: "How We Gather", multiline: false,
    defaultValue: "Find a group, or plant one." },
  // ── Events ────────────────────────────────────────────────
  { key: "events.hero.headline1", label: "Hero headline — line 1", group: "Events", multiline: false,
    defaultValue: "Bring a brother." },
  { key: "events.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Events", multiline: false,
    defaultValue: "Bring a friend." },
  { key: "events.upcoming.empty", label: "Upcoming list — empty state", group: "Events", multiline: true,
    defaultValue: "No gatherings on the books yet." },
  // ── The Letter ────────────────────────────────────────────
  { key: "letter.hero.headline1", label: "Hero headline — line 1", group: "The Letter", multiline: false,
    defaultValue: "One letter" },
  { key: "letter.hero.headline2", label: "Hero headline — line 2 (italic)", group: "The Letter", multiline: false,
    defaultValue: "a week." },
  { key: "letter.empty.body", label: "Issue grid — empty state", group: "The Letter", multiline: true,
    defaultValue: "The first encouragement is on the way. Sign up below and it will land in your inbox the day it publishes." },
  // ── Stories ───────────────────────────────────────────────
  { key: "stories.hero.headline1", label: "Hero headline — line 1", group: "Stories", multiline: false,
    defaultValue: "Wolves transformed." },
  { key: "stories.hero.headline2", label: "Hero headline — line 2 (italic)", group: "Stories", multiline: false,
    defaultValue: "Sheepdogs sent." },
  { key: "stories.empty.body", label: "Stories ledger — empty state", group: "Stories", multiline: true,
    defaultValue: "Stories on the way." },
  { key: "stories.cta.title", label: "Closing CTA — title", group: "Stories", multiline: false,
    defaultValue: "Have a story?" },
```

**Do not** change any existing key's default value — every default above is copied verbatim from the page's current hardcoded copy, read directly from the source files, so wiring a page to read `t["..."]` in later tasks produces byte-identical output. Where a page's current copy is one continuous sentence spanning a link (e.g. Contact's "Use the form below, or write us straight at {email}. It reaches the same watch."), only the portion before the link becomes the key — the link markup and trailing sentence stay hardcoded JSX, unchanged. Task 6 shows the exact split.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/site-text/registry.test.ts && npx tsc --noEmit`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/site-text/registry.ts src/lib/site-text/registry.test.ts
git commit -m "feat(studio): governed text keys for all remaining public pages"
```

---

### Task 3: Admin Studio page selector

**Files:**
- Modify: `src/app/(app)/admin/studio/page.tsx`
- Modify: `src/app/(app)/admin/studio/studio.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY` (Task 1), `SITE_TEXT_KEYS` (Task 2), existing `saveDraftConfig`, `saveDraftText`, `applyDraft`, `discardDraft`, `restoreVersion`, `listVersions` from `src/server/studio.ts` (unchanged signatures).
- Produces: the Studio UI now reads a `pages: { id: string; label: string; path: string }[]` prop instead of assuming `"home"`; page state (`selectedPage`) drives which `SECTION_REGISTRY` entry and which `SITE_TEXT_KEYS` group render, and which path the preview iframe loads.

- [ ] **Step 1: Define the page list and preview paths**

In `src/app/(app)/admin/studio/page.tsx`, add a `PAGES` constant above the component (this is the one hardcoded map from Studio `pageId` to its live route and its `SITE_TEXT_KEYS` group name — both were 1:1 by accident on the homepage, so DS-1 never needed this map):

```ts
const PAGES: { id: string; label: string; path: string; textGroup: string }[] = [
  { id: "home", label: "Homepage", path: "/", textGroup: "Homepage" },
  { id: "about", label: "About", path: "/about", textGroup: "About" },
  { id: "join", label: "Join", path: "/join", textGroup: "Join" },
  { id: "faq", label: "FAQ", path: "/faq", textGroup: "FAQ" },
  { id: "contact", label: "Contact", path: "/contact", textGroup: "Contact" },
  { id: "giving", label: "Giving", path: "/giving", textGroup: "Giving" },
  { id: "what-to-expect", label: "What to Expect", path: "/what-to-expect", textGroup: "What to Expect" },
  { id: "how-we-gather", label: "How We Gather", path: "/how-we-gather", textGroup: "How We Gather" },
  { id: "events", label: "Events", path: "/events", textGroup: "Events" },
  { id: "letter", label: "The Letter", path: "/letter", textGroup: "The Letter" },
  { id: "stories", label: "Stories", path: "/stories", textGroup: "Stories" },
  { id: "resources", label: "Resources", path: "/resources", textGroup: "" },
];
```

- [ ] **Step 2: Pass every group's text entries, not just Homepage's**

Replace the single `.filter((e) => e.group === "Homepage")` line in `page.tsx` with a full map keyed by group, and pass `PAGES` + the full map into `Studio`:

```ts
  const entriesByGroup: Record<string, typeof entries> = {};
  for (const p of PAGES) {
    entriesByGroup[p.id] = p.textGroup
      ? SITE_TEXT_KEYS.filter((e) => e.group === p.textGroup).map((e) => ({
          key: e.key,
          label: e.label,
          multiline: e.multiline,
          defaultValue: e.defaultValue,
          stored: stored[e.key]?.value ?? null,
          draftValue: stored[e.key]?.draftValue ?? null,
        }))
      : [];
  }
```

(Delete the old single `entries` computation and its `entries={entries}` prop; replace with `entriesByGroup={entriesByGroup}` and `pages={PAGES}` on `<Studio />`.)

- [ ] **Step 3: Add page-selector state to the client component**

In `studio.tsx`, change the `Studio` component's props type to accept `pages: { id: string; label: string; path: string }[]` and `entriesByGroup: Record<string, TextEntry[]>` in place of the old single `textEntries` prop. Add:

```ts
  const [selectedPage, setSelectedPage] = useState(pages[0].id);
  const pageMeta = pages.find((p) => p.id === selectedPage) ?? pages[0];
  const pageEntries = entriesByGroup[selectedPage] ?? [];
  const pageSections = SECTION_REGISTRY[selectedPage]?.sections ?? [];
```

Replace every existing reference to the hardcoded `SECTION_REGISTRY.home.sections` with `pageSections`, every `renderMerge("home", config)` with `renderMerge(selectedPage, config)`, and every reference to the old `textEntries` prop with `pageEntries`. Replace the hardcoded preview iframe `src="/"` (and the compare iframe's `src="/?studio=published..."`) with `src={pageMeta.path}` (and `` `${pageMeta.path}?studio=published...` ``, preserving whatever query-string construction already exists for the mode toggle).

Add a page-selector control in the left rail, directly above the existing theme picker:

```tsx
        <div>
          <label className="folio" htmlFor="studio-page-select">Page</label>
          <select
            id="studio-page-select"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id} className="bg-background text-foreground">
                {p.label}
              </option>
            ))}
          </select>
        </div>
```

Section show/hide, reorder, and text-field save calls already go through `saveDraftConfig(pageId, sections)` / `saveDraftText(key, value)` — confirm (read the existing calls) that `saveDraftConfig` takes a `pageId` argument already (it must, since DS-1's config shape is `pages: Record<pageId, ...>`); if so, replace the hardcoded `"home"` argument in those calls with `selectedPage`. Do not change `saveDraftConfig`'s or `saveDraftText`'s signatures — this task is UI-only.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, sign in as an admin, open `/admin/studio`. Confirm:
- The page selector lists all 12 pages.
- Switching pages swaps the section list, the text fields, and the preview iframe URL.
- The Resources entry shows its one locked "Resource library" section and an empty text-fields area (no crash on an empty `pageEntries` array).

Expected: all four hold. No automated test for this step — it is a client-UI wiring task with no pure logic to unit test; the review in Task 10 covers a scripted click-through.

- [ ] **Step 5: Run gates and commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

```bash
git add src/app/\(app\)/admin/studio/page.tsx src/app/\(app\)/admin/studio/studio.tsx
git commit -m "feat(studio): admin page selector, page-scoped sections and text"
```

---

### Task 4: Wire About page

**Files:**
- Modify: `src/app/(public)/about/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.about` (Task 1), `renderMerge` (existing, unchanged), `getStudioConfig` (existing, unchanged).
- Produces: nothing new consumed downstream — this is a leaf page wiring, same shape as the homepage's Task 7.

- [ ] **Step 1: Add imports and fetch the config**

At the top of `src/app/(public)/about/page.tsx`, add:

```ts
import { Fragment } from "react";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";
```

Change the component to fetch both in parallel:

```ts
export default async function AboutPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);
```

(Delete the old single `const t = await getSiteTextMap();` line.)

- [ ] **Step 2: Wrap the six existing sections into a `sections` record**

Change the function body from `return (<>...six <section> blocks...</>)` to:

```tsx
  const sections: Record<string, React.ReactNode> = {
    hero: (
      /* the existing hero <section>...</section> JSX, byte-for-byte unchanged */
    ),
    mission: (
      /* the existing mission <section>...</section> JSX, byte-for-byte unchanged */
    ),
    foundation: (
      /* the existing "Foundation: the page's one dark interlude" <section>...</section> JSX, byte-for-byte unchanged */
    ),
    leadership: (
      /* the existing leadership <section>...</section> JSX, byte-for-byte unchanged */
    ),
    believe: (
      /* the existing "What We Believe" <section>...</section> JSX, byte-for-byte unchanged */
    ),
    culture: (
      /* the existing culture <section>...</section> JSX, byte-for-byte unchanged */
    ),
  };

  return (
    <>
      {renderMerge("about", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
```

(This is exactly the homepage's Task 7 transformation — move each of the six `<section>` blocks currently in the JSX, unchanged, into the record entry with the matching id from `SECTION_REGISTRY.about`.)

- [ ] **Step 3: DOM-parity check**

Run: `npm run dev` in one terminal. In another:

```bash
curl -s http://localhost:3000/about > /tmp/about-before.html   # run this BEFORE step 2, save a copy first
curl -s http://localhost:3000/about > /tmp/about-after.html
diff /tmp/about-before.html /tmp/about-after.html
```

Expected: no diff (or only a build-hash/asset-query-string difference — confirm any diff is exactly that pattern, not content).

- [ ] **Step 4: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/about/page.tsx
git commit -m "feat(studio): wire About page through render-merge"
```

---

### Task 5: Wire Join and FAQ pages

**Files:**
- Modify: `src/app/(public)/join/page.tsx`
- Modify: `src/app/(public)/faq/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.join`, `SECTION_REGISTRY.faq` (Task 1); `join.principles.title`, `faq.cta.title`, `faq.cta.body` (Task 2).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Join — imports and config fetch**

`join/page.tsx` currently has no `getSiteTextMap`/`getStudioConfig` calls (it has no site-text keys today except the new `join.principles.title`). Add:

```ts
import { Fragment } from "react";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";
```

In `JoinPage`, after `const sp = await searchParams;`, add:

```ts
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);
```

- [ ] **Step 2: Join — wrap into sections, use the new text key**

Replace the return statement's two `<section>` blocks with:

```tsx
  const sections: Record<string, React.ReactNode> = {
    hero: (
      /* the existing hero <section>...</section> JSX (headline, path nav, sign-up/plant form), byte-for-byte unchanged */
    ),
    principles: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left={t["join.principles.title"]} right="Know before you come" />
          {/* the existing <ul> of principles and the closing "Want the full picture first?" <p>, byte-for-byte unchanged */}
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("join", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
```

- [ ] **Step 3: FAQ — imports, config fetch, and page conversion**

`faq/page.tsx`'s `FAQPage` is currently a non-async `export default function`. Change it to:

```ts
import { Fragment } from "react";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

export default async function FAQPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);
```

- [ ] **Step 4: FAQ — wrap into sections, use the new text keys**

Replace the return statement's three `<section>` blocks (hero, the `sections.map(...)` accordion block, and the closing CTA) with:

```tsx
  const pageSections: Record<string, React.ReactNode> = {
    hero: (
      /* the existing hero <section>...</section> JSX, byte-for-byte unchanged */
    ),
    questions: (
      /* the existing "Sections" <section>...</section> JSX (the sections.map(...) accordion block), byte-for-byte unchanged */
    ),
    cta: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <Icon name="message" size={48} strokeWidth={2} className="mx-auto text-brass" />
          <h2 className="display-xl mt-8 text-display-lg">{t["faq.cta.title"]}</h2>
          <p className="mx-auto mt-6 max-w-xl font-pullquote text-lede italic leading-relaxed text-muted-foreground">
            {t["faq.cta.body"]}
          </p>
          {/* the existing "Contact us" <Link>...</Link>, byte-for-byte unchanged */}
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("faq", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{pageSections[s.id]}</Fragment>
        ))}
    </>
  );
}
```

(Named `pageSections` here, not `sections`, because the file already has a top-level `const sections = [...]` array of FAQ data — do not rename that existing constant; it is consumed unchanged inside the `questions` entry.)

- [ ] **Step 5: DOM-parity check for both pages**

Run: `npm run dev`, then for each of `/join`, `/join?path=start`, `/faq`:

```bash
curl -s "http://localhost:3000/join" > /tmp/join-after.html
curl -s "http://localhost:3000/join?path=start" > /tmp/join-start-after.html
curl -s "http://localhost:3000/faq" > /tmp/faq-after.html
```

Compare each against a `git stash`-restored pre-change copy (`git stash`, curl into `*-before.html`, `git stash pop`, `diff`). Expected: no diff beyond build hashes.

- [ ] **Step 6: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(public\)/join/page.tsx src/app/\(public\)/faq/page.tsx
git commit -m "feat(studio): wire Join and FAQ pages through render-merge"
```

---

### Task 6: Wire Contact page (client-component extraction)

**Files:**
- Create: `src/components/public/contact-form.tsx`
- Modify: `src/app/(public)/contact/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.contact` (Task 1); `contact.hero.headline1`, `contact.hero.headline2`, `contact.hero.paragraph` (Task 2).
- Produces: `ContactForm` — a client component, default export, no props (matches the existing `NewsletterForm`/`PlantRequestForm` convention: self-contained state + fetch, no data from the parent).

- [ ] **Step 1: Extract the form into its own client component**

Create `src/components/public/contact-form.tsx` containing everything from `contact/page.tsx` that is NOT the hero section: the `"use client"` directive, the `TOPICS` constant, all imports it needs (`useState`, `Icon`, `Magnetic`, `Kicker`), the `handleSubmit` function, and the entire `<section>` block starting `{/* Form */}` through its closing `</section>` — moved verbatim, with the outer `<section>...</section>` becoming the component's return value directly (drop the surrounding fragment) — plus the `Field` helper function, moved as-is. Name the default export `ContactForm`:

```tsx
"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { Kicker } from "@/components/public/kicker";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "joining", label: "Joining a group" },
  { value: "starting", label: "Starting a group" },
  { value: "leadership", label: "Leadership" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

export default function ContactForm() {
  /* the existing handleSubmit + all useState hooks, unchanged */

  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-32">
        {/* the existing submitted/form ternary JSX, unchanged */}
      </div>
    </section>
  );
}

/* the existing Field helper function, unchanged, moved here since only ContactForm uses it */
```

- [ ] **Step 2: Rewrite `page.tsx` as an async server component**

Replace the entire file with:

```tsx
import { Fragment } from "react";
import { Kicker } from "@/components/public/kicker";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";
import ContactForm from "@/components/public/contact-form";

export const metadata = {
  title: "Contact — Sheepdog Society",
  description: "Get in touch with Sheepdog Society. We read every note.",
};

export default async function ContactPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="Contact" />
          <h1 className="display-xl mt-10 max-w-4xl text-display-xl">
            {t["contact.hero.headline1"]}
            <br />
            <em>{t["contact.hero.headline2"]}</em>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground">
            {t["contact.hero.paragraph"]}{" "}
            <a
              href="mailto:shepherd@acts2028sheepdogsociety.com"
              className="link-editorial font-medium text-foreground"
            >
              shepherd@acts2028sheepdogsociety.com
            </a>
            . It reaches the same watch.
          </p>
        </div>
      </section>
    ),
    form: <ContactForm />,
  };

  return (
    <>
      {renderMerge("contact", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
```

Note: this drops the old inline `<title>`/`<meta>` tags in favor of the standard `export const metadata` object (every other page in this plan uses that pattern; the old page was the only client-component page in `(public)`, which is why it used inline tags instead — with the split, the server wrapper can use the normal convention).

- [ ] **Step 3: DOM-parity check**

Run: `npm run dev`. Compare `curl -s http://localhost:3000/contact` before (via `git stash`) and after. Expected: no diff beyond build hashes and the `<title>`/`<meta>` tags now appearing in `<head>` instead of inline in `<body>` (a real, expected, and correct improvement — confirm the rendered `<title>` text and description content are unchanged, just relocated).

- [ ] **Step 4: Manual submit check**

With `npm run dev` running, open `/contact` in a browser, fill the form, submit. Expected: existing `/api/public/contact` POST behavior unchanged (still fires, still shows the "Message received." success state) — this route and its handler are untouched by this task.

- [ ] **Step 5: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/contact-form.tsx src/app/\(public\)/contact/page.tsx
git commit -m "feat(studio): split Contact into server page + ContactForm, wire render-merge"
```

---

### Task 7: Wire Giving, What-to-Expect, How-We-Gather pages

**Files:**
- Modify: `src/app/(public)/giving/page.tsx`
- Modify: `src/app/(public)/what-to-expect/page.tsx`
- Modify: `src/app/(public)/how-we-gather/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.giving`, `.["what-to-expect"]`, `.["how-we-gather"]` (Task 1); `giving.*`, `wte.*`, `hwg.*` keys (Task 2).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Giving — convert to async, wire sections**

`giving/page.tsx`'s `GivingPage` is currently a plain non-async function. Convert it the same way as FAQ (Task 5 Step 3): add the three imports, make it `async`, fetch `[t, config]` via `Promise.all`. Wrap its four existing `<section>` blocks into a `sections` record keyed `hero`, `why-we-give`, `ways-to-give`, `partners` (matching `SECTION_REGISTRY.giving`), substituting these two text lookups into the existing hero and why-we-give JSX where their hardcoded headline/title strings currently sit:

```tsx
    hero: (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the hardcoded headline JSX with: */}
        <h1 className="display-xl /* ...existing classes... */">
          {t["giving.hero.headline1"]}
          <br />
          <em>{t["giving.hero.headline2"]}</em>
        </h1>
        {/* rest of hero unchanged */}
      </section>
    ),
    "why-we-give": (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the hardcoded title JSX with: {t["giving.why.title"]} */}
        {/* rest (2 Cor 9:7 blockquote) unchanged, verbatim */}
      </section>
    ),
    "ways-to-give": (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the hardcoded section-title JSX with: {t["giving.ways.title"]} */}
        {/* the `ways` const map, unchanged */}
      </section>
    ),
    partners: (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the hardcoded title JSX with: {t["giving.partners.title"]} */}
        {/* rest unchanged */}
      </section>
    ),
```

Then render via `renderMerge("giving", config)` exactly as in prior tasks.

- [ ] **Step 2: What-to-Expect — convert to async, wire sections**

Same pattern: add imports, make `WhatToExpectPage` async, fetch `[t, config]`. Wrap the five existing sections into a record keyed `hero`, `rhythm`, `verse-plate`, `faq`, `cta` (matching `SECTION_REGISTRY["what-to-expect"]`), substituting only the hero headline and the closing CTA's title with `t["wte.hero.headline1"]` / `t["wte.hero.headline2"]` / `t["wte.cta.title"]` — the `rhythm` and `faq` sections' mapped local-const content (`TABLE_RHYTHM`, `FAQ`) and the `verse-plate` Scripture quote stay hardcoded, unchanged (Scripture is never a key; the rhythm/FAQ lists are out of DS-2 scope per the plan's YAGNI note — only hero + top-level CTA titles are keyed, matching the granularity used on Giving/How-We-Gather). Render via `renderMerge("what-to-expect", config)`.

- [ ] **Step 3: How-We-Gather — convert to async, wire sections**

Same pattern: add imports, make `HowWeGatherPage` async, fetch `[t, config]`. Wrap the four existing sections into a record keyed `hero`, `rhythms`, `guidelines`, `cta` (matching `SECTION_REGISTRY["how-we-gather"]`), substituting the hero headline and closing CTA title with `t["hwg.hero.headline1"]` / `t["hwg.hero.headline2"]` / `t["hwg.cta.title"]` — the `rhythms`/`guidelines` mapped local-const content stays hardcoded, unchanged. Render via `renderMerge("how-we-gather", config)`.

- [ ] **Step 4: DOM-parity check for all three**

Run: `npm run dev`. For `/giving`, `/what-to-expect`, `/how-we-gather`: `git stash`, curl each into `*-before.html`, `git stash pop`, curl each into `*-after.html`, `diff`. Expected: no diff beyond build hashes.

- [ ] **Step 5: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/giving/page.tsx src/app/\(public\)/what-to-expect/page.tsx src/app/\(public\)/how-we-gather/page.tsx
git commit -m "feat(studio): wire Giving, What-to-Expect, How-We-Gather through render-merge"
```

---

### Task 8: Wire Events, Letter, Stories pages

**Files:**
- Modify: `src/app/(public)/events/page.tsx`
- Modify: `src/app/(public)/letter/page.tsx`
- Modify: `src/app/(public)/stories/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.events`, `.letter`, `.stories` (Task 1); `events.*`, `letter.*`, `stories.*` keys (Task 2).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Events — add config fetch, wire sections, handle the conditional section**

`events/page.tsx`'s `EventsPage` is already `async` and already calls `getUpcoming()`/`getPast()`. Add the three imports, then extend its existing `Promise.all` (or add one if it awaits sequentially — read the file to confirm) to also fetch `getSiteTextMap()` and `getStudioConfig()`. Wrap into a `sections` record:

```tsx
  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the hardcoded headline with t["events.hero.headline1"] / <em>{t["events.hero.headline2"]}</em> */}
        {/* rest unchanged */}
      </section>
    ),
    upcoming: (
      <section /* ...existing wrapper, unchanged... */>
        {/* replace the empty-state hardcoded copy with {t["events.upcoming.empty"]} */}
        {/* rest (the live upcoming list) unchanged */}
      </section>
    ),
    "past-gatherings": past.length > 0 ? (
      /* the existing "Past gatherings" <section>...</section> JSX, byte-for-byte unchanged, now as a JSX expression instead of an `if` block */
    ) : null,
  };

  return (
    <>
      {renderMerge("events", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
```

(This mirrors the homepage's `story: story ? (...) : null` conditional pattern exactly — `past-gatherings` is a locked section, so `renderMerge` always marks it visible, but the section entry itself resolves to `null` when there is no past-event data, exactly as designed on the homepage.)

- [ ] **Step 2: Letter — add config fetch, wire sections**

`letter/page.tsx`'s `LetterIndexPage` is already `async`. Add the three imports and fetch `[letterRows, t, config]` (or however its existing `listPublishedEncouragements()` call is named) via `Promise.all`. Wrap into a `sections` record keyed `hero`, `issue-grid` (matching `SECTION_REGISTRY.letter`): replace the hero's hardcoded headline with `t["letter.hero.headline1"]` / `t["letter.hero.headline2"]`, and the issue-grid's empty-state copy with `t["letter.empty.body"]` — the rest of both sections (including the "The full archive" link inside `issue-grid`) stays unchanged. Render via `renderMerge("letter", config)`.

- [ ] **Step 3: Stories — add config fetch, wire sections**

`stories/page.tsx`'s `StoriesPage` is already `async`. Add the three imports and fetch `[storyRows, t, config]` via `Promise.all` alongside its existing `getStories()` call. Wrap into a `sections` record keyed `hero`, `stories-ledger`, `cta` (matching `SECTION_REGISTRY.stories`): replace the hero's hardcoded headline with `t["stories.hero.headline1"]` / `t["stories.hero.headline2"]`, the ledger's empty-state copy with `t["stories.empty.body"]`, and the closing CTA's title with `t["stories.cta.title"]` — everything else unchanged. Render via `renderMerge("stories", config)`.

- [ ] **Step 4: DOM-parity check for all three**

Run: `npm run dev`. For `/events`, `/letter`, `/stories`: `git stash`, curl each into `*-before.html`, `git stash pop`, curl each into `*-after.html`, `diff`. Expected: no diff beyond build hashes. Pay special attention to `/events` if the current dev database has zero past events — confirm the `past-gatherings` key is simply absent from `sections[s.id]` output in both before/after (i.e. `null` renders nothing, matching the pre-change `if` block emitting nothing).

- [ ] **Step 5: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(public\)/events/page.tsx src/app/\(public\)/letter/page.tsx src/app/\(public\)/stories/page.tsx
git commit -m "feat(studio): wire Events, Letter, Stories through render-merge"
```

---

### Task 9: Wire Resources page

**Files:**
- Modify: `src/app/(public)/resources/page.tsx`

**Interfaces:**
- Consumes: `SECTION_REGISTRY.resources` (Task 1, single locked `"browser"` section, no text keys).
- Produces: nothing new consumed downstream.

- [ ] **Step 1: Add config fetch and the trivial single-section wrap**

`resources/page.tsx` has no `<section>` boundaries — it delegates entirely to `<ResourcesBrowser sections={...} items={...} />`. Add the two imports (`getStudioConfig`, `renderMerge` — no `getSiteTextMap`, since this page gets no text keys) and, after its existing data fetch, wrap the return:

```tsx
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

export default async function ResourcesPage() {
  /* existing data fetch (sections, items via listSectionsAndResourcesForPublic()), unchanged */
  const config = await getStudioConfig();
  const merged = renderMerge("resources", config);
  const browserVisible = merged.find((s) => s.id === "browser")?.visible ?? true;

  return browserVisible ? <ResourcesBrowser sections={sections} items={items} /> : null;
}
```

Since `"browser"` is `locked: true` in `SECTION_REGISTRY.resources`, `renderMerge` always returns it `visible: true` regardless of config — the `browserVisible` check is here only for consistency with every other page's render-merge usage (guard rail 6 already guarantees the outcome; this is not a functional branch in practice, just the same pattern applied uniformly so a future registry change can't silently desync this page from the others).

- [ ] **Step 2: DOM-parity check**

Run: `npm run dev`. `git stash`, curl `/resources` into `resources-before.html`, `git stash pop`, curl into `resources-after.html`, `diff`. Expected: no diff beyond build hashes.

- [ ] **Step 3: Run gates**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/resources/page.tsx
git commit -m "feat(studio): wire Resources page through render-merge"
```

---

### Task 10: Full verification, live-fire, final review, ship

**Files:** none created; this task runs gates and drills across every file touched by Tasks 1-9.

- [ ] **Step 1: Full automated gate sweep**

Run, in order:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run check:contrast
```

Expected: all four PASS. `check:contrast` must still pass since no theme/contrast code was touched by this plan — a failure here would indicate an accidental import cycle or build break, not a real contrast regression.

- [ ] **Step 2: Full DOM-parity sweep (all 12 pages, empty config)**

With a clean `git stash` of the entire DS-2 branch against `main` (or by comparing against the `ee0399e` baseline checked out in a scratch dir), curl every governed route and diff:

```bash
for path in / /about /join /join?path=start /faq /contact /giving /what-to-expect /how-we-gather /events /letter /stories /resources; do
  echo "=== $path ==="
  curl -s "http://localhost:3000$path" | md5sum
done
```

Run this once against the pre-DS-2 baseline and once against the DS-2 branch (same dev server data, same moment — a live DB means an events/letter/stories page's dynamic content can differ between the two runs; if any hash differs, fetch both full bodies and diff them to confirm the only difference is dynamic content, not markup shape).

Expected: identical hashes for the pages with no time-sensitive dynamic content (about, join, faq, contact, giving, what-to-expect, how-we-gather, resources); events/letter/stories confirmed by content-diff (not hash) to differ only in DB-sourced content, never in section markup/order.

- [ ] **Step 3: LOOP drill on a second page (not the homepage)**

In `/admin/studio`, switch the page selector to **About**. Change its theme, hide the "Believe" section, edit `about.mission.body`. Confirm: preview reflects all three; Compare shows live ≠ draft; Apply lands them on `/about` within seconds (curl from a fresh terminal, no cookies). Then Discard/Restore back to the original About state and re-Apply, confirming About returns to its exact original HTML (curl diff against the Step 2 baseline hash).

Expected: all steps hold, proving the DS-1 engine generalizes to a second page with zero code changes to the engine itself.

- [ ] **Step 4: SAFETY drill on locked sections**

Attempt (via direct `saveDraftConfig` call in a scratch script, or by inspecting the Studio UI) to hide `events.upcoming` or `contact.form` or `letter.issue-grid`. Expected: the UI offers no hide control for locked rows (greyed per Task 3's reused DS-1 pattern), and even a hand-crafted config with `{ id: "form", visible: false }` for the `contact` page renders `renderMerge`'s forced-visible guarantee unchanged (this is existing `config.ts` logic, already unit-tested in DS-1 — confirm by reading `src/lib/studio/config.test.ts` for an existing "locked sections stay visible" case; if none exists generically (only homepage-specific), add one parametrized over `["contact", "form"]` and `["letter", "issue-grid"]` to `config.test.ts`).

- [ ] **Step 5: Dispatch final whole-branch review**

Run `scripts/review-package` (from the `subagent-driven-development` skill directory) against `MERGE_BASE=$(git merge-base main HEAD)` and `HEAD`, then dispatch a final code-reviewer subagent (most capable available model) with the printed package path plus this plan's Global Constraints section verbatim. Apply any Critical/Important findings as one consolidated fix wave (per the skill's guidance — one fix subagent, not one per finding), re-run Step 1's gate sweep after fixes.

- [ ] **Step 6: Ship**

Push the branch, open a PR (`gh pr create`), merge once checks pass, then live-verify against production exactly as DS-1 did: curl every one of the 12 governed routes on `acts2028sheepdogsociety.com`, confirm 200s, zero style-block/ribbon markers (draftMode is off in prod by default), and zero new runtime errors via the Vercel MCP tools. Update `CLAUDE.md`'s Design Studio bullet to say "DS-1 + DS-2 shipped" and list all 12 governed pages. Update `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md`'s shipped-callout and Build Order to mark DS-2 done, mirroring the DS-1 callout's format. Update `.superpowers/sdd/progress.md` (in the original checkout, not this worktree) and persistent memory (`project_sheepdog_society.md` + `MEMORY.md`) with a DS-2-shipped entry.

---

## Self-Review

**Spec coverage:** Every DS-2 Build Order bullet is covered — registries + text keys (Tasks 1-2), FAQ keyed Q&As handled per the spec's own carve-out (accordion is one locked section, not per-item keys — matches spec §"Section registries" literally: "the accordion is one section"), join reality handled per spec (hero locked incl. form, principles is the one governable section), page wiring (Tasks 4-9), page selector grows (Task 3). The site-text editor draft-safety change bullet was found already shipped in DS-1 (verified via `grep` on `src/server/site-text-admin.ts` before writing this plan) — no task needed; noted here so it is not silently dropped.

**Placeholder scan:** No TBD/TODO. Tasks 4-9 use `/* ...existing JSX, unchanged... */` comments only where the underlying JSX was already read verbatim earlier in this planning session and is mechanical relocation (proven safe by the homepage's identical Task 7 pattern in DS-1, which passed its DOM-parity bar) — every *new* line of code (imports, `sections` record skeletons, `renderMerge` calls, the exact text-key substitutions) is given in full, matching the "No Placeholders" rule's intent (no vague instructions, no invented APIs).

**Type consistency:** `SECTION_REGISTRY` ids in Task 1 match every `sections`/`pageSections` record key used in Tasks 4-9 exactly (cross-checked: about → hero/mission/foundation/leadership/believe/culture; join → hero/principles; faq → hero/questions/cta; contact → hero/form; giving → hero/why-we-give/ways-to-give/partners; what-to-expect → hero/rhythm/verse-plate/faq/cta; how-we-gather → hero/rhythms/guidelines/cta; events → hero/upcoming/past-gatherings; letter → hero/issue-grid; stories → hero/stories-ledger/cta; resources → browser). `SITE_TEXT_KEYS` keys in Task 2 match every `t["..."]` lookup introduced in Tasks 4-9 exactly. `saveDraftConfig`/`saveDraftText`/`applyDraft`/`discardDraft`/`restoreVersion`/`listVersions` signatures are declared unchanged from DS-1 in every task's Interfaces block — Task 3 is the only one that changes call *sites* (arguments), never signatures.
