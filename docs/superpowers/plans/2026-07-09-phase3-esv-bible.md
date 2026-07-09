# Phase 3: Public ESV Bible Reader (`/bible`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, stateless ESV Bible reader at `/bible` (landing) and `/bible/[book]/[chapter]` (the reading experience), wearing the broadsheet system but replicating BibleProject's measured reading anatomy: one serif reserved for the Word (Merriweather 18px / line-height 1.85 / ~660px measure), same-serif superscript verse numbers at 80% size / 75% opacity / non-interactive, ceremonial chapter headings, and a genre-grouped picker whose type-ahead IS the reference search. Our three upgrades over the benchmark: full dark mode, prev/next repeated at chapter end, and Crossway attribution at the end of every scroll.

**Architecture:** Task 1 builds the pure foundation in `src/lib/bible/books.ts` (66 books with slugs + 8 BibleProject genre groups, prev/next chapter math across book boundaries, a forgiving reference parser, and an ESV plain-text parser) under full Vitest coverage — no fetch imports, so the suite is hermetic. Task 2 adds the server fetch layer (`getESVChapterText` reader-tuned params in `esv.ts`, `getESVChapter` in `chapter.ts` with a WEB public-domain fallback + visible-notice flag), replaces the consumer-less `/api/public/bible` passage proxy with `/api/public/bible/search`, and `git rm`s the member-area relics — which MUST happen before Task 3, because the legacy `(app)/bible` page owns the `/bible` URL today (route groups don't namespace URLs; two pages at `/bible` is a build error). Task 3 ships the reader routes + scripture CSS utilities + the `#v16` scroll/highlight client, with a static reference label where the picker will sit. Task 4 builds the picker/type-ahead/search client and swaps it into both routes. Task 5 wires the masthead tab (splice-safe), sitemap, and CLAUDE.md. Task 6 is gates, controller browser smoke, and the PR.

**Tech Stack:** Next.js 16.1.6 (App Router), Tailwind v4 (`@utility` furniture), Merriweather via `next/font/google` (ALREADY loaded in `layout.tsx` as `--font-merriweather`, weights 300/400/700 — no font work needed), ESV API v3 (`ESV_API_KEY`), bible-api.com WEB fallback (no key), Vitest (`src/lib` only). **No new dependencies.**

**Sources of truth (read before implementing your task):**
- Spec §4 (REVISED, BibleProject anatomy): `docs/superpowers/specs/2026-07-08-site-elevation-design.md` — §§1–2 shipped in Phase 2; §4 is this phase.
- Measured anatomy: `.superpowers/sdd/phase2-design-study.md` → `# BIBLEPROJECT STUDY` section (esp. §1.2–1.7 and §2.8, the direct ESV-reader spec).
- Locked design system: `design-system/sheepdog-society/MASTER.md` (broadsheet furniture, `@utility` layering, dual-theme rules, Jeremy voice).
- Style exemplar + env facts: `docs/superpowers/plans/2026-07-08-phase2-ia-design-elevation.md` header (Phase 2 is fully merged as `718aa9a`; this plan targets current main).
- Current code facts (verified 2026-07-08, cite rather than re-derive): `src/lib/bible/esv.ts` has `getESVPassage` (24h revalidate, `include-verse-numbers: true` → plain text with inline `[N]` markers, `include-headings: false`) and `searchESV` (page-size 20). `src/lib/bible/index.ts` has the legacy multi-translation `getPassage`/`searchBible`/`BIBLE_BOOKS`. Legacy member UI: `src/app/(app)/bible/*` (reader + notes) and `/api/bible/{bookmarks,highlights,passage,search}` — retired here. `src/app/api/public/bible/route.ts` is a consumer-less passage proxy (grep-verified: zero callers) — replaced here.

**Code-completeness rule:** every task carries complete code. The ONE staged seam: Task 3 renders a static reference label in the reader header (exact markup given) that Task 4 replaces with `<BiblePicker>` via a byte-precise edit — so each task's commit builds and ships on its own. That is a staged interface with a grep anchor, not a placeholder.

**Prerequisite status (Drew):** `ESV_API_KEY` exists in Vercel **Production + Development but NOT Preview** (CLAUDE.md env note, verified 2026-07-08). Satisfied — Phase 3 is unblocked. Intended consequence: **Preview deploys serve the WEB fallback and the search-down state by design.** Do not "fix" this by adding the key to Preview without Drew's say-so.

## Global Constraints

- Repo root: `/Users/drewgodwin/sheepdogsociety`. Branch: `feat/bible-phase3` (already checked out, identical to main `718aa9a`). Package manager is **npm** (project override; NOT pnpm). The working tree has an unrelated unstaged edit to `.claude/launch.json` — never stage or commit it.
- TypeScript strict. No `any` without a justifying comment.
- Next 16 route params are async: `{ params }: { params: Promise<{ book: string; chapter: string }> }` then `await params`.
- **Server Components by default.** The ONLY client components in this phase: `BiblePicker` (Task 4) and `VerseScroll` (Task 3). Pages, scripture rendering, and prev/next nav are all server.
- **Any new CSS class MUST be `@utility` (or live in `@layer components`)** — unlayered author CSS beats Tailwind v4's cascade layers and kills stacked utility overrides (Phase 2 Task 1's load-bearing rule). All four new classes here (`scripture-body`, `verse-num`, `verse-anchor`, `verse-target`) are `@utility`.
- **Semantic tokens only** (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-foreground/10`, `bg-card`, `bg-popover`). Brass only per the Phase 2 grammar (borders, washes, hover accents; brass-colored TEXT would need `text-brass-deep` — this phase adds none). **This phase introduces NO new color tokens and NO new token pairs, so `scripts/check-contrast.mjs` needs no changes** — but if an implementer deviates and adds a pair, they MUST add it to the `PAIRS` array there. `npm run check:contrast` runs in the Task 6 gates either way.
- **Jeremy voice + banned words for ALL apparatus copy** (banned: delve, leverage, navigate, robust, tapestry, journey (noun), rise, reclaim, "real men", alpha, based, "toxic masculinity"; no em-dashes where commas work). **Scripture text itself is NEVER edited, reworded, or AI-generated — it renders verbatim from the API.** The one hardcoded verse (Acts 20:28 on the landing ember band) is marked VERBATIM ESV below; copy it byte-for-byte.
- **ESV attribution per Crossway on every reader page** — the full copyright notice at the end of the scroll (Task 3 Step 4 carries the exact text). Pages serving the WEB fallback show the public-domain line instead, plus the visible fallback notice up top.
- **Stateless.** No bookmarks, no notes, no highlights, no auth, no DB reads/writes anywhere in this phase. No migrations. The legacy `bible_*` tables stay untouched in the schema (spec non-goal: no schema deletion).
- **Motion: none.** The reader deliberately ships zero anime.js — the BibleProject study found near-zero motion is part of what reads as reverent (study §2.6). The only movement: the verse-anchor wash fade, `scrollIntoView` (instant under `prefers-reduced-motion`), and CSS hover states.
- **Browser verification is deferred to the controller (Task 6).** Implementers run `npx tsc --noEmit`, `npm test`, and the targeted curl checks in their task, and report honestly. Do not claim visual results you did not observe.
- Commits: one per task, exact messages given, `feat(bible)` / `fix(bible)` style.
- Known env facts (Phase 2 plan header, still true): local `next build` needs `DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run build` (a build-mode env file carries a dead Supabase-era var that breaks the pooled URL). Authenticated browser smoke (needed only for the admin-Gallery-tab-order check in Task 6) = ephemeral `AUTH_SECRET` + minted `authjs.session-token` JWE + seeded smoke admin on the Neon dev branch, exactly as Phase 1 Task 10 did (see `.superpowers/sdd/progress.md`).
- **Crossway terms (license context for the 24h cache):** as of the 2026-07-08 spec study, api.esv.org's non-commercial terms allow up to 500 verses per query (the longest chapter, Psalm 119, is 176 verses — every chapter fits in one query) and 5,000 requests/day per key, with the required copyright notice displayed and the text unaltered. The existing 24h `revalidate` is a short-term cache consistent with attributed non-commercial use. **Task 2 Step 5 re-verifies the live terms page and records the check in the commit body** (spec §4: "verify exact terms during implementation").

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/bible/books.ts` (create) | Pure data + math: 66 books (name/slug/chapters/genre/aliases), 8 genre groups, `getBookBySlug`, `booksByGenre`, `prevChapter`/`nextChapter`, `parseReference`, `referenceToUrl`, `parseESVChapterText`. Zero imports. |
| `src/lib/bible/books.test.ts` (create) | Vitest coverage with exact expected values (TDD — written first). |
| `src/lib/bible/esv.ts` (modify) | Add `getESVChapterText` (reader-tuned params, 24h revalidate). Existing `getESVPassage`/`searchESV` untouched. |
| `src/lib/bible/chapter.ts` (create) | `getESVChapter(bookSlug, chapter)` → typed `ChapterResult`; WEB fallback with `fallback: true` flag; throws only when BOTH providers fail. |
| `src/app/api/public/bible/route.ts` (delete) | Consumer-less multi-translation passage proxy; the reader is server-rendered, so no client passage API exists. Replaced by the search route. |
| `src/app/api/public/bible/search/route.ts` (create) | ESV keyword search for the picker (200 results / 400 short query / 503 no-key-or-down). Already public via the middleware `/api/public` rule. |
| `src/app/(app)/bible/**` (delete) | Member-area reader + notes pages — retired (they own the `/bible` URL; must go before Task 3). |
| `src/app/api/bible/**` (delete) | Member bookmarks/highlights/passage/search routes — retired. |
| `src/app/globals.css` (modify) | `@utility scripture-body`, `@utility verse-num`, `@utility verse-anchor`, `@utility verse-target`. Legacy `.font-scripture`/`.verse-number` stay (live consumers on `/`, `/join`, `/letter/[slug]`, `/events/[slug]`). |
| `src/components/bible/scripture.tsx` (create) | Server renderer: parsed paragraphs → `<p>` + verse spans with `id="v{N}"` anchors + superscript numbers. |
| `src/components/bible/verse-scroll.tsx` (create) | Client: `#v16` scroll + temporary highlight, hashchange-aware, reduced-motion safe. |
| `src/components/bible/bible-picker.tsx` (create) | Client (Task 4): reference pill → type-ahead input + genre-grouped panel + chapter grid + keyword search + recent searches. |
| `src/app/(public)/bible/page.tsx` (create) | Landing: hero + Acts 20:28 ember band (VERBATIM ESV) + 66 books by genre (server-rendered, JS-free discovery path). |
| `src/app/(public)/bible/[book]/[chapter]/page.tsx` (create) | The reading experience: apparatus header, ceremonial heading, scripture, end-of-chapter prev/next, attribution. `generateMetadata` + `notFound()`. |
| `src/middleware.ts` (modify) | `PUBLIC_ROUTES` gains `/^\/bible(\/.*)?$/` (Task 3 — see the flagged deviation note). |
| `src/components/public/public-nav.tsx` (modify) | Bible tab after The Letter; the `isAdmin` Gallery splice indices move 4→5 (Task 5). |
| `src/app/sitemap.ts` (modify) | `/bible` + 66 book entry points (justified depth — see Task 5). |
| `CLAUDE.md` (modify) | Routes, API, Key Patterns, env note (Task 5). |

**Not touched:** `src/app/robots.ts` (no `/bible` disallow needed — it allows `/` and blocks only `/admin`, `/api`, `/gallery`; correct as-is), `next.config.ts` (no legacy public `/bible` URLs exist — the old reader was login-gated, so there is nothing to redirect), `src/lib/bible/index.ts` + `api-bible.ts` (consumer-less after Task 2 but left dormant, matching the spec non-goal of not deleting deprecated member-area *library* code; the pages/routes deletion is the explicitly mandated exception), `scripts/check-contrast.mjs` (no new token pairs).

**Model rules (referenced by several tasks):**

- **Serif discipline (the system):** Merriweather (`--font-merriweather`) for scripture text and verse numbers ONLY. Inter (`.folio`, body utilities) for all apparatus — pickers, notices, nav, attribution. JetBrains Mono `.section-mark` for editorial marks. Cormorant (`font-pullquote`) only in the landing ember band. Never mix faces within a block.
- **Money values (from the study, non-negotiable):** scripture 1.125rem (18px) / line-height 1.85 / weight 300, measure `max-w-[41.25rem]` (660px), paragraph gap 1.125rem (one blank half-line, no indents); mobile drops to 1rem / 1.75 (study §1.7). Verse numbers: same serif, `0.8em`, `vertical-align: super`, `opacity: 0.75`, non-interactive (`pointer-events: none`, unselectable so copied text is clean scripture). Chapter heading: `display-soft` at `text-4xl` (36px) with `mt-22` (88px — the ceremonial air; Tailwind v4's dynamic spacing scale makes `mt-22` = 5.5rem).
- **Genre taxonomy (8 groups, sums to 66):** Torah (5), Historical (12), Wisdom (5), Major Prophets (5), Minor Prophets (12), Gospels (5 — Acts rides with the Gospels, Luke–Acts, matching BibleProject's eight eyebrows which have no ninth "Acts" group), Letters (21), Apocalypse (1).
- **Sharp corners:** the picker pill/panel/inputs are square (`rounded-none` inherited), deviating from BibleProject's 16px radius — the broadsheet brand supersedes benchmark chrome; the typography values are the money, not the border radius.
- **Verse anchors:** every numbered segment renders `<span id="v{N}" class="verse-anchor scroll-mt-28">` — the number inside is `aria-hidden` (pure visual apparatus; screen-reader flow stays unbroken scripture) and non-interactive, exactly like the benchmark. Deep links arrive from search results, the type-ahead ("john 3:16"), or hand-edited hashes.
- **No dropcap on scripture:** the `.dropcap` lede treatment is for editorial ledes (the landing hero uses the page's one). The Word renders unadorned — do not "improve" the reader's first paragraph with one.
- **One primary CTA per screen** stays the masthead "Join" — the reader adds no competing CTA.

---

### Task 1: Bible data + parsing module (pure, TDD)

**Files:**
- Create: `src/lib/bible/books.test.ts` (FIRST — red)
- Create: `src/lib/bible/books.ts` (then — green)

**Interfaces:**
- Consumes: nothing (zero imports — hermetic).
- Produces (later tasks import these exact names from `@/lib/bible/books`):
  - `GENRES` (readonly 8-tuple), `type Genre`, `interface BibleBook { name; slug; chapters; genre; aliases }`
  - `BOOKS: readonly BibleBook[]` (66, canon order), `getBookBySlug(slug)`, `booksByGenre()`
  - `prevChapter(slug, chapter)` / `nextChapter(slug, chapter)` → `ChapterRef | null`
  - `parseReference(input)` → `ParsedReference | null` where `ParsedReference = { book: BibleBook; chapter: number; verse?: number }` (the optional `verse` is a deliberate superset of the mandated `{book, chapter}`: it lets "john 3:16" land on the `#v16` anchor and lets search-result references reuse the same parser)
  - `referenceToUrl(reference)` → `"/bible/{slug}/{chapter}[#v{verse}]" | null`
  - `parseESVChapterText(raw)` → `ScriptureParagraph[]` where `ScriptureParagraph = { segments: VerseSegment[] }`, `VerseSegment = { verse: number | null; text: string }` (`verse: null` = untagged lead text, e.g. psalm superscriptions)
- **Module placement decision:** a NEW `books.ts`, not an extension of `index.ts`. `index.ts` is the legacy multi-translation façade (it imports `api-bible.ts` and goes consumer-less after Task 2's retirement); `books.ts` is pure data + math with zero imports, so Vitest never loads fetch code and the legacy file can be deleted in a later cleanup phase without touching the reader. `index.ts`'s `BIBLE_BOOKS` chapter counts were cross-checked and carried into `BOOKS`.
- **Parser simplification (documented):** the ESV text parser collapses line breaks WITHIN a paragraph to spaces, so poetry renders as flowed prose per stanza (ESV plain text separates stanzas with blank lines, which become paragraphs). Preserving poetry line breaks is a possible Phase 3.1 refinement; the test suite pins the current behavior exactly.

- [ ] **Step 1: Write the failing test suite — create `src/lib/bible/books.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  BOOKS,
  GENRES,
  booksByGenre,
  getBookBySlug,
  nextChapter,
  parseESVChapterText,
  parseReference,
  prevChapter,
  referenceToUrl,
} from "./books";

describe("BOOKS data", () => {
  it("has 66 books with unique slugs", () => {
    expect(BOOKS).toHaveLength(66);
    expect(new Set(BOOKS.map((b) => b.slug)).size).toBe(66);
  });

  it("totals 1,189 chapters", () => {
    expect(BOOKS.reduce((sum, b) => sum + b.chapters, 0)).toBe(1189);
  });

  it("runs Genesis to Revelation in canon order", () => {
    expect(BOOKS[0]).toMatchObject({ name: "Genesis", slug: "genesis", chapters: 50 });
    expect(BOOKS[18]).toMatchObject({ name: "Psalms", slug: "psalms", chapters: 150 });
    expect(BOOKS[65]).toMatchObject({ name: "Revelation", slug: "revelation", chapters: 22 });
  });

  it("slugs numbered and multi-word books", () => {
    expect(getBookBySlug("1-corinthians")).toMatchObject({ name: "1 Corinthians", chapters: 16 });
    expect(getBookBySlug("song-of-solomon")).toMatchObject({ name: "Song of Solomon", chapters: 8 });
    expect(getBookBySlug("nonsense")).toBeUndefined();
  });
});

describe("booksByGenre", () => {
  it("groups all 66 books into the 8 BibleProject genres, canon order", () => {
    const groups = booksByGenre();
    expect(groups.map((g) => g.genre)).toEqual([...GENRES]);
    expect(groups.map((g) => g.books.length)).toEqual([5, 12, 5, 5, 12, 5, 21, 1]);
  });

  it("keeps Acts with the Gospels (Luke-Acts, per the 8-eyebrow picker)", () => {
    const gospels = booksByGenre().find((g) => g.genre === "Gospels");
    expect(gospels?.books.map((b) => b.slug)).toEqual([
      "matthew",
      "mark",
      "luke",
      "john",
      "acts",
    ]);
  });

  it("puts Revelation alone under Apocalypse", () => {
    const apocalypse = booksByGenre().find((g) => g.genre === "Apocalypse");
    expect(apocalypse?.books.map((b) => b.name)).toEqual(["Revelation"]);
  });
});

describe("prevChapter / nextChapter", () => {
  it("walks within a book", () => {
    expect(nextChapter("genesis", 1)).toMatchObject({ book: { slug: "genesis" }, chapter: 2 });
    expect(prevChapter("genesis", 2)).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("crosses book boundaries", () => {
    expect(nextChapter("genesis", 50)).toMatchObject({ book: { slug: "exodus" }, chapter: 1 });
    expect(prevChapter("exodus", 1)).toMatchObject({ book: { slug: "genesis" }, chapter: 50 });
    expect(nextChapter("malachi", 4)).toMatchObject({ book: { slug: "matthew" }, chapter: 1 });
    expect(prevChapter("matthew", 1)).toMatchObject({ book: { slug: "malachi" }, chapter: 4 });
  });

  it("stops at the canon edges", () => {
    expect(prevChapter("genesis", 1)).toBeNull();
    expect(nextChapter("revelation", 22)).toBeNull();
  });

  it("returns null for unknown slugs", () => {
    expect(prevChapter("opinions", 1)).toBeNull();
    expect(nextChapter("opinions", 1)).toBeNull();
  });
});

describe("parseReference", () => {
  it("parses plain book + chapter", () => {
    expect(parseReference("john 3")).toMatchObject({ book: { slug: "john" }, chapter: 3 });
    expect(parseReference("Genesis 1")).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("parses abbreviations and squeezed forms", () => {
    expect(parseReference("1 cor 13")).toMatchObject({ book: { slug: "1-corinthians" }, chapter: 13 });
    expect(parseReference("1cor13")).toMatchObject({ book: { slug: "1-corinthians" }, chapter: 13 });
    expect(parseReference("ps23")).toMatchObject({ book: { slug: "psalms" }, chapter: 23 });
    expect(parseReference("Ps. 23")).toMatchObject({ book: { slug: "psalms" }, chapter: 23 });
    expect(parseReference("mt 5")).toMatchObject({ book: { slug: "matthew" }, chapter: 5 });
    expect(parseReference("1 kgs 8")).toMatchObject({ book: { slug: "1-kings" }, chapter: 8 });
    expect(parseReference("sos 2")).toMatchObject({ book: { slug: "song-of-solomon" }, chapter: 2 });
    expect(parseReference("jas 3")).toMatchObject({ book: { slug: "james" }, chapter: 3 });
    expect(parseReference("1 jn 4")).toMatchObject({ book: { slug: "1-john" }, chapter: 4 });
  });

  it("resolves conventional abbreviations where prefixes are ambiguous", () => {
    expect(parseReference("phil 2")).toMatchObject({ book: { slug: "philippians" }, chapter: 2 });
    expect(parseReference("phlm 1")).toMatchObject({ book: { slug: "philemon" }, chapter: 1 });
  });

  it("defaults to chapter 1 on a bare book", () => {
    expect(parseReference("john")).toMatchObject({ book: { slug: "john" }, chapter: 1 });
    expect(parseReference("jude")).toMatchObject({ book: { slug: "jude" }, chapter: 1 });
    expect(parseReference("gen")).toMatchObject({ book: { slug: "genesis" }, chapter: 1 });
  });

  it("captures a verse when given", () => {
    expect(parseReference("john 3:16")).toMatchObject({ book: { slug: "john" }, chapter: 3, verse: 16 });
    expect(parseReference("acts 20:28")).toMatchObject({ book: { slug: "acts" }, chapter: 20, verse: 28 });
    expect(parseReference("john 3 16")).toMatchObject({ chapter: 3, verse: 16 });
  });

  it("omits verse from the result when the input has none", () => {
    expect(parseReference("romans 8")).not.toHaveProperty("verse");
  });

  it("rejects out-of-range chapters", () => {
    expect(parseReference("john 22")).toBeNull(); // John has 21
    expect(parseReference("obadiah 2")).toBeNull(); // Obadiah has 1
    expect(parseReference("genesis 0")).toBeNull();
  });

  it("rejects ambiguous prefixes, unknown books, and junk", () => {
    expect(parseReference("ju 3")).toBeNull(); // Judges? Jude?
    expect(parseReference("xyz 3")).toBeNull();
    expect(parseReference("")).toBeNull();
    expect(parseReference("   ")).toBeNull();
    expect(parseReference("3")).toBeNull();
  });
});

describe("referenceToUrl", () => {
  it("builds reader URLs with verse anchors", () => {
    expect(referenceToUrl("John 3:16")).toBe("/bible/john/3#v16");
    expect(referenceToUrl("1 Corinthians 13:4")).toBe("/bible/1-corinthians/13#v4");
    expect(referenceToUrl("Song of Solomon 2:1")).toBe("/bible/song-of-solomon/2#v1");
  });

  it("omits the anchor without a verse", () => {
    expect(referenceToUrl("Romans 8")).toBe("/bible/romans/8");
  });

  it("returns null for unparseable references", () => {
    expect(referenceToUrl("The Shack 3:16")).toBeNull();
  });
});

describe("parseESVChapterText", () => {
  const GENESIS_1_OPENING = [
    "  [1] In the beginning, God created the heavens and the earth. [2] The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
    "",
    "  [3] And God said, “Let there be light,” and there was light. [4] And God saw that the light was good. And God separated the light from the darkness.",
  ].join("\n");

  it("splits blank-line paragraphs and inline [N] markers into segments", () => {
    const paragraphs = parseESVChapterText(GENESIS_1_OPENING);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].segments).toEqual([
      {
        verse: 1,
        text: "In the beginning, God created the heavens and the earth.",
      },
      {
        verse: 2,
        text: "The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
      },
    ]);
    expect(paragraphs[1].segments.map((s) => s.verse)).toEqual([3, 4]);
    expect(paragraphs[1].segments[0].text).toBe(
      "And God said, “Let there be light,” and there was light."
    );
  });

  const PSALM_23_OPENING = [
    "    A Psalm of David.",
    "",
    "  [1] The LORD is my shepherd; I shall not want.",
    "  [2] He makes me lie down in green pastures.",
    "He leads me beside still waters.",
    "  [3] He restores my soul.",
  ].join("\n");

  it("keeps untagged lead text (psalm superscriptions) as a verse-null segment", () => {
    const paragraphs = parseESVChapterText(PSALM_23_OPENING);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].segments).toEqual([{ verse: null, text: "A Psalm of David." }]);
  });

  it("collapses line breaks inside a stanza to spaces (documented poetry simplification)", () => {
    const paragraphs = parseESVChapterText(PSALM_23_OPENING);
    expect(paragraphs[1].segments).toEqual([
      { verse: 1, text: "The LORD is my shepherd; I shall not want." },
      { verse: 2, text: "He makes me lie down in green pastures. He leads me beside still waters." },
      { verse: 3, text: "He restores my soul." },
    ]);
  });

  it("strips a defensive trailing (ESV) tag", () => {
    expect(parseESVChapterText("[1] Jesus wept. (ESV)")).toEqual([
      { segments: [{ verse: 1, text: "Jesus wept." }] },
    ]);
  });

  it("returns [] for empty input", () => {
    expect(parseESVChapterText("")).toEqual([]);
    expect(parseESVChapterText("\n\n  \n")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail (RED)**

```bash
npx vitest run src/lib/bible/books.test.ts
```

Expected: the suite fails to resolve `./books` — that is the red state. Do not skip this run.

- [ ] **Step 3: Create `src/lib/bible/books.ts` (GREEN)**

```ts
/**
 * Canonical Bible book data + pure navigation/parsing math for the public
 * ESV reader (Phase 3). ZERO imports — Vitest covers this file fully and
 * hermetically (src/lib/bible/books.test.ts).
 *
 * The 8 genre groups mirror BibleProject's picker taxonomy (Drew's named
 * benchmark, phase2-design-study.md §1.4): Torah, Historical, Wisdom,
 * Major Prophets, Minor Prophets, Gospels, Letters, Apocalypse. Acts rides
 * with the Gospels (Luke-Acts) so the eight groups sum to 66 without a
 * ninth eyebrow, exactly like the benchmark's picker.
 */

export const GENRES = [
  "Torah",
  "Historical",
  "Wisdom",
  "Major Prophets",
  "Minor Prophets",
  "Gospels",
  "Letters",
  "Apocalypse",
] as const;

export type Genre = (typeof GENRES)[number];

export interface BibleBook {
  /** Canonical display name, e.g. "1 Corinthians". */
  name: string;
  /** URL segment, e.g. "1-corinthians". */
  slug: string;
  chapters: number;
  genre: Genre;
  /**
   * Normalized alternate spellings the reference parser accepts (lowercase,
   * no periods, single spaces). Unique-prefix matching on the name covers
   * most abbreviations ("gen", "1 cor", "song"); aliases exist only where
   * a prefix is ambiguous ("phil") or not derivable ("mt", "sos", "1 kgs").
   */
  aliases: string[];
}

export const BOOKS: readonly BibleBook[] = [
  // Torah
  { name: "Genesis", slug: "genesis", chapters: 50, genre: "Torah", aliases: ["gn"] },
  { name: "Exodus", slug: "exodus", chapters: 40, genre: "Torah", aliases: [] },
  { name: "Leviticus", slug: "leviticus", chapters: 27, genre: "Torah", aliases: ["lv"] },
  { name: "Numbers", slug: "numbers", chapters: 36, genre: "Torah", aliases: ["nm", "nb"] },
  { name: "Deuteronomy", slug: "deuteronomy", chapters: 34, genre: "Torah", aliases: ["dt"] },
  // Historical
  { name: "Joshua", slug: "joshua", chapters: 24, genre: "Historical", aliases: [] },
  { name: "Judges", slug: "judges", chapters: 21, genre: "Historical", aliases: ["jdg", "jdgs"] },
  { name: "Ruth", slug: "ruth", chapters: 4, genre: "Historical", aliases: [] },
  { name: "1 Samuel", slug: "1-samuel", chapters: 31, genre: "Historical", aliases: ["1 sm"] },
  { name: "2 Samuel", slug: "2-samuel", chapters: 24, genre: "Historical", aliases: ["2 sm"] },
  { name: "1 Kings", slug: "1-kings", chapters: 22, genre: "Historical", aliases: ["1 kgs"] },
  { name: "2 Kings", slug: "2-kings", chapters: 25, genre: "Historical", aliases: ["2 kgs"] },
  { name: "1 Chronicles", slug: "1-chronicles", chapters: 29, genre: "Historical", aliases: [] },
  { name: "2 Chronicles", slug: "2-chronicles", chapters: 36, genre: "Historical", aliases: [] },
  { name: "Ezra", slug: "ezra", chapters: 10, genre: "Historical", aliases: [] },
  { name: "Nehemiah", slug: "nehemiah", chapters: 13, genre: "Historical", aliases: [] },
  { name: "Esther", slug: "esther", chapters: 10, genre: "Historical", aliases: [] },
  // Wisdom
  { name: "Job", slug: "job", chapters: 42, genre: "Wisdom", aliases: [] },
  { name: "Psalms", slug: "psalms", chapters: 150, genre: "Wisdom", aliases: ["pss"] },
  { name: "Proverbs", slug: "proverbs", chapters: 31, genre: "Wisdom", aliases: ["prv"] },
  { name: "Ecclesiastes", slug: "ecclesiastes", chapters: 12, genre: "Wisdom", aliases: [] },
  {
    name: "Song of Solomon",
    slug: "song-of-solomon",
    chapters: 8,
    genre: "Wisdom",
    aliases: ["sos", "song of songs", "songs"],
  },
  // Major Prophets
  { name: "Isaiah", slug: "isaiah", chapters: 66, genre: "Major Prophets", aliases: [] },
  { name: "Jeremiah", slug: "jeremiah", chapters: 52, genre: "Major Prophets", aliases: [] },
  { name: "Lamentations", slug: "lamentations", chapters: 5, genre: "Major Prophets", aliases: [] },
  { name: "Ezekiel", slug: "ezekiel", chapters: 48, genre: "Major Prophets", aliases: ["ezk"] },
  { name: "Daniel", slug: "daniel", chapters: 12, genre: "Major Prophets", aliases: ["dn"] },
  // Minor Prophets
  { name: "Hosea", slug: "hosea", chapters: 14, genre: "Minor Prophets", aliases: [] },
  { name: "Joel", slug: "joel", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Amos", slug: "amos", chapters: 9, genre: "Minor Prophets", aliases: [] },
  { name: "Obadiah", slug: "obadiah", chapters: 1, genre: "Minor Prophets", aliases: [] },
  { name: "Jonah", slug: "jonah", chapters: 4, genre: "Minor Prophets", aliases: [] },
  { name: "Micah", slug: "micah", chapters: 7, genre: "Minor Prophets", aliases: [] },
  { name: "Nahum", slug: "nahum", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Habakkuk", slug: "habakkuk", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Zephaniah", slug: "zephaniah", chapters: 3, genre: "Minor Prophets", aliases: [] },
  { name: "Haggai", slug: "haggai", chapters: 2, genre: "Minor Prophets", aliases: [] },
  { name: "Zechariah", slug: "zechariah", chapters: 14, genre: "Minor Prophets", aliases: [] },
  { name: "Malachi", slug: "malachi", chapters: 4, genre: "Minor Prophets", aliases: [] },
  // Gospels (+ Acts, Luke-Acts — see the module comment)
  { name: "Matthew", slug: "matthew", chapters: 28, genre: "Gospels", aliases: ["mt"] },
  { name: "Mark", slug: "mark", chapters: 16, genre: "Gospels", aliases: ["mk", "mrk"] },
  { name: "Luke", slug: "luke", chapters: 24, genre: "Gospels", aliases: ["lk"] },
  { name: "John", slug: "john", chapters: 21, genre: "Gospels", aliases: ["jn", "jhn"] },
  { name: "Acts", slug: "acts", chapters: 28, genre: "Gospels", aliases: [] },
  // Letters
  { name: "Romans", slug: "romans", chapters: 16, genre: "Letters", aliases: ["rm"] },
  { name: "1 Corinthians", slug: "1-corinthians", chapters: 16, genre: "Letters", aliases: [] },
  { name: "2 Corinthians", slug: "2-corinthians", chapters: 13, genre: "Letters", aliases: [] },
  { name: "Galatians", slug: "galatians", chapters: 6, genre: "Letters", aliases: [] },
  { name: "Ephesians", slug: "ephesians", chapters: 6, genre: "Letters", aliases: [] },
  { name: "Philippians", slug: "philippians", chapters: 4, genre: "Letters", aliases: ["phil", "php"] },
  { name: "Colossians", slug: "colossians", chapters: 4, genre: "Letters", aliases: [] },
  { name: "1 Thessalonians", slug: "1-thessalonians", chapters: 5, genre: "Letters", aliases: [] },
  { name: "2 Thessalonians", slug: "2-thessalonians", chapters: 3, genre: "Letters", aliases: [] },
  { name: "1 Timothy", slug: "1-timothy", chapters: 6, genre: "Letters", aliases: [] },
  { name: "2 Timothy", slug: "2-timothy", chapters: 4, genre: "Letters", aliases: [] },
  { name: "Titus", slug: "titus", chapters: 3, genre: "Letters", aliases: [] },
  { name: "Philemon", slug: "philemon", chapters: 1, genre: "Letters", aliases: ["phlm", "phm"] },
  { name: "Hebrews", slug: "hebrews", chapters: 13, genre: "Letters", aliases: [] },
  { name: "James", slug: "james", chapters: 5, genre: "Letters", aliases: ["jas"] },
  { name: "1 Peter", slug: "1-peter", chapters: 5, genre: "Letters", aliases: ["1 pt"] },
  { name: "2 Peter", slug: "2-peter", chapters: 3, genre: "Letters", aliases: ["2 pt"] },
  { name: "1 John", slug: "1-john", chapters: 5, genre: "Letters", aliases: ["1 jn"] },
  { name: "2 John", slug: "2-john", chapters: 1, genre: "Letters", aliases: ["2 jn"] },
  { name: "3 John", slug: "3-john", chapters: 1, genre: "Letters", aliases: ["3 jn"] },
  { name: "Jude", slug: "jude", chapters: 1, genre: "Letters", aliases: [] },
  // Apocalypse
  { name: "Revelation", slug: "revelation", chapters: 22, genre: "Apocalypse", aliases: ["rv", "apocalypse"] },
];

const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));

export function getBookBySlug(slug: string): BibleBook | undefined {
  return BY_SLUG.get(slug);
}

/** The 8 genre groups in canon order, each with its books in canon order. */
export function booksByGenre(): { genre: Genre; books: BibleBook[] }[] {
  return GENRES.map((genre) => ({
    genre,
    books: BOOKS.filter((b) => b.genre === genre),
  }));
}

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

/** The chapter before {slug, chapter}, crossing book boundaries. Null at Genesis 1. */
export function prevChapter(slug: string, chapter: number): ChapterRef | null {
  const idx = BOOKS.findIndex((b) => b.slug === slug);
  if (idx === -1) return null;
  if (chapter > 1) return { book: BOOKS[idx], chapter: chapter - 1 };
  if (idx === 0) return null;
  const prev = BOOKS[idx - 1];
  return { book: prev, chapter: prev.chapters };
}

/** The chapter after {slug, chapter}, crossing book boundaries. Null at Revelation 22. */
export function nextChapter(slug: string, chapter: number): ChapterRef | null {
  const idx = BOOKS.findIndex((b) => b.slug === slug);
  if (idx === -1) return null;
  if (chapter < BOOKS[idx].chapters) return { book: BOOKS[idx], chapter: chapter + 1 };
  if (idx === BOOKS.length - 1) return null;
  return { book: BOOKS[idx + 1], chapter: 1 };
}

/* ------------------------------------------------------------------ */
/* Forgiving reference parser — the type-ahead IS the reference search  */
/* ------------------------------------------------------------------ */

export interface ParsedReference {
  book: BibleBook;
  chapter: number;
  /** Present when the input carried a verse ("john 3:16"). Not range-checked. */
  verse?: number;
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,;'’]/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// [123]? book-number, lazy letters, optional chapter, optional ":"- or
// space-separated verse, tolerated trailing junk ("john 3:16-17" arrives
// here as "john 3:16 17" after normalize).
const REF_RE = /^([123])?\s*([a-z][a-z ]*?)\s*(?:(\d+)(?:\s*:?\s*(\d+))?(?:\s.*)?)?$/;

function findBook(numPart: string | undefined, letters: string): BibleBook | null {
  const candidate = (numPart ? `${numPart} ` : "") + letters;
  const exact = BOOKS.find((b) => b.name.toLowerCase() === candidate);
  if (exact) return exact;
  const alias = BOOKS.find((b) => b.aliases.includes(candidate));
  if (alias) return alias;
  const prefixed = BOOKS.filter((b) => b.name.toLowerCase().startsWith(candidate));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/**
 * Forgiving reference parser: "john 3", "John 3:16", "1 cor 13", "1cor13",
 * "ps23", "Ps. 23", bare "gen" (chapter defaults to 1). Null on unknown or
 * ambiguous books and out-of-range chapters.
 */
export function parseReference(input: string): ParsedReference | null {
  const m = REF_RE.exec(normalize(input));
  if (!m) return null;
  const book = findBook(m[1], m[2]);
  if (!book) return null;
  const chapter = m[3] ? Number(m[3]) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;
  const verse = m[4] ? Number(m[4]) : undefined;
  return verse === undefined ? { book, chapter } : { book, chapter, verse };
}

/** "John 3:16" -> "/bible/john/3#v16"; null when unparseable. */
export function referenceToUrl(reference: string): string | null {
  const parsed = parseReference(reference);
  if (!parsed) return null;
  const anchor = parsed.verse ? `#v${parsed.verse}` : "";
  return `/bible/${parsed.book.slug}/${parsed.chapter}${anchor}`;
}

/* ------------------------------------------------------------------ */
/* ESV plain-text chapter parser                                        */
/* ------------------------------------------------------------------ */

export interface VerseSegment {
  /** null = untagged lead text (e.g. a psalm superscription). */
  verse: number | null;
  text: string;
}

export interface ScriptureParagraph {
  segments: VerseSegment[];
}

/**
 * Converts the ESV API's plain-text chapter (inline [N] verse markers,
 * blank-line paragraph breaks, indented poetry lines) into structured
 * paragraphs of verse segments for the superscript treatment.
 *
 * Documented simplification: line breaks WITHIN a paragraph collapse to
 * spaces, so poetry flows as prose per stanza (stanza breaks arrive as
 * blank lines and stay paragraphs). Pinned by books.test.ts.
 */
export function parseESVChapterText(raw: string): ScriptureParagraph[] {
  return raw
    .replace(/\s*\(ESV\)\s*$/, "") // defensive: reader params disable it
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const parts = block.split(/\[(\d+)\]\s*/);
      const segments: VerseSegment[] = [];
      const lead = parts[0].trim();
      if (lead) segments.push({ verse: null, text: lead });
      for (let i = 1; i < parts.length; i += 2) {
        const text = (parts[i + 1] ?? "").trim();
        if (text) segments.push({ verse: Number(parts[i]), text });
      }
      return { segments };
    })
    .filter((p) => p.segments.length > 0);
}
```

- [ ] **Step 4: Green + typecheck**

```bash
npx vitest run src/lib/bible/books.test.ts   # expected: all tests pass
npm test                                     # expected: recurrence + slug + books suites, all green
npx tsc --noEmit                             # expected: no errors
```

If a parser test fails, fix `books.ts` (never the expected values — they are the contract).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bible/books.ts src/lib/bible/books.test.ts
git commit -m "feat(bible): book data, genre groups, reference parser, ESV text parser (TDD)"
```

---

### Task 2: ESV chapter fetcher + caching + legacy retirement

**Files:**
- Modify: `src/lib/bible/esv.ts` (add one function; existing exports untouched)
- Create: `src/lib/bible/chapter.ts`
- Create: `src/app/api/public/bible/search/route.ts`
- Delete: `src/app/(app)/bible/` (4 files), `src/app/api/bible/` (4 routes), `src/app/api/public/bible/route.ts`

**Interfaces:**
- Consumes: `getBookBySlug`, `parseESVChapterText`, `referenceToUrl`, types (Task 1); existing `searchESV` (esv.ts).
- Produces:
  - `getESVChapterText(reference)` from `@/lib/bible/esv` — raw reader-tuned chapter text.
  - `getESVChapter(bookSlug, chapter)` + `interface ChapterResult { book; chapter; translation: "ESV" | "WEB"; fallback: boolean; paragraphs }` from `@/lib/bible/chapter` — returns `null` for unknown book / out-of-range chapter; throws only when BOTH ESV and WEB fail.
  - `GET /api/public/bible/search?q=` — `200 { results: [{ reference, content, url }] }` | `400` (q < 3 chars) | `503 { error: "search-unavailable" }` (no key or ESV down). Already public: middleware's `/^\/api\/public(\/.*)?$/` rule covers it.
- **Retirement decision (executed here, and it MUST precede Task 3):** the legacy `(app)/bible` reader owns the `/bible` URL (route groups don't affect paths) — building `(public)/bible` first would be a duplicate-route build error. The member routes (`/api/bible/*` — bookmarks/highlights/notes plumbing) violate the stateless mandate and have no public consumers. `/api/public/bible/route.ts` is **replaced, not kept**: grep-verified zero callers, it proxied arbitrary references across all translations (a wider surface than the reader needs), and the new reader renders server-side so no client passage API exists — the only client need is keyword search, which gets its own narrow route.
- The now consumer-less `src/lib/bible/index.ts` and `api-bible.ts` stay in the repo dormant (spec non-goal: deprecated member-area *library* code is a separate cleanup phase; the page/route deletions are this plan's explicitly mandated exception).

- [ ] **Step 1: Add the reader-tuned fetch to `src/lib/bible/esv.ts`**

Append after the closing brace of `getESVPassage` (before `searchESV`):

```ts
/**
 * Chapter text tuned for the public reader (Phase 3): verse markers in,
 * everything else out. The page renders its own heading and attribution,
 * so passage references and the inline "(ESV)" tag are disabled. The 24h
 * revalidate matches getESVPassage and stays within Crossway's terms for
 * attributed non-commercial use (re-verified at api.esv.org — see the
 * Phase 3 plan, Task 2 Step 5).
 */
export async function getESVChapterText(reference: string): Promise<string> {
  const apiKey = process.env.ESV_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ESV_API_KEY not configured");
  }

  const params = new URLSearchParams({
    q: reference,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "true",
    "include-short-copyright": "false",
    "include-passage-references": "false",
  });

  const res = await fetch(`${ESV_API_BASE}?${params}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!res.ok) {
    throw new Error(`ESV API error: ${res.status}`);
  }

  const data: ESVResponse = await res.json();
  const text = data.passages?.join("\n\n") ?? "";
  if (!text.trim()) {
    throw new Error(`ESV returned no passage for "${reference}"`);
  }
  return text;
}
```

(`ESV_API_BASE` and `ESVResponse` already exist at the top of the file — reuse them, do not redeclare.)

- [ ] **Step 2: Create `src/lib/bible/chapter.ts`**

```ts
import { getESVChapterText } from "./esv";
import {
  getBookBySlug,
  parseESVChapterText,
  type BibleBook,
  type ScriptureParagraph,
} from "./books";

export interface ChapterResult {
  book: BibleBook;
  chapter: number;
  translation: "ESV" | "WEB";
  /** true when ESV failed and the public-domain WEB text was served —
   *  the page shows a visible notice (spec §4 licensing/resilience). */
  fallback: boolean;
  paragraphs: ScriptureParagraph[];
}

/** WEB fallback via bible-api.com (public domain, no key, 24h cache). */
async function getWEBChapter(
  book: BibleBook,
  chapter: number
): Promise<ScriptureParagraph[]> {
  const res = await fetch(
    `https://bible-api.com/${encodeURIComponent(`${book.name} ${chapter}`)}?translation=web`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`bible-api.com error: ${res.status}`);
  const data = (await res.json()) as {
    verses?: { verse: number; text: string }[];
  };
  const segments = (data.verses ?? [])
    .map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() }))
    .filter((s) => s.text.length > 0);
  if (segments.length === 0) throw new Error("bible-api.com returned no verses");
  // bible-api.com carries no paragraph structure — one paragraph per chapter.
  return [{ segments }];
}

/**
 * One chapter for the public reader. Returns null for an unknown book slug
 * or an out-of-range chapter (routes turn that into notFound()). Falls back
 * to WEB with fallback:true when ESV fails for any reason (missing key,
 * non-200, empty passage). Throws only when BOTH providers fail — pages
 * catch that and render a calm unavailable state.
 */
export async function getESVChapter(
  bookSlug: string,
  chapter: number
): Promise<ChapterResult | null> {
  const book = getBookBySlug(bookSlug);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null;
  }

  try {
    const text = await getESVChapterText(`${book.name} ${chapter}`);
    return {
      book,
      chapter,
      translation: "ESV",
      fallback: false,
      paragraphs: parseESVChapterText(text),
    };
  } catch {
    const paragraphs = await getWEBChapter(book, chapter);
    return { book, chapter, translation: "WEB", fallback: true, paragraphs };
  }
}
```

- [ ] **Step 3: Create `src/app/api/public/bible/search/route.ts`**

```ts
import { NextResponse } from "next/server";
import { searchESV } from "@/lib/bible/esv";
import { referenceToUrl } from "@/lib/bible/books";

/**
 * ESV keyword search for the reader's picker panel. Public (middleware's
 * /api/public rule). ESV-only by design: no key or an ESV outage returns
 * 503 and the client shows the graceful "search is down" state — the
 * WEB fallback covers reading, not search (spec §4).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (q.length < 3) {
    return NextResponse.json(
      { error: "q must be at least 3 characters" },
      { status: 400 }
    );
  }
  if (!process.env.ESV_API_KEY?.trim()) {
    return NextResponse.json({ error: "search-unavailable" }, { status: 503 });
  }

  try {
    const { results } = await searchESV(q);
    return NextResponse.json({
      results: results.flatMap((r) => {
        const url = referenceToUrl(r.reference);
        return url ? [{ reference: r.reference, content: r.content, url }] : [];
      }),
    });
  } catch (error) {
    console.error("Bible search error:", error);
    return NextResponse.json({ error: "search-unavailable" }, { status: 503 });
  }
}
```

- [ ] **Step 4: Retire the member-area relics**

```bash
cd /Users/drewgodwin/sheepdogsociety
git rm -r "src/app/(app)/bible"
git rm -r src/app/api/bible
git rm src/app/api/public/bible/route.ts
```

Then verify nothing still references them:

```bash
grep -rn "api/bible/" src --include='*.ts' --include='*.tsx'
grep -rn "@/lib/bible\"" src --include='*.ts' --include='*.tsx'
```

Expected: BOTH greps return zero matches (the first drops with the deleted client; the second — imports of the legacy index barrel — had only the deleted files as consumers; the new code imports `@/lib/bible/books`, `@/lib/bible/chapter`, `@/lib/bible/esv` with subpaths).

- [ ] **Step 5: Crossway terms re-verification (spec §4 mandate)**

Load `https://api.esv.org/#conditions` (WebFetch or browser) and confirm: (a) a chapter query stays under the per-query verse cap, (b) short-term caching with attribution remains permitted for non-commercial use, (c) the required copyright notice matches the one hardcoded in Task 3 Step 4. Record one line in the commit body, e.g. `Crossway terms re-checked 2026-07-09: chapter queries + 24h cache + attribution compliant.` If anything changed materially, STOP and flag Drew before committing.

- [ ] **Step 6: Gates + commit**

```bash
npx tsc --noEmit   # expected: no errors
npm test           # expected: all green (nothing deleted had tests)
```

Note the intended mid-execution state: `/bible` now 404s inside the sign-in redirect (the legacy page is gone; the middleware rule and the new pages land in Task 3). That is fine — nothing links to `/bible` yet.

```bash
git add src/lib/bible/esv.ts src/lib/bible/chapter.ts src/app/api/public/bible/search/route.ts
git commit -m "feat(bible): ESV chapter fetcher with WEB fallback; retire member-area bible relics

Crossway terms re-checked <date>: chapter queries + 24h cache + attribution compliant.
Legacy (app)/bible pages, /api/bible/* member routes, and the consumer-less
/api/public/bible passage proxy removed; /api/public/bible/search replaces it."
```

(The `git rm`s from Step 4 are already staged; the `git add` picks up the rest.)

---

### Task 3: Reader routes — `/bible` and `/bible/[book]/[chapter]`

**Files:**
- Modify: `src/app/globals.css` (four `@utility` rules)
- Create: `src/components/bible/scripture.tsx`
- Create: `src/components/bible/verse-scroll.tsx`
- Create: `src/app/(public)/bible/page.tsx`
- Create: `src/app/(public)/bible/[book]/[chapter]/page.tsx`
- Modify: `src/middleware.ts` (one line — see the deviation note)

**Interfaces:**
- Consumes: Task 1 (`booksByGenre`, `getBookBySlug`, `prevChapter`, `nextChapter`, types), Task 2 (`getESVChapter`, `ChapterResult`), existing `Kicker` + `Icon` (`chevron-left`/`chevron-right` glyphs exist in `Icon.tsx` — verified).
- Produces: CSS utilities `scripture-body`, `verse-num`, `verse-anchor`, `verse-target`; components `Scripture({ paragraphs })`, `VerseScroll()`; the two public routes. The reader header contains a **static reference label** with the exact text `{/* Task 4 swaps this static label for <BiblePicker current=… /> */}` — Task 4 replaces it byte-precisely.
- **Flagged deviation from the task breakdown:** the middleware `PUBLIC_ROUTES` line was slated for Task 5 (wiring), but it lands HERE so this task's curl gates can hit the pages anonymously and the commit ships a working public route on its own. Task 5 re-verifies it. Deliberate, not scope creep.
- No `Reveal`/`StaggerReveal` anywhere in this task — the reader ships motionless (Model rules).

- [ ] **Step 1: Add the scripture utilities to `src/app/globals.css`**

Insert immediately after the closing brace of the `@utility link-editorial` block (around line 511):

```css
/* ---- Bible reader (Phase 3) ---------------------------------------- */

/* Scripture body — ONE serif reserved for the Word (Merriweather), 18px
   on a 1.85 leading at light weight, paragraphs spaced one half-line
   apart. The money values are BibleProject's measured anatomy
   (phase2-design-study.md §1.2); mobile drops to 16px/1.75 (§1.7).
   Color inherits the semantic foreground. NOT the legacy .font-scripture
   (17px/1.8 lede serif) — that class keeps its existing consumers. */
@utility scripture-body {
  font-family: var(--font-merriweather), Georgia, "Times New Roman", serif;
  font-size: 1.125rem;
  font-weight: 300;
  line-height: 1.85;
  & p + p {
    margin-top: 1.125rem;
  }
  @media (max-width: 40rem) {
    font-size: 1rem;
    line-height: 1.75;
  }
}

/* Verse number — same serif as the body (inherited), 80% size,
   superscript, 75% opacity, NON-interactive: present for reference,
   invisible while reading (the BibleProject recipe). pointer-events off
   and unselectable so copied text is clean scripture. line-height 0 keeps
   the superscript from stretching the 1.85 leading. */
@utility verse-num {
  font-size: 0.8em;
  line-height: 0;
  vertical-align: super;
  opacity: 0.75;
  margin-right: 0.125em;
  pointer-events: none;
  user-select: none;
}

/* Verse anchor — every numbered span carries this so the target wash can
   fade OUT when .verse-target is removed (the transition must live on
   the base class, not the state class). */
@utility verse-anchor {
  border-radius: 2px;
  transition:
    background-color 0.7s ease,
    box-shadow 0.7s ease;
}

/* Verse target — the brass wash while a #v16 deep link settles. Added and
   removed by VerseScroll. Decorative 18% alpha over the page background;
   text stays --foreground, so no new contrast pair (check-contrast
   unchanged — see Global Constraints). */
@utility verse-target {
  background-color: color-mix(in srgb, var(--color-brass) 18%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brass) 18%, transparent);
}
```

If the build rejects the nested `@media` inside `@utility` (Tailwind v4 supports nested at-rules; this is belt-and-braces), move ONLY the mobile override out to a plain rule wrapped in `@layer utilities { @media (max-width: 40rem) { .scripture-body { … } } }` and note it in the commit body.

- [ ] **Step 2: Create `src/components/bible/scripture.tsx`**

```tsx
import type { ScriptureParagraph } from "@/lib/bible/books";

/**
 * Renders parsed scripture paragraphs with superscript verse numbers and
 * #v{N} anchor ids. Server component. The text is API-verbatim — never
 * edited, never AI-generated (CLAUDE.md hard rule). Verse numbers are
 * aria-hidden visual apparatus (the reading flow stays unbroken scripture
 * for screen readers); anchors still serve deep links. Untagged lead
 * segments (psalm superscriptions) render italic, no number, no anchor.
 */
export function Scripture({ paragraphs }: { paragraphs: ScriptureParagraph[] }) {
  return (
    <div className="scripture-body">
      {paragraphs.map((paragraph, pi) => (
        <p key={pi}>
          {paragraph.segments.map((segment, si) =>
            segment.verse === null ? (
              <em key={si} className="text-muted-foreground">
                {segment.text}{" "}
              </em>
            ) : (
              <span
                key={si}
                id={`v${segment.verse}`}
                className="verse-anchor scroll-mt-28"
              >
                <span aria-hidden="true" className="verse-num">
                  {segment.verse}
                </span>
                {segment.text}{" "}
              </span>
            )
          )}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/bible/verse-scroll.tsx`**

```tsx
"use client";

import { useEffect } from "react";

/**
 * Scrolls to and briefly highlights the #v{N} verse anchor from the URL
 * hash (initial load AND hashchange, so picker/search jumps within the
 * same chapter still fire). Renders nothing. Reduced motion gets an
 * instant jump. Verse numbers themselves stay non-interactive — deep
 * links arrive from search results, the type-ahead, or a shared URL.
 */
export function VerseScroll() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let target: HTMLElement | null = null;

    function settle() {
      const match = /^#v(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const el = document.getElementById(`v${match[1]}`);
      if (!el) return;
      if (target && timer) {
        clearTimeout(timer);
        target.classList.remove("verse-target");
      }
      target = el;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      el.classList.add("verse-target");
      timer = setTimeout(() => el.classList.remove("verse-target"), 2400);
    }

    settle();
    window.addEventListener("hashchange", settle);
    return () => {
      window.removeEventListener("hashchange", settle);
      if (timer) clearTimeout(timer);
      if (target) target.classList.remove("verse-target");
    };
  }, []);

  return null;
}
```

- [ ] **Step 4: Create `src/app/(public)/bible/[book]/[chapter]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { Scripture } from "@/components/bible/scripture";
import { VerseScroll } from "@/components/bible/verse-scroll";
import { getESVChapter, type ChapterResult } from "@/lib/bible/chapter";
import { getBookBySlug, nextChapter, prevChapter } from "@/lib/bible/books";

// Per-path full-route cache, matching the 24h ESV data cache. No
// generateStaticParams: 1,189 chapters build on demand, not at deploy.
export const revalidate = 86400;

type Params = Promise<{ book: string; chapter: string }>;

function validate(bookSlug: string, chapterParam: string) {
  const book = getBookBySlug(bookSlug);
  const chapter = Number(chapterParam);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null;
  }
  return { book, chapter };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const valid = validate(bookSlug, chapterParam);
  if (!valid) return { title: "Bible — Sheepdog Society" };
  const { book, chapter } = valid;
  return {
    title: `${book.name} ${chapter} — ESV — Sheepdog Society`,
    description: `Read ${book.name} ${chapter} in the English Standard Version. Plain scripture, no clutter.`,
  };
}

export default async function BibleChapterPage({ params }: { params: Params }) {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const valid = validate(bookSlug, chapterParam);
  if (!valid) notFound();
  const { book, chapter } = valid;

  let result: ChapterResult | null = null;
  let unavailable = false;
  try {
    result = await getESVChapter(book.slug, chapter);
  } catch {
    // Both ESV and the WEB fallback failed — render the calm state below.
    unavailable = true;
  }
  if (!unavailable && !result) notFound();

  const prev = prevChapter(book.slug, chapter);
  const next = nextChapter(book.slug, chapter);
  const translationLabel =
    result?.translation === "WEB" ? "World English Bible" : "English Standard Version";

  const chevron = (
    ref: { book: { slug: string; name: string }; chapter: number } | null,
    dir: "prev" | "next"
  ) =>
    ref ? (
      <Link
        href={`/bible/${ref.book.slug}/${ref.chapter}`}
        aria-label={`${dir === "prev" ? "Previous" : "Next"} chapter: ${ref.book.name} ${ref.chapter}`}
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-foreground/15 text-foreground/70 transition-colors hover:border-brass hover:text-brass"
      >
        <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={16} />
      </Link>
    ) : (
      <span
        aria-hidden="true"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-foreground/10 text-foreground/20"
      >
        <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={16} />
      </span>
    );

  return (
    <>
      <VerseScroll />

      {/* Apparatus header — prev / reference / next. Scrolls away with the
          page; the site's slim nav is the only pinned chrome. */}
      <div className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-4">
          {chevron(prev, "prev")}
          {/* Task 4 swaps this static label for <BiblePicker current=… /> */}
          <span className="inline-flex h-11 w-full max-w-xl items-center justify-center border border-foreground/25 bg-card px-6 text-sm font-medium">
            {book.name} {chapter}
          </span>
          {chevron(next, "next")}
        </div>
      </div>

      {/* The reading surface — 660px measure, the study's money value
          (41.25rem = 660px; an arbitrary width, not a display-scale clamp,
          so it does not trip the Phase 2 front-page type exception). */}
      <article className="mx-auto w-full max-w-[41.25rem] px-6 pb-16 sm:px-4 md:px-0">
        <Kicker left="The Bible" right={translationLabel} className="mt-10" />

        {result?.fallback && (
          <p className="mt-6 border border-brass/40 bg-brass/10 px-4 py-3 text-sm">
            The ESV text is unavailable right now. You are reading the World
            English Bible, a public-domain translation, until it returns.
          </p>
        )}

        {/* Ceremonial chapter heading — 36px display-soft under 88px of
            air (mt-22 = 5.5rem; the study's h1 margin). */}
        <h1 className="display-soft mt-22 text-4xl">
          {book.name} {chapter}
        </h1>

        {unavailable ? (
          <p className="mt-8 text-lede leading-relaxed text-muted-foreground">
            We could not load this chapter. Give it a moment, then try again.
          </p>
        ) : (
          <div className="mt-8">
            <Scripture paragraphs={result?.paragraphs ?? []} />
          </div>
        )}

        {/* End-of-chapter prev/next — our upgrade over the benchmark (its
            one UX gap: nav only in the header). */}
        <nav aria-label="Chapter navigation" className="mt-16 grid grid-cols-2 border-y border-foreground/15">
          {prev ? (
            <Link
              href={`/bible/${prev.book.slug}/${prev.chapter}`}
              className="group flex min-h-14 cursor-pointer flex-col justify-center gap-1 border-r border-foreground/10 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="folio">Previous</span>
              <span className="text-sm font-medium transition-colors group-hover:text-brass">
                ← {prev.book.name} {prev.chapter}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" className="border-r border-foreground/10 px-4 py-3" />
          )}
          {next ? (
            <Link
              href={`/bible/${next.book.slug}/${next.chapter}`}
              className="group flex min-h-14 cursor-pointer flex-col items-end justify-center gap-1 px-4 py-3 text-right transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="folio">Next</span>
              <span className="text-sm font-medium transition-colors group-hover:text-brass">
                {next.book.name} {next.chapter} →
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" className="px-4 py-3" />
          )}
        </nav>

        {/* Attribution at the end of the scroll — required by Crossway on
            every reader page; WEB pages show the public-domain line. */}
        {!unavailable && (
          <footer className="mt-10 text-xs leading-relaxed text-muted-foreground">
            {result?.translation === "WEB" ? (
              <p>
                This chapter is shown from the World English Bible, which is in
                the public domain.
              </p>
            ) : (
              <p>
                Scripture quotations are from the ESV® Bible (The Holy Bible,
                English Standard Version®), copyright © 2001 by Crossway, a
                publishing ministry of Good News Publishers. Used by
                permission. All rights reserved. You may not copy or download
                more than 500 consecutive verses of the ESV Bible or more than
                one half of any book of the ESV Bible.{" "}
                <a
                  href="https://www.esv.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-editorial"
                >
                  esv.org
                </a>
              </p>
            )}
          </footer>
        )}
      </article>
    </>
  );
}
```

(The Crossway paragraph is the publisher's required notice — legal text, exempt from the em-dash/voice rules, copied byte-for-byte.)

- [ ] **Step 5: Create `src/app/(public)/bible/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Kicker } from "@/components/public/kicker";
import { booksByGenre } from "@/lib/bible/books";

export const metadata: Metadata = {
  title: "Bible — Sheepdog Society",
  description:
    "Read the Bible in the English Standard Version. Sixty-six books, plain text, no clutter.",
};

/**
 * Bible landing: hero, the shepherd's charge (featured chapter entry),
 * and all 66 books grouped by literary genre — a server-rendered,
 * JS-free discovery path. Task 4 adds the interactive picker to the hero.
 * No API calls here: the landing never depends on ESV uptime.
 */
export default function BibleLandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 md:px-10 md:pt-24">
        <Kicker left="The Bible" right="English Standard Version" />
        <h1 className="display-xl mt-8 max-w-4xl text-display-xl">
          Open the <em>Word</em>.
        </h1>
        <p className="dropcap mt-8 max-w-2xl text-lede leading-relaxed text-muted-foreground">
          The whole Bible, plain and unhurried. No account, no clutter,
          nothing between you and the text. Pick a book below, or jump
          straight to a chapter.
        </p>
      </section>

      {/* Featured chapter — the verse this society is named for.
          VERBATIM ESV (Acts 20:28) — do not reword a single character. */}
      <section className="ember-band mt-16 md:mt-24">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:px-10 md:py-24">
          <p className="section-mark">§ The shepherd&rsquo;s charge · Acts 20:28</p>
          <blockquote className="mt-8 font-pullquote text-2xl italic leading-relaxed md:text-3xl">
            &ldquo;Pay careful attention to yourselves and to all the flock,
            in which the Holy Spirit has made you overseers, to care for the
            church of God, which he obtained with his own blood.&rdquo;
          </blockquote>
          <p className="folio mt-6">English Standard Version</p>
          <Link
            href="/bible/acts/20#v28"
            className="link-editorial mt-8 inline-block text-sm"
          >
            Read Acts 20
          </Link>
        </div>
      </section>

      {/* All 66 books, grouped by genre (the picker's taxonomy, on the page). */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {booksByGenre().map(({ genre, books }) => (
          <div key={genre} className="mt-12 first:mt-0">
            <Kicker
              left={genre}
              right={`${books.length} ${books.length === 1 ? "book" : "books"}`}
            />
            <div className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
              {books.map((b) => (
                <Link
                  key={b.slug}
                  href={`/bible/${b.slug}/1`}
                  className="flex h-11 cursor-pointer items-center justify-between border-b border-foreground/10 px-1 text-sm transition-colors hover:bg-foreground/[0.03] hover:text-brass"
                >
                  <span>{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.chapters}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
```

- [ ] **Step 6: Make `/bible` public in `src/middleware.ts`** (the flagged deviation — see Interfaces)

In the `PUBLIC_ROUTES` array, insert after the line `  /^\/letter(\/.*)?$/,`:

```ts
  /^\/bible(\/.*)?$/,
```

- [ ] **Step 7: Gates**

```bash
npx tsc --noEmit    # expected: no errors
npm test            # expected: green
npm run dev
```

With the dev server up (requires `ESV_API_KEY` in `.env.local` — `grep -c '^ESV_API_KEY' .env.local` should print 1; if it is missing the pages still work via the WEB fallback, note which state you observed):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible                 # expected: 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/genesis/1       # expected: 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/revelation/22   # expected: 200
curl -s http://localhost:3000/bible/john/3 | grep -c 'id="v16"'                      # expected: 1 (or more)
curl -s http://localhost:3000/bible/john/3 | grep -c 'Crossway'                      # expected: 1 (ESV attribution; 0 + a WEB notice if keyless)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/john/22         # expected: 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/opinions/1      # expected: 404
curl -s http://localhost:3000/bible/genesis/1 | grep -c 'Exodus'                     # expected: 0 (Genesis 1 next is Genesis 2, prev disabled)
curl -s http://localhost:3000/bible/genesis/50 | grep -c 'Exodus 1'                  # expected: >= 1 (cross-book next)
```

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/components/bible/scripture.tsx src/components/bible/verse-scroll.tsx "src/app/(public)/bible" src/middleware.ts
git commit -m "feat(bible): public reader — /bible landing and /bible/[book]/[chapter]"
```

---

### Task 4: Picker + type-ahead + search (client)

**Files:**
- Create: `src/components/bible/bible-picker.tsx`
- Modify: `src/app/(public)/bible/[book]/[chapter]/page.tsx` (swap the static label)
- Modify: `src/app/(public)/bible/page.tsx` (add the hero picker)

**Interfaces:**
- Consumes: Task 1 (`BOOKS`, `booksByGenre`, `getBookBySlug`, `parseReference`, `type BibleBook`), Task 2's `GET /api/public/bible/search`, existing `Icon` (`search`, `chevron-down`, `arrow-right` glyphs exist — verified).
- Produces: `BiblePicker({ current?, variant? })` from `@/components/bible/bible-picker` — the ONLY sizable client component in this phase. `current = { bookSlug, chapter }` (reader mode, pill shows the reference); `variant = "hero"` (landing mode, larger pill labeled "Type a book and a chapter").
- Behavior contract (spec §4 + the study §1.4): the pill **becomes an input on click** AND opens the panel; the type-ahead live-parses references via `parseReference` (the picker IS the reference search); keyword search has **its own input in the same panel** (debounced 300ms, min 3 chars, results as reference links + match text with the matched term highlighted; 503 → graceful down-state); recent searches in localStorage capped at 8; Escape/arrows/Enter keyboard support; mobile-first panel (`w-[min(92vw,40rem)]`, 44px targets).
- **Spec reconciliation (documented):** spec §4's "Search" paragraph says "one input, auto-detected intent"; its REVISED anatomy bullet (which supersedes) says the keyword search "gets its own input in the same panel". This plan follows the REVISED anatomy — and intent auto-detection still holds: a reference typed into the main type-ahead routes to the passage, while the keyword box handles full-text. Not an oversight.

- [ ] **Step 1: Create `src/components/bible/bible-picker.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  BOOKS,
  booksByGenre,
  getBookBySlug,
  parseReference,
  type BibleBook,
} from "@/lib/bible/books";

interface SearchResult {
  reference: string;
  content: string;
  url: string;
}

interface BiblePickerProps {
  /** Reader mode: the pill shows the current reference. */
  current?: { bookSlug: string; chapter: number };
  /** "hero" renders the larger landing-page pill. */
  variant?: "reader" | "hero";
}

const RECENT_KEY = "sheepdog-bible-recent-searches";
const RECENT_CAP = 8;

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_CAP)
      : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string): string[] {
  const next = [q, ...loadRecent().filter((x) => x !== q)].slice(0, RECENT_CAP);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private mode: recents just do not persist.
  }
  return next;
}

/** Wraps the first case-insensitive occurrence of the query in a brass
 *  <mark> (spec §4: "match highlighting"). Decorative wash over the
 *  popover background — no new contrast pair. */
function highlightMatch(content: string, q: string) {
  const idx = q ? content.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (idx === -1) return content;
  return (
    <>
      {content.slice(0, idx)}
      <mark className="bg-brass/25 text-inherit">{content.slice(idx, idx + q.length)}</mark>
      {content.slice(idx + q.length)}
    </>
  );
}

/**
 * The reference pill that becomes a type-ahead input and opens the
 * genre-grouped picker panel (66 books -> chapter grid). The type-ahead
 * IS the reference search (BibleProject anatomy); keyword search gets its
 * own input in the same panel, hitting /api/public/bible/search. Recent
 * keyword searches live in localStorage (cap 8). Keyboard: Escape closes
 * (focus returns to the pill), ArrowUp/ArrowDown walk the options, Enter
 * activates. Square corners on purpose — broadsheet brand over benchmark
 * chrome.
 */
export function BiblePicker({ current, variant = "reader" }: BiblePickerProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeBook, setActiveBook] = useState<BibleBook | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "done" | "unavailable"
  >("idle");
  const [recent, setRecent] = useState<string[]>([]);

  const currentBook = current ? getBookBySlug(current.bookSlug) : undefined;
  const pillLabel =
    currentBook && current ? `${currentBook.name} ${current.chapter}` : "Find a passage";

  const parsed = useMemo(() => (query.trim() ? parseReference(query) : null), [query]);
  const bookMatches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (!q) return null;
    const hits = BOOKS.filter((b) => b.name.toLowerCase().startsWith(q));
    return hits.length > 0 ? hits : null;
  }, [query]);
  const groups = useMemo(() => booksByGenre(), []);

  // localStorage is browser-only — load recents when the panel opens.
  useEffect(() => {
    if (open) setRecent(loadRecent());
  }, [open]);

  // The pill became an input — focus it.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Outside click closes.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // closePanel is stable per render; the listener re-binds on open only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced keyword search (300ms), aborted on retype/unmount.
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setResults(null);
      setSearchState("idle");
      return;
    }
    setSearchState("loading");
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/bible/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (res.status === 503) {
          setResults(null);
          setSearchState("unavailable");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setSearchState("done");
        setRecent(saveRecent(q));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults(null);
          setSearchState("unavailable");
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  function closePanel() {
    setOpen(false);
    setQuery("");
    setActiveBook(null);
    setSearchQuery("");
    setResults(null);
    setSearchState("idle");
  }

  function go(url: string) {
    closePanel();
    router.push(url);
  }

  function onRootKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePanel();
      // The pill re-renders after close — focus it on the next tick.
      setTimeout(() => pillRef.current?.focus(), 0);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const options = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-picker-option]") ?? []
    );
    if (options.length === 0) return;
    e.preventDefault();
    const idx = options.indexOf(document.activeElement as HTMLElement);
    const nextIdx =
      e.key === "ArrowDown" ? Math.min(idx + 1, options.length - 1) : idx <= 0 ? -1 : idx - 1;
    if (nextIdx === -1) inputRef.current?.focus();
    else options[nextIdx]?.focus();
  }

  function bookButton(b: BibleBook) {
    return (
      <button
        key={b.slug}
        type="button"
        data-picker-option
        onClick={() => {
          setActiveBook(b);
          setQuery("");
        }}
        className="flex h-11 cursor-pointer items-center justify-between px-3 text-left text-sm transition-colors hover:bg-foreground/5 hover:text-brass"
      >
        <span>{b.name}</span>
        <span className="text-xs text-muted-foreground">{b.chapters}</span>
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKeyDown}
      className="relative w-full min-w-0 max-w-xl"
    >
      {!open ? (
        <button
          ref={pillRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={false}
          className={
            variant === "hero"
              ? "flex h-12 w-full cursor-pointer items-center justify-between gap-3 border border-foreground/25 bg-card px-5 text-base text-muted-foreground transition-colors hover:border-brass"
              : "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 border border-foreground/25 bg-card px-6 text-sm font-medium transition-colors hover:border-brass"
          }
        >
          <span>{variant === "hero" ? "Type a book and a chapter" : pillLabel}</span>
          <Icon
            name={variant === "hero" ? "search" : "chevron-down"}
            size={14}
            className="shrink-0 text-foreground/50"
          />
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveBook(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsed) {
              e.preventDefault();
              go(
                `/bible/${parsed.book.slug}/${parsed.chapter}${parsed.verse ? `#v${parsed.verse}` : ""}`
              );
            }
          }}
          placeholder="Type a book and a chapter"
          aria-label="Go to a book and chapter"
          className={`w-full border border-brass bg-background px-4 placeholder:text-muted-foreground focus:border-brass focus-visible:outline-none ${
            variant === "hero" ? "h-12 text-base" : "h-11 text-sm"
          }`}
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Find a passage"
          className="absolute left-1/2 top-full z-40 mt-2 max-h-[70vh] w-[min(92vw,40rem)] -translate-x-1/2 overflow-y-auto border border-foreground/15 bg-popover p-4 text-popover-foreground shadow-xl"
        >
          {/* Go-to row — the type-ahead IS the reference search. */}
          {parsed && (
            <button
              type="button"
              data-picker-option
              onClick={() =>
                go(
                  `/bible/${parsed.book.slug}/${parsed.chapter}${parsed.verse ? `#v${parsed.verse}` : ""}`
                )
              }
              className="mb-4 flex w-full cursor-pointer items-center justify-between border border-brass/50 bg-brass/10 px-4 py-3 text-left text-sm transition-colors hover:bg-brass/20"
            >
              <span>
                Go to{" "}
                <strong>
                  {parsed.book.name} {parsed.chapter}
                  {parsed.verse ? `:${parsed.verse}` : ""}
                </strong>
              </span>
              <Icon name="arrow-right" size={14} />
            </button>
          )}

          {activeBook ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-picker-option
                  onClick={() => setActiveBook(null)}
                  className="folio cursor-pointer py-2 transition-colors hover:text-brass"
                >
                  ← All books
                </button>
                <span className="text-sm font-medium">{activeBook.name}</span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-8">
                {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-picker-option
                    onClick={() => go(`/bible/${activeBook.slug}/${n}`)}
                    className="flex h-11 cursor-pointer items-center justify-center text-sm transition-colors hover:bg-foreground/5 hover:text-brass"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {bookMatches ? (
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {bookMatches.map((b) => bookButton(b))}
                </div>
              ) : (
                groups.map(({ genre, books }) => (
                  <div key={genre} className="mt-4 first:mt-0">
                    <p className="folio">{genre}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {books.map((b) => bookButton(b))}
                    </div>
                  </div>
                ))
              )}

              {/* Keyword search — its own input in the same panel. */}
              <div className="mt-6 border-t border-foreground/10 pt-4">
                <label htmlFor="bible-keyword-search" className="folio">
                  Search the Scriptures
                </label>
                <input
                  id="bible-keyword-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="A word or phrase, e.g. shepherd"
                  className="mt-2 h-11 w-full border border-foreground/25 bg-background px-4 text-sm placeholder:text-muted-foreground focus:border-brass focus-visible:outline-none"
                />

                {searchState === "loading" && (
                  <p className="mt-3 text-sm text-muted-foreground">Searching…</p>
                )}
                {searchState === "unavailable" && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Search is down right now. You can still open any book and
                    chapter above.
                  </p>
                )}
                {searchState === "done" && results && results.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No verses matched. Try another word.
                  </p>
                )}
                {results && results.length > 0 && (
                  <ul className="mt-3 divide-y divide-foreground/10 border-y border-foreground/15">
                    {results.map((r) => (
                      <li key={`${r.url}-${r.reference}`}>
                        <button
                          type="button"
                          data-picker-option
                          onClick={() => go(r.url)}
                          className="block w-full cursor-pointer px-2 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
                        >
                          <span className="folio">{r.reference}</span>
                          <span className="mt-1 block text-sm leading-relaxed">
                            {highlightMatch(r.content, searchQuery.trim())}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchState === "idle" && recent.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Recent</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recent.map((q) => (
                        <button
                          key={q}
                          type="button"
                          data-picker-option
                          onClick={() => setSearchQuery(q)}
                          className="cursor-pointer border border-foreground/15 px-3 py-1.5 text-xs transition-colors hover:border-brass hover:text-brass"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Swap the static label in the reader**

In `src/app/(public)/bible/[book]/[chapter]/page.tsx`, add to the imports:

```tsx
import { BiblePicker } from "@/components/bible/bible-picker";
```

Then replace exactly this block (the Task 3 seam):

```tsx
          {/* Task 4 swaps this static label for <BiblePicker current=… /> */}
          <span className="inline-flex h-11 w-full max-w-xl items-center justify-center border border-foreground/25 bg-card px-6 text-sm font-medium">
            {book.name} {chapter}
          </span>
```

with:

```tsx
          <BiblePicker current={{ bookSlug: book.slug, chapter }} />
```

- [ ] **Step 3: Add the hero picker to the landing**

In `src/app/(public)/bible/page.tsx`, add to the imports:

```tsx
import { BiblePicker } from "@/components/bible/bible-picker";
```

Then, in the hero section, insert immediately after the closing `</p>` of the dropcap lede paragraph:

```tsx
        <div className="mt-8">
          <BiblePicker variant="hero" />
        </div>
```

- [ ] **Step 4: Gates**

```bash
npx tsc --noEmit    # expected: no errors
npm test            # expected: green
npm run dev
curl -s "http://localhost:3000/api/public/bible/search?q=shepherd" | head -c 300
# expected: {"results":[{"reference":"...","content":"...","url":"/bible/..."} — or
# {"error":"search-unavailable"} + HTTP 503 if the local env lacks ESV_API_KEY (report which)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/public/bible/search?q=ab"
# expected: 400
curl -s http://localhost:3000/bible/john/3 | grep -c "John 3"
# expected: >= 1 (the picker pill server-renders its label)
```

Stop the dev server. Interactive flows (open/type/arrow/Escape/recents) are Task 6 controller work — do not claim them.

- [ ] **Step 5: Commit**

```bash
git add src/components/bible/bible-picker.tsx "src/app/(public)/bible/page.tsx" "src/app/(public)/bible/[book]/[chapter]/page.tsx"
git commit -m "feat(bible): reference picker, type-ahead, and scripture search"
```

---

### Task 5: Wiring — masthead tab, sitemap, docs

**Files:**
- Modify: `src/components/public/public-nav.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `BOOKS` (Task 1); the routes (Tasks 3–4).
- Produces: the Bible tab in the masthead (signed-out order: Home · Groups · Events · The Letter · **Bible** · Resources · About; admin order slots Gallery between Bible and Resources), sitemap coverage, updated docs. The middleware line already landed in Task 3 (flagged deviation) — Step 3 re-verifies it.
- `src/app/robots.ts` needs NO change: it allows `/` and disallows only `/admin`, `/api`, `/gallery` — `/bible` is crawlable as-is.

- [ ] **Step 1: Masthead Bible tab (splice-safe) in `src/components/public/public-nav.tsx`**

Two precise edits — the `isAdmin` Gallery splice indexes into `navLinks`, so BOTH the array and the slice indices must move together or the admin nav scrambles.

Edit 1 — in the `navLinks` array, replace:

```tsx
  { href: "/letter", label: "The Letter" },
  // Gallery is an admin tool (login-gated in middleware); it is spliced
  // in after The Letter for signed-in admins only — see `links` below.
  { href: "/resources", label: "Resources" },
```

with:

```tsx
  { href: "/letter", label: "The Letter" },
  { href: "/bible", label: "Bible" },
  // Gallery is an admin tool (login-gated in middleware); it is spliced
  // in after Bible for signed-in admins only — see `links` below.
  { href: "/resources", label: "Resources" },
```

Edit 2 — replace the `links` computation:

```tsx
  const links: NavLink[] = isAdmin
    ? [
        ...navLinks.slice(0, 4),
        { href: "/gallery", label: "Gallery" },
        ...navLinks.slice(4),
      ]
    : navLinks;
```

with:

```tsx
  // slice(0, 5) = Home, Groups, Events, The Letter, Bible — the Gallery
  // tab lands between Bible and Resources. These indices MUST move when
  // navLinks changes (Phase 3 moved them 4 -> 5 for the Bible tab).
  const links: NavLink[] = isAdmin
    ? [
        ...navLinks.slice(0, 5),
        { href: "/gallery", label: "Gallery" },
        ...navLinks.slice(5),
      ]
    : navLinks;
```

- [ ] **Step 2: Sitemap depth + entries in `src/app/sitemap.ts`**

**Depth decision (justified):** the landing plus each book's FIRST chapter — 67 URLs — NOT all 1,189 chapters. Two reasons: (1) API budget — every chapter page is an on-demand ESV fetch behind a 24h cache, and the non-commercial key allows 5,000 requests/day; a sitemap inviting Google, Bing, and every LLM crawler to sweep 1,189 URLs after each cache expiry spends the day's budget on bots (and Preview/keyless windows would hammer bible-api.com instead). (2) SEO reality — 1,189 near-identical scripture pages are thin-content bait against established Bible sites; our indexable value is the landing and 66 entry points. Crawlers still REACH every chapter through the prev/next links (fully crawlable, no `nofollow`); the sitemap just does not force-feed them.

Add the import after the existing imports:

```ts
import { BOOKS } from "@/lib/bible/books";
```

In the `staticRoutes` array, insert `"/bible",` after `"/letter/archive",`.

Then insert this block after the `staticRoutes` declaration (before the `groupRoutes` block) and add `...bibleRoutes,` to the returned array (after `...staticRoutes,`):

```ts
  // Bible: the landing plus each book's first chapter (67 URLs). NOT all
  // 1,189 chapters: each chapter is an on-demand ESV fetch (5,000/day key
  // budget) and a full-corpus sitemap is thin-content bait. Chapters stay
  // crawlable via prev/next links. Pure data — no try/catch needed.
  const bibleRoutes: MetadataRoute.Sitemap = BOOKS.map((b) => ({
    url: `${SITE}/bible/${b.slug}/1`,
    lastModified: now,
  }));
```

- [ ] **Step 3: Re-verify the middleware line (landed in Task 3)**

```bash
grep -n 'bible' src/middleware.ts
```

Expected: exactly one hit, the `/^\/bible(\/.*)?$/,` entry in `PUBLIC_ROUTES`. If missing, Task 3 was mis-executed — add it now (after the `/^\/letter(\/.*)?$/,` line) and say so in the commit body.

- [ ] **Step 4: Update `CLAUDE.md`**

1. `## Active Routes` → in the `**Public (`(public)`):**` line, insert `` `/bible`, `/bible/[book]/[chapter]`, `` immediately after `` `/letter/archive`, ``.

2. `## Active Routes` → in the `**API:**` line, append before the final period:

```md
, `/api/public/bible/search` (ESV keyword search; 503 without `ESV_API_KEY`). Legacy member `(app)/bible` pages + `/api/bible/*` routes removed 2026-07-09 (`src/lib/bible/index.ts`/`api-bible.ts` remain dormant, consumer-less)
```

3. `## Key Patterns` → add a bullet at the end of the list:

```md
- Bible reader: public + stateless at `/bible` (no bookmarks/notes/highlights). Pure data/parsers in `src/lib/bible/books.ts` (Vitest), fetch in `chapter.ts`: ESV 24h cache → WEB public-domain fallback with a visible notice. Scripture renders verbatim from the API — never edited, never AI-generated. Crossway attribution at the end of every reader page.
```

4. `## Required Env Vars` → replace the line `**Bible:** `ESV_API_KEY`, `API_BIBLE_KEY`` with:

```md
**Bible:** `ESV_API_KEY` (Prod+Dev only, NOT Preview — Preview deploys serve the WEB fallback and the search-down state by design), `API_BIBLE_KEY` (legacy, dormant)
```

- [ ] **Step 5: Gates + commit**

```bash
npx tsc --noEmit   # expected: no errors
npm run dev
curl -s http://localhost:3000/sitemap.xml | grep -c "/bible/"    # expected: 66
curl -s http://localhost:3000/sitemap.xml | grep -c "/bible<"    # expected: 1 (the landing)
curl -s http://localhost:3000/robots.txt                          # expected: unchanged — /bible NOT disallowed
```

Stop the dev server.

```bash
git add src/components/public/public-nav.tsx src/app/sitemap.ts CLAUDE.md
git commit -m "feat(bible): route wiring — masthead tab, sitemap entries, docs"
```

---

### Task 6: Full verification + PR

**Files:** none (fix-forward commits only, `fix(bible): …`).

This task is run BY THE CONTROLLER (browser access). Implementer subagents stop at Task 5.

- [ ] **Step 1: Static gates**

```bash
npm test                                       # expected: recurrence + slug + books suites, all green
npx tsc --noEmit                               # expected: no errors
npm run lint                                   # expected: no NEW errors (pre-existing tolerated warnings noted in Phases 1-2 stand)
npm run check:contrast                         # expected: all pairs OK both themes (this phase added no pairs)
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run build   # expected: production build succeeds (known env fact)
grep -rn "api/bible/" src --include='*.ts' --include='*.tsx'   # expected: zero hits
ls "src/app/(app)/bible" 2>/dev/null           # expected: No such file or directory
git status --short                             # expected: only the pre-existing .claude/launch.json line — never commit it
```

- [ ] **Step 2: Curl matrix** (dev server up, `ESV_API_KEY` present in `.env.local`)

```bash
for u in /bible /bible/genesis/1 /bible/revelation/22 /bible/john/3 /bible/psalms/119; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$u")"
done
# expected: all 200 (Psalm 119 = the 176-verse worst case, one ESV query)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/john/22        # 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/opinions/1     # 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/bible/john/abc       # 404
curl -s http://localhost:3000/bible/john/3 | grep -o "<title>[^<]*</title>"         # John 3 — ESV — Sheepdog Society
curl -s "http://localhost:3000/api/public/bible/search?q=shepherd" | head -c 200    # results with url fields
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/public/bible/search?q=ab"  # 400
```

- [ ] **Step 3: Browser smoke (controller, 1440×900 + 375×812, BOTH themes)**

1. **Reader typography measurements** on `/bible/john/3` (desktop, light): computed styles on a scripture `<p>` — `font-family` contains Merriweather; `font-size` 18px; `line-height` 33.3px (±0.5); the article container measures ≤ 660px. On a `.verse-num` span: `font-size` 14.4px, `opacity` 0.75, `vertical-align` super, SAME Merriweather family. Chapter H1: Fraunces (display-soft), 36px, ~88px top margin. Apparatus (kicker, notices, attribution) renders Inter — no serif leakage.
2. **Verse numbers non-interactive:** hover a verse number — no pointer cursor, no underline; clicking does nothing; selecting a passage and copying yields clean text without the numbers.
3. **Anchor scroll + highlight:** load `/bible/john/3#v16` — v16 scrolls to center and takes a brass wash that fades away in ~2.4s. Change the hash to `#v1` in the address bar — it re-fires (hashchange path).
4. **Picker flows:** open the pill — it becomes a focused input, placeholder "Type a book and a chapter"; the panel shows exactly 8 genre eyebrows in order Torah → Apocalypse. Type `1 cor 13` → "Go to 1 Corinthians 13" row → Enter lands `/bible/1-corinthians/13`. Type `ps23` → Psalms 23. Click Genesis → 50-cell chapter grid (cells ≥ 44px) → 3 → `/bible/genesis/3`. Back in the panel, keyword-search `shepherd` → results as reference + snippet with the matched word marked in a brass wash; click one → navigates with `#v` anchor + highlight. Reopen the panel → "Recent" shows `shepherd`. Run 9 distinct searches → recents cap at 8. Escape closes and refocuses the pill; ArrowDown/ArrowUp walk the options from the input.
5. **Prev/next boundaries (header AND chapter end):** `/bible/genesis/1` — prev disabled/absent in both places, next → Genesis 2. `/bible/genesis/50` — next → Exodus 1. `/bible/matthew/1` — prev → Malachi 4. `/bible/revelation/22` — next disabled/absent in both places.
6. **ESV attribution:** the Crossway paragraph renders at the end of the scroll on every sampled chapter (John 3, Genesis 1, Psalm 23, Revelation 22); the landing has none (it fetches nothing).
7. **WEB fallback:** comment `ESV_API_KEY` out of `.env.local`, restart dev — `/bible/john/3` shows the fallback notice, WEB text, kicker reads "World English Bible", attribution shows the public-domain line; the picker's search shows the down-state (503). RESTORE the key and restart before continuing.
8. **Dark theme:** `/bible` and a reader page — surfaces flip via semantic tokens, ember band identical in both themes, verse wash visible in dark, no pinned-light blocks, no dark-on-dark text.
9. **Mobile 375:** no horizontal scroll on landing or reader; scripture drops to 16px/1.75; picker panel ≤ 92vw with 44px targets; the Bible tab appears in the masthead slide-down panel.
10. **Nav order:** signed OUT — Home · Groups · Events · The Letter · Bible · Resources · About. Signed IN (mint the session per the Phase 1 Task 10 method) — Gallery sits between Bible and Resources on desktop AND mobile.
11. **Reduced motion:** with `prefers-reduced-motion: reduce`, the `#v16` jump is instant (no smooth scroll); nothing else on the surface animates.
12. **Keyboard + console:** tab through the reader header — 2px brass focus ring visible both themes; console clean on every page above.

Fix-forward anything that fails, re-run the relevant gate, and record fixes as `fix(bible): …` commits.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/bible-phase3
gh pr create --title "Phase 3: public ESV Bible reader (/bible)" --body "$(cat <<'EOF'
## Summary
- Public, stateless ESV reader at /bible + /bible/[book]/[chapter]: BibleProject-measured reading anatomy (Merriweather 18px / 1.85 leading / 660px measure, same-serif superscript verse numbers at 80% size / 75% opacity, non-interactive; ceremonial 88px chapter headings) on the broadsheet system
- Genre-grouped picker (8 groups, 66 books) whose type-ahead IS the reference search ("john 3", "1 cor 13", "ps23"), plus ESV keyword search with localStorage recents (cap 8) via a new /api/public/bible/search route
- Upgrades over the benchmark: full dark mode, prev/next repeated at chapter end (crosses book boundaries: Genesis 1 stops, Genesis 50 -> Exodus 1, Revelation 22 stops), #v16 anchors that scroll + highlight, Crossway attribution at every scroll end
- Resilience: ESV 24h cache; WEB public-domain fallback with a visible notice when ESV is down (Preview deploys run fallback by design — no ESV_API_KEY there); scripture always verbatim from the API
- Retired the member-area relics: (app)/bible pages, /api/bible/* routes, and the consumer-less /api/public/bible passage proxy; sitemap adds the landing + 66 book entry points (deliberately not all 1,189 chapters — API budget + thin-content)

## Verification
- npm test (books/parser TDD suite) / tsc --noEmit / lint / check:contrast / production build: green
- Curl matrix: reader 200s incl. Psalm 119, bad book/chapter/non-numeric 404, search 200/400/503 states, sitemap depth 1+66
- Controller browser smoke: computed-style typography checks, anchor scroll + highlight, picker/type-ahead/search/recents flows, boundary prev/next, WEB fallback drill, dark + 375px, attribution on every chapter

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Post-deploy check**

After the Vercel deploy: `curl -s -o /dev/null -w "%{http_code}\n" https://www.acts2028sheepdogsociety.com/bible` → 200; spot-check `/bible/john/3#v16` scrolls + highlights in a real browser; confirm the ESV attribution renders in production (the key exists there); `/sitemap.xml` contains the 67 bible URLs.
