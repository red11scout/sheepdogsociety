# Phase 2: IA + Design Elevation (Broadsheet Editorial) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One conversion path (discover → find a group → show up) on canonical URLs (`/groups`, `/letter`, `/join`, all old URLs 308), wearing the broadsheet-editorial system from Drew's prototype: Fraunces display type, three-row masthead with mirrored crests, kicker rows, ruled ledgers, paper-cards, one ember-band per long page, true dual-theme, and anime.js v4 scroll reveals.

**Architecture:** Task 1 rebuilds the typographic/token foundation in `globals.css` + `layout.tsx` (Fraunces variable axes, folio/dropcap/paper-card/ember-band furniture as `@utility` rules in Tailwind's utilities layer, dark-variant brand constants). Task 2 adds two client motion primitives (anime.js v4). Task 3 rebuilds the shared chrome (masthead/nav/footer). Tasks 4–6 do the IA moves (locations→groups with a slug migration, encouragements→letter URL flip, four join entry points→one `/join`), each carrying its own 308 redirects in `next.config.ts`. Tasks 7–9 rebuild the money pages (home, events, letter/stories) on the new furniture. Task 10 sweeps the secondary pages by checklist, plus a dark-mode token pass on resources/gallery/auth. Task 11 is the SEO/redirect/contrast audit (new `sitemap.ts`/`robots.ts` + a WCAG math script) and flips the theme default to `system` — deliberately AFTER the sweep, so dark-OS visitors never default onto half-swept pages mid-execution. Task 12 is gates, controller browser smoke, docs, PR.

**Tech Stack:** Next.js 16.1.6 (App Router), Tailwind v4 (`@theme inline` tokens), next-themes, `next/font/google` (Fraunces variable + Inter + Merriweather + Cormorant Garamond + JetBrains Mono), anime.js v4 (new), Drizzle ORM 0.45 + Neon Postgres, Vitest (`src/lib` only), Mapbox GL (existing `LocationMap`).

**Sources of truth (read before implementing your task):**
- Spec §1–2: `docs/superpowers/specs/2026-07-08-site-elevation-design.md` (Section 4 Bible is Phase 3 — NOT here; no `/bible` nav tab in this phase)
- Locked design system: `design-system/sheepdog-society/MASTER.md`
- Line-level recon of every file touched: `.superpowers/sdd/phase2-recon.md` (predates the gallery-tab hotfix `fe6b053` — for `src/components/public/public-nav.tsx` and the two public events pages, trust the live file, not the recon)
- Prototype + BibleProject computed values: `.superpowers/sdd/phase2-design-study.md`

**Code-completeness rule (documented deviations):** Tasks 1–4 and 6–8 carry complete code, exactly like the Phase 1 plan. Task 5 is a move-by-reference: it copies two live files whole and applies byte-precise enumerated edits — inlining 127/230 lines of otherwise-unchanged code would drift from live copy, the same justification as the sweep. Tasks 9–10 are elevation/sweep passes over mostly-static content pages: they carry complete code for every NEW file plus precise per-page transformation checklists with exact before→after anchors from the recon, instead of full re-listings of ~1,800 lines of existing JSX. Nothing in Tasks 5, 9, or 10 requires design judgment — every substitution is enumerated.

**Intended admin-visible side effects (so nobody "fixes" them):** (1) Fraunces replaces Barlow in admin headings too — `.display-xl`/`.brand-wordmark` are shared classes (Task 1). (2) The icon default stroke drops 2.25 → 1.75 everywhere, admin included (Task 10). (3) Moving the furniture classes into Tailwind's `utilities` cascade layer makes stacked color overrides like `section-mark text-iron/40` — silently dead today — actually apply, in admin as well as public (Task 1 Step 4). All three are deliberate.

## Global Constraints

- Repo root: `/Users/drewgodwin/sheepdogsociety`. Branch: `feat/site-elevation-phase2` (already checked out, based on `f7c3de8`). Package manager is **npm** (project override; NOT pnpm).
- TypeScript strict. No `any` without a justifying comment.
- Next 16 route params/searchParams are async: `{ params }: { params: Promise<{ slug: string }> }` then `await params`.
- Migrations: hand-numbered SQL in `drizzle/` (next is **0015**), additive, `IF NOT EXISTS` everywhere, re-run safe. Apply with `node scripts/apply-neon-migration.mjs` (env from `.env.local`; use `DATABASE_URL_UNPOOLED` if the pooler trips its circuit breaker, as happened in Phase 1 Task 2). **NEVER `drizzle-kit push`.** The GitHub Action (`.github/workflows/apply-migrations.yml`, `DATABASE_URL_PRODUCTION` secret is set) re-applies on push to main; every statement must tolerate re-runs.
- **Jeremy voice + banned words for ALL public copy.** Banned: delve, leverage, navigate, robust, tapestry, journey (noun), rise, reclaim, "real men", alpha, based, "toxic masculinity". **No em-dashes where commas work.** Copy blocks marked PRESERVE are verbatim from the live site (recon-verified) and must not be reworded.
- **anime.js v4 only.** v3 syntax silently no-ops. Named imports from `"animejs"`; target is the FIRST positional arg; `ease: "outQuad"` (no `ease` prefix); callbacks `onBegin`/`onComplete`; `utils.set` for instant states; `createScope({ root }).add(...)` + `scope.revert()` in React cleanup; `onScroll()` for scroll triggers. All motion transform/opacity only, ≤450ms, `prefers-reduced-motion` guarded.
- **Admin-only Gallery nav.** `/gallery` stays login-gated; the Gallery tab renders only for a signed-in admin via the client session-probe pattern already live in `public-nav.tsx` (added in `fe6b053`, AFTER the recon). Carry that exact pattern into the new masthead. No public Gallery tab, ever.
- **Both themes AA.** Body text 4.5:1, large display 3:1, verified programmatically in Task 11 (`scripts/check-contrast.mjs`) in BOTH themes. Small text is never raw brass; `.section-mark`/kickers use `--color-brass-deep`; brass fills pair with `text-iron` (constant), never `text-ink` (theme-flipping after Task 1).
- Server Components by default; **`"use client"` only for masthead nav interactivity + motion components** — plus the pre-existing client form components this plan reuses or extracts (`MemberSignup`, `NewsletterForm`, `LocationMap`, contact page) and the two new interactive extractions (`GroupsBrowser`, `GroupInterestForm`, `PlantRequestForm`). Pages themselves stay server components.
- Commits: conventional style matching history, `feat(scope)`/`fix(scope)`/`docs:`, one commit per task, exact messages given per task.
- **Browser verification is deferred to the controller (Task 12).** Implementers run `npx tsc --noEmit`, `npm test`, and the targeted checks listed in their task, and report honestly. Do not claim visual results you did not observe.
- Known env facts (Task 12 uses these; do not re-derive): local `next build` needs `DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run build` (a build-mode env file carries a dead Supabase-era var that breaks the pooled URL in build). Authenticated browser smoke = ephemeral `AUTH_SECRET` + minted `authjs.session-token` JWE + seeded smoke admin on the Neon dev branch, exactly as Phase 1 Task 10 did (see `.superpowers/sdd/progress.md`, Task 10 entries).

## File Structure

| File | Responsibility |
|---|---|
| `src/app/layout.tsx` (modify) | Fraunces variable font in, Barlow Condensed out (Task 1); `defaultTheme="system"` lands in Task 11, AFTER the sweep, so dark-OS visitors never default onto half-swept pages. |
| `src/app/globals.css` (modify) | Broadsheet utilities (`.folio`, `.dropcap`, `.paper-card`, `.ember-band`, `.link-editorial`), Fraunces `.display-xl`/`.display-soft`/`.brand-wordmark`, fluid type tokens, dual-theme brand constants, focus-visible ring, `.lift` retune. |
| `src/components/public/kicker.tsx` (create) | `<Kicker left right?>` folio–hairline–folio row (server component). |
| `src/components/motion/Reveal.tsx` (create) | anime.js v4 scroll-triggered fade-up (client). |
| `src/components/motion/StaggerReveal.tsx` (create) | anime.js v4 staggered children reveal (client). |
| `src/components/public/public-nav.tsx` (rewrite) | Three-row broadsheet masthead + slim sticky nav + mobile collapse; admin-only Gallery tab preserved. |
| `src/components/public/public-footer.tsx` (rewrite) | Crest bookend footer, canonical hrefs, semantic tokens. |
| `src/components/public/newsletter-form.tsx` (modify) | Render the error state; brass button text fix. |
| `src/components/motion/ScriptureMarquee.tsx` (modify) | Em-dash fix ("Romans 5:3-4"). |
| `drizzle/0015_locations_slug.sql` (create) | Additive `locations.slug` + backfill + partial unique index. |
| `src/db/schema.ts` (modify) | `slug` column + unique index on `locations`. |
| `src/lib/locations/slug.ts` (create) | Pure `locationSlug(name, city)` helper. |
| `src/lib/locations/slug.test.ts` (create) | Vitest coverage for the helper. |
| `src/server/admin-groups-locations.ts` (modify) | Slug on insert (deduped); `revalidatePath("/locations")` → `"/groups"`. |
| `src/app/api/admin/locations/route.ts` (modify) | The repo's OTHER `db.insert(locations)` path — same slug dedupe so no slug-less rows are ever created. |
| `src/app/api/public/locations/route.ts` (modify) | Add `slug` to the public pin payload. |
| `src/components/map/location-map.tsx` (modify) | `slug` on `LocationPin`, popup href → `/groups/…`, popup font vars → Fraunces. |
| `src/components/public/groups-browser.tsx` (create) | Client search/day-filter + map + ruled ledger list. |
| `src/components/public/group-interest-form.tsx` (create) | Client interest form (extracted, copy preserved). |
| `src/app/(public)/groups/page.tsx` (rewrite) | Server-rendered canonical groups index (was a redirect shim). |
| `src/app/(public)/groups/[slug]/page.tsx` (rewrite) | Server-rendered group detail, slug-or-uuid lookup (was a shim). |
| `src/app/(public)/locations/*` (delete) | All three pages retired; 308s in `next.config.ts`. |
| `src/app/(public)/groups/start/page.tsx` (delete) | 308 → `/join?path=start`. |
| `src/components/map/location-card.tsx` (delete) | Ledger rows replace it; no other consumers. |
| `next.config.ts` (modify) | `redirects()` — full table below. |
| `src/app/(public)/letter/page.tsx` (rewrite) | Real Letter index (encouragements-backed; was a redirect stub). |
| `src/app/(public)/letter/[slug]/page.tsx` (rewrite) | Real Letter detail (was a stub). |
| `src/app/(public)/letter/archive/page.tsx` (rewrite) | Redirect → `/letter` in Task 5; real ledger archive in Task 9. |
| `src/app/(public)/encouragements/*` (delete) | 308 → `/letter`. |
| `src/server/encouragements.ts` (modify) | `revalidatePath` + broadcast URL → `/letter`. |
| `src/app/api/cron/publish-scheduled-letters/route.ts` (modify) | `revalidatePath` → `/letter`. |
| `src/app/(app)/admin/encouragements/[id]/editor.tsx` (modify) | Display copy `/encouragements/{slug}` → `/letter/{slug}`. |
| `src/components/public/plant-request-form.tsx` (create) | Client plant-a-group form (extracted, copy preserved). |
| `src/app/(public)/join/page.tsx` (rewrite) | One page, two paths (join / start) + five principles. |
| `src/components/MemberSignup.tsx` (modify) | Dark-mode token pass (it renders inside the rebuilt `/join`): iron/bone/ink pairings → semantic tokens. |
| `src/app/(public)/get-started/page.tsx` (delete) | 308 → `/join`; principles copy moves to `/join`. |
| `src/app/(public)/page.tsx` (rewrite) | Broadsheet homepage (8 sections, live data). |
| `src/components/LocationsPreview.tsx` (delete) | Homepage map section retired; map lives on `/groups`. |
| `src/app/(public)/events/page.tsx` (rewrite) | Kicker + ruled ledger + paper-card past grid (Phase 1 logic preserved). |
| `src/app/(public)/events/[slug]/page.tsx` (rewrite) | display-soft H1 + dropcap + particulars rail + inline gallery. |
| `src/app/(public)/stories/page.tsx` (modify) | Editorial elevation + try/catch on the query. |
| Secondary pages (modify) | about, faq, what-to-expect, how-we-gather, contact (full furniture); giving, partnerships, acts-20-28, privacy, sms-terms (light pass). |
| `src/app/(public)/resources/page.tsx` + `browser.tsx` + `[slug]/page.tsx` (modify) | Dark-mode token pass + sticky-bar retune to the new slim nav (Task 10; nav-linked, cannot ship unswept). |
| `src/app/(public)/gallery/page.tsx` (modify) | Dark-mode token pass (admin-only page, still public-layout tokens). |
| `src/app/(auth)/layout.tsx` + `(auth)/admin/check-email/page.tsx` (modify) | Semantic-token pass so the sign-in flow survives the `.dark` flips (sign-in page itself already wraps in `.admin-shell`). |
| `src/components/AskTheWatch.tsx` (modify) | Grep-driven T4 swap of any iron/bone pairings (Task 10). |
| `src/components/icons/Icon.tsx` (modify) | Default stroke 2.25 → 1.75 (MASTER consistency pass; admin-visible, intended). |
| `src/app/sitemap.ts` (create) | Canonical URLs + letter/group/event slugs (none exists today; recon §8). |
| `src/app/robots.ts` (create) | Allow public, disallow admin/api/gallery. |
| `scripts/check-contrast.mjs` (create) | WCAG AA math over the globals.css token pairs, both themes. |
| `package.json` (modify) | `animejs` dep; `check:contrast` script. |
| `CLAUDE.md` (modify) | Routes, fonts, theme default, SEO files, commands. |

## Redirect table (single source of truth; all `permanent: true` = 308)

All rows live in `next.config.ts` `redirects()`. next.config redirects run BEFORE middleware and the filesystem, so the middleware `PUBLIC_ROUTES` entries for retired paths go stale-but-harmless; leave them (a redirect miss then still resolves publicly instead of bouncing to sign-in).

| Source | Destination | Added in |
|---|---|---|
| `/locations/request` | `/join?path=start` | Task 4 (must precede `/locations/:id` in the array) |
| `/locations` | `/groups` | Task 4 |
| `/locations/:id` | `/groups/:id` | Task 4 (uuid falls into the `[slug]` page's uuid branch, which 308s again to the pretty slug) |
| `/encouragements` | `/letter` | Task 5 |
| `/encouragements/:slug` | `/letter/:slug` | Task 5 |
| `/get-started` | `/join` | Task 6 |
| `/groups/start` | `/join?path=start` | Task 4 (same commit that deletes the page file — without this row `start` becomes a bogus `/groups/[slug]` lookup and 404s; `/join` already exists, so redirecting early is safe) |

**Model rules (referenced by several tasks):**

- **Token grammar (the dual-theme contract, replaces the "pinned light" contract):** on public pages, anything that must flip with the theme uses semantic utilities — `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-foreground/10`, `divide-foreground/10`, `hover:bg-foreground/[0.03]`, badge overlays `bg-foreground/85 text-background`. Brand constants are allowed ONLY in: `.ember-band` internals (constant near-black), brass fills (`bg-brass text-iron` — iron is constant in both themes), the crest/marks, and admin surfaces. After Task 1, `bone`/`cream`/`ink` FLIP in `.dark` as a safety net for not-yet-swept components; `iron` stays constant. Never introduce new `bg-bone text-iron` or `bg-iron text-bone` pairings — they are the retired grammar.
- **Brass legibility:** `.section-mark` and `.folio` accents use `--color-brass-deep` (`#856018` light / `#D9A53A` dark). Raw brass `#C8932A` measures ~2.5:1 on light parchment — below even the 3:1 large-text bar — so **`text-brass` never carries text on light/theme-flipping surfaces; brass-colored TEXT uses `text-brass-deep`** (identical to brass in dark mode). Raw brass remains for fills (`bg-brass text-iron`), borders, icons, and marks on dark/ember surfaces; hover-color shifts on already-underlined links are tolerated. `scripts/check-contrast.mjs` (Task 11) is the authority: if a pair fails, darken the light-mode value (or lighten the dark one) until it passes and record the change in the commit body.
- **Photo treatment:** uniform 4/3 aspect, 1px hairline frame, 500ms `scale-[1.03]` hover zoom — the prototype's computed treatment. The pre-revision spec line about an "iron/brass duotone overlay" is superseded by the prototype study (spec §2 REVISED adopts the prototype system); do not add overlays.
- **Emphasis pattern:** the emphasized word/line of a display heading is `<em>…</em>` inside a `.display-xl`/`.display-soft` element — the CSS renders it Fraunces italic in oxblood. One `<em>` per heading, never more.
- **Kicker grammar:** every major section opens `<Kicker left="…" right="…" />`. Left = section name; right = a short editorial aside or date. Both render `.folio` (uppercase happens in CSS — author in sentence case).
- **Dropcap:** `.dropcap` goes on exactly one lede paragraph per page (hero lede or detail-body first paragraph). Never on multiple blocks.
- **paper-card:** for photo content only (past-gathering cards, letter covers). Ruled ledgers (`divide-y divide-foreground/10 border-y border-foreground/15`, whole-row links, `md:grid-cols-[140px_1fr_auto]`) for agenda/text lists. The paper-card hover shadow uses constant `--color-iron` (NOT `--color-ink`): ink flips light in dark mode and a light "shadow" reads as a glow. In the prototype ink and iron are the same constant, so this matches its computed values.
- **One primary CTA per screen.** Nav CTA label is exactly **"Join"** (desktop AND mobile) → `/join`. Section CTAs are subordinate (ink-block button or `.link-editorial`).
- **Motion budget:** 1–2 animated elements per viewport; `Reveal` for section entrances (450ms), `StaggerReveal` for card/row grids (400ms, 60ms step); nothing else animates on scroll. The spec's "hero micro-motion" line is deliberately dropped: the prototype study found ZERO hero/logo animation ("the flare is entirely typographic/compositional"), and the prototype is the superseding authority for the hero, same as the duotone drop. CSS hover micro-interactions (`.lift`, arrow nudges) are the only hero motion.
- **Front-page type exception:** `--text-display-xl` stays capped at 6rem per MASTER's locked scale; the HOMEPAGE hero alone uses a raw `text-[clamp(3.25rem,9vw,7.5rem)]` to reach the prototype's 120px front-page headline. No other page may use a raw display clamp.
- **Fraunces axes are set per-class in CSS**, not per-component. Components only ever use `.display-xl`, `.display-soft`, `.brand-wordmark`, `.dropcap`, or `font-display` (the `--font-display` alias). If `next/font` rejects the `axes` array at build time, the error message enumerates the valid axis names — use exactly those (registered axes are lowercase `opsz`; custom axes are uppercase `SOFT`, `WONK`).
- **PRESERVE blocks:** copy quoted in a task as PRESERVE is live-site copy verified by recon. Move it, restyle it, never reword it.

---

### Task 1: Fraunces + broadsheet token foundation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/map/location-map.tsx` (popup font vars only — keeps the Barlow grep clean)
- Create: `src/components/public/kicker.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces (later tasks depend on these exact names):
  - CSS utilities: `.display-xl`, `.display-soft`, `.brand-wordmark`, `.folio`, `.dropcap`, `.paper-card`, `.ember-band`, `.link-editorial`, retuned `.lift` (existing `.section-mark`, `.hairline`, `.aurora`, `.dotted-grid`, `.glass-card`, `.spotlight` keep working).
  - Type-scale utilities: `text-display-xl`, `text-display-lg`, `text-display-md`, `text-lede` (from `--text-*` theme tokens).
  - Color token: `--color-brass-deep` (+ `.section-mark` now uses it).
  - Font var: `--font-fraunces` (aliased as `--font-display`).
  - Component: `Kicker({ left, right?, className? })` from `@/components/public/kicker` (server component).
  - NOT here: the `defaultTheme="system"` flip. It moves to Task 11 so the flipped `.dark` brand constants are reachable mid-execution only via the explicit toggle, never by default for a dark-OS visitor landing on a not-yet-swept page.

- [ ] **Step 1: Swap Barlow Condensed for Fraunces in `src/app/layout.tsx`**

In the `next/font/google` import (lines 2–8), change `Barlow_Condensed,` to `Fraunces,`. Then replace the Barlow block (lines 24–32):

```ts
// Display font — Barlow Condensed Black/ExtraBold for headlines. Replaces
// Fraunces (Apr 2026): the variable-axis serif read soft + decorative,
// which clashed with the "stand guard" voice. Barlow is a low-contrast
// condensed sans — strong, urgent, poster-like, still humane.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
});
```

with:

```ts
// Display face — Fraunces variable, back as the broadsheet display serif
// (2026-07-08 masthead redesign; supersedes the Apr 2026 Barlow swap).
// The opsz/SOFT/WONK axes carry the editorial voice; axis values are set
// per-class in globals.css (.display-xl, .display-soft, .brand-wordmark,
// .dropcap), never per-component. Weight is the full variable range.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});
```

If `next build` rejects the `axes` array, the error lists the axis names it will accept for Fraunces — use exactly those strings (case-sensitive) and nothing else; do not fall back to a static weight list.

In the `<body>` className (line 72), change `${barlowCondensed.variable}` to `${fraunces.variable}`.

Do NOT touch the `ThemeProvider` here — `defaultTheme` stays `"dark"` until Task 11 (see Interfaces above). Spec §2's system default ships in the same phase, just after the sweep.

- [ ] **Step 2: Update the `@theme inline` block in `src/app/globals.css`**

Change the font lines (11 and 13):

```css
  --font-mono: var(--font-geist-mono);
```
```css
  --font-display: var(--font-barlow-condensed);
```

to:

```css
  --font-mono: var(--font-jetbrains-mono);
```
```css
  --font-display: var(--font-fraunces);
```

(`--font-geist-mono` was never loaded — dead reference, recon §1.)

Immediately after the `--color-stone: var(--c-stone);` line (line 32), add:

```css
  /** Darker brass for small-type marks (.section-mark, kicker accents).
   *  Raw brass #C8932A fails AA for small text on parchment; MASTER.md
   *  reserves it for fills, icons, and >=18px semibold. */
  --color-brass-deep: var(--c-brass-deep);

  /* Fluid editorial type scale (MASTER.md). Tailwind v4 turns --text-*
     theme tokens into text-display-xl etc. utilities. */
  --text-display-xl: clamp(2.5rem, 1.2rem + 6vw, 6rem);
  --text-display-lg: clamp(2rem, 1.1rem + 4vw, 4rem);
  --text-display-md: clamp(1.5rem, 1.15rem + 1.8vw, 2.5rem);
  --text-lede: clamp(1.125rem, 1rem + 0.6vw, 1.375rem);
```

- [ ] **Step 3: Rewrite the brand-constant contract (dual theme)**

Replace the comment block + `:root`/`.dark` brand values (lines 74–104) — the block that begins `/* Pasture & Iron — public site keeps iron/bone/cream/ink as CONSTANTS` and ends with the `.dark { … --c-stone: #C7BFAE; }` closing brace — with:

```css
/* Pasture & Iron — TRUE dual theme (Phase 2). The old contract pinned
   iron/bone/cream/ink as constants so editorial cards stayed light in
   dark mode; that is retired on public pages (spec §2, MASTER.md).
     - iron  stays constant (deep ink surface + paper-card shadow color)
     - bone/cream flip to raised iron surfaces in dark
     - ink   flips to light text in dark
   New public work should prefer the semantic tokens (background/card/
   foreground); these flips are the safety net for legacy bone/ink
   utilities that have not been swept yet. Brass fills always pair with
   text-iron (constant), never text-ink. brass-deep is the small-type
   accent that passes AA on parchment. */
:root {
  --c-iron: #0E1624;
  --c-bone: #F2EBDD;
  --c-cream: #F8F2E2;
  --c-ink: #0E1624;
  --c-navy: #1A2438;
  --c-brass: #C8932A;
  --c-brass-deep: #856018;
  --c-gold: #DBAA48;
  --c-olive: #5A6B3E;
  --c-oxblood: #7A1E1E;
  --c-stone: #6E6754;
}
.dark {
  --c-bone: #1A2433;
  --c-cream: #202C40;
  --c-ink: #EDE7DA;
  --c-navy: #0B111C;
  --c-brass: #D9A53A;
  --c-brass-deep: #D9A53A;
  --c-gold: #E5B856;
  --c-olive: #7A8C56;
  /* Lightened from #A33333 so oxblood display <em>s clear 3:1 on iron. */
  --c-oxblood: #B84545;
  --c-stone: #C7BFAE;
}
```

Three AA-driven value changes ride along (Task 11's script verifies all of them): light `--c-stone` darkens `#8A8275` → `#6E6754` so 11px folio text passes 4.5:1 on parchment (the prototype's stone is `#77705F`, which still misses on our slightly lighter background); dark `--c-oxblood` lightens `#A33333` → `#B84545` (the old value measures ~2.8:1 on the iron canvas, under the 3:1 large-text bar the display ems need); and `--c-brass-deep` is new in both themes.

Then extend the admin restore block. Change `.admin-shell` (lines 109–113) and `.dark .admin-shell` (114–118) to:

```css
.admin-shell {
  --c-iron: oklch(0.96 0.012 80);    /* light parchment background */
  --c-bone: oklch(0.18 0.022 260);   /* deep iron-ink text */
  --c-stone: oklch(0.45 0.025 60);   /* muted warm gray */
}
.dark .admin-shell {
  --c-iron: #0E1624;
  --c-bone: #F2EBDD;
  --c-cream: #F8F2E2;
  --c-ink: #0E1624;
  --c-stone: #C7BFAE;
}
```

(The two added lines — cream and ink — keep dark-mode admin exactly as it renders today, since the new `.dark` root flips would otherwise leak into admin chrome.)

- [ ] **Step 4: Replace the display classes and add the broadsheet furniture**

**Cascade-layer rule (load-bearing):** Tailwind v4 emits real cascade layers (`@layer theme, base, components, utilities;`) and UNLAYERED author CSS beats every layered utility regardless of specificity. The old `.display-xl`/`.section-mark`/`.lift` are unlayered, which is why stacked overrides like the live site's `section-mark … hover:text-brass` (page.tsx:48) silently never fire. Every furniture class below is therefore declared with **`@utility`** so it lands in the `utilities` layer, where stacked utilities (`hover:text-brass`, `text-[0.625rem]`, `text-muted-foreground`) win as their authors intend. Pseudo/descendant rules ride along as `&`-nested rules. Intended side effect (see the header): previously-dead stacked color overrides on `.section-mark`/`.display-*` across the whole site, admin included, now apply.

globals.css has a duplicate `.display-xl` (lines 303–305 feature-settings stub, and 374–380 full Barlow definition — recon §1 flags it). Delete the stub at 303–305 AND the `.display-soft` at 306–309, then replace the full `.display-xl` block (the one with the `/* Display headline — Barlow Condensed Black … */` comment) and the `.brand-wordmark` block (lines 382–394) with:

```css
/* Display headline — Fraunces variable at high optical size with the
   wonky cut (opsz 144 / SOFT 30 / WONK 1). The emphasized word of a
   headline is an <em>: Fraunces italic in oxblood, per the prototype.
   @utility (not plain CSS) so stacked utilities can override — see the
   cascade-layer comment in the plan / commit body. */
@utility display-xl {
  font-family: var(--font-fraunces), Georgia, "Times New Roman", serif;
  font-variation-settings: "opsz" 144, "SOFT" 30, "WONK" 1;
  font-weight: 560;
  letter-spacing: -0.018em;
  line-height: 1;
  font-feature-settings: "kern", "liga";
  & em {
    font-style: italic;
    color: var(--color-oxblood);
  }
}

/* Detail-page H1s — the calmer Fraunces cut (opsz 100 / SOFT 60 / WONK 0). */
@utility display-soft {
  font-family: var(--font-fraunces), Georgia, "Times New Roman", serif;
  font-variation-settings: "opsz" 100, "SOFT" 60, "WONK" 0;
  font-weight: 500;
  letter-spacing: -0.008em;
  line-height: 1.06;
  font-feature-settings: "kern";
  & em {
    font-style: italic;
    color: var(--color-oxblood);
  }
}

/* Brand wordmark — Fraunces 600 at wordmark optical size. Used wherever
   "Sheepdog Society" appears as the lockup (masthead, nav, footer,
   admin sidebar, print letterhead). */
@utility brand-wordmark {
  font-family: var(--font-fraunces), Georgia, "Times New Roman", serif;
  font-weight: 600;
  font-variation-settings: "opsz" 40, "SOFT" 20, "WONK" 0;
  letter-spacing: 0.005em;
  line-height: 1.1;
}

/* Folio — the newspaper's small print. Inter 11px, tracked wide,
   uppercase, stone. Kicker rows, masthead topbar, photo meta lines. */
@utility folio {
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-stone);
}

/* Drop cap — one per page, on the lede. Fraunces wonky cut in oxblood. */
@utility dropcap {
  &::first-letter {
    font-family: var(--font-fraunces), Georgia, "Times New Roman", serif;
    font-variation-settings: "opsz" 144, "WONK" 1;
    float: left;
    color: var(--color-oxblood);
    font-size: 3.4em;
    font-weight: 600;
    line-height: 0.82;
    padding-right: 0.09em;
    margin-top: 0.04em;
  }
}

/* Paper card — photo content only. Squared, hairline-bordered, brass
   border + iron shadow on hover (iron, not ink: ink flips light in dark
   mode and a light shadow reads as glow). Border is the semantic
   --border, deviating from MASTER's literal "stone": Phase 2 retunes
   stone as a TEXT color (light #C7BFAE in dark) which would glow as a
   border; --border matches the prototype's computed card borders
   (#d8d0c1 light / #372f25 dark). Pair with .lift. */
@utility paper-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0;
  transition:
    border-color 0.24s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  &:hover {
    border-color: var(--color-brass);
    box-shadow:
      0 1px 0 var(--color-iron),
      0 10px 30px -18px var(--color-iron);
  }
}

/* Ember band — the one dark interlude per long page. Near-black with a
   warm ember glow rising from the bottom edge; Cormorant verse inside.
   Constant in both themes (already dark). Values verbatim from the
   prototype study. Nested folio/section-mark go copper (higher
   specificity within the utilities layer, so it wins over their base
   colors regardless of source order). */
@utility ember-band {
  color: #efe7d5;
  background:
    radial-gradient(
      120% 90% at 50% 118%,
      lab(47.79 36.13 31.13 / 0.16),
      transparent 62%
    ),
    #1c1610;
  & .folio,
  & .section-mark {
    color: #c9834a; /* copper kicker on ember, per the prototype */
  }
}

/* Editorial text link — underline offset 3px, brass on hover. */
@utility link-editorial {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition:
    color 0.16s ease,
    text-decoration-color 0.16s ease;
  &:hover {
    color: var(--color-brass);
    text-decoration-color: var(--color-brass);
  }
}
```

Then retune `.lift` (lines 424–433). Replace:

```css
/* Magnetic CTA — 4-6px lift, no scale, no bounce. */
.lift {
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
.lift:hover {
  transform: translateY(-5px);
}
```

with:

```css
/* Lift — 2px rise over 0.18s, no scale, no bounce (prototype values).
   Stays UNLAYERED on purpose: it is a pre-existing class composed with
   transition-* utilities all over the site (admin included), and moving
   it into the utilities layer would change which transition declaration
   wins at every one of those call sites. Out of scope. */
.lift {
  transition:
    transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
.lift:hover {
  transform: translateY(-2px);
}
```

Replace the whole `.section-mark` block (lines 356–363) with the layered version, so the site-wide `section-mark text-*` stacks (which the plan's own Tasks 7–9 use) actually apply:

```css
/* Section mark — mono small-caps label. brass-deep for AA on parchment. */
@utility section-mark {
  font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-brass-deep);
}
```

`.hairline`, `.aurora`, `.dotted-grid`, `.glass-card`, `.spotlight`, `.breathe` stay unlayered as-is — nothing in this plan stacks conflicting utilities on them.

In the `@layer base` block (lines 196–203), add a site-wide visible focus ring after the `body` rule:

```css
  :where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--color-brass);
    outline-offset: 2px;
  }
```

Finally, `.resource-prose` headings (lines 456–466): change the `font-family` line from `var(--font-barlow-condensed), "Helvetica Neue", Arial, sans-serif;` to `var(--font-fraunces), Georgia, serif;` and `font-weight: 800;` to `font-weight: 600;`.

- [ ] **Step 5: Purge the dead Barlow var from the map popup**

`src/components/map/location-map.tsx` builds popup HTML with inline styles referencing `--font-jetbrains-mono` and `--font-barlow-condensed` (around lines 141–150). Replace the single occurrence of `var(--font-barlow-condensed)` with `var(--font-fraunces)` (the JetBrains var is still loaded — leave it). Then verify repo-wide:

```bash
grep -rn "barlow" src/ --include='*.tsx' --include='*.ts' --include='*.css' -i
```

Expected: zero matches.

- [ ] **Step 6: Create the Kicker component**

Create `src/components/public/kicker.tsx`:

```tsx
import type { ReactNode } from "react";

/**
 * Broadsheet kicker row: folio label left, connecting hairline, optional
 * folio aside right. Opens every major public section (MASTER.md).
 * Server component — no interactivity.
 */
export function Kicker({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`.trim()}>
      <span className="folio shrink-0">{left}</span>
      <div className="hairline flex-1" aria-hidden />
      {right ? <span className="folio shrink-0 text-right">{right}</span> : null}
    </div>
  );
}
```

- [ ] **Step 7: Typecheck + targeted check**

```bash
npx tsc --noEmit   # expected: no errors
npm run dev
```

Watch the dev-server output while loading `http://localhost:3000`: `next/font` validates the Fraunces `axes` array at compile time, so a wrong axis name fails HERE with the list of valid names (see the Model rule). Expected: the page compiles clean and `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000` prints 200. (The font variable class is hashed in the HTML, so don't grep for it — the compile gate plus Task 12's visual pass cover it.) Headlines site-wide now render Fraunces via `.display-xl`; that is correct and intended, including on admin pages. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/map/location-map.tsx src/components/public/kicker.tsx
git commit -m "feat(design): Fraunces broadsheet type system, editorial furniture, true dual-theme tokens"
```

---

### Task 2: anime.js v4 motion primitives

**Files:**
- Modify: `package.json` (+ lockfile)
- Create: `src/components/motion/Reveal.tsx`
- Create: `src/components/motion/StaggerReveal.tsx`

**Interfaces:**
- Consumes: nothing (self-contained clients).
- Produces (Tasks 7–10 import these exact names):
  - `Reveal({ children, className?, y? = 16, delay? = 0 })` from `@/components/motion/Reveal` — wraps children in a `<div>`, fades up 450ms on viewport entry.
  - `StaggerReveal({ children, className?, selector? = ":scope > *", y? = 16, step? = 60 })` from `@/components/motion/StaggerReveal` — wraps children in a `<div>`, staggers the elements matching `selector` inside it. When wrapping a `<ul>`, pass `selector=":scope li"`.

**anime.js v4 crib (v3 silently no-ops — do not trust memory):** named imports `{ animate, createTimeline, stagger, onScroll, createScope, utils }` from `"animejs"`; target is the FIRST positional arg (`animate(el, {...})`, never `targets:`); `ease: "outQuad"` (no `ease` prefix); callbacks are `onBegin`/`onComplete`; `utils.set(el, {...})` for instant states; `createScope({ root }).add(fn)` returns a scope whose `.revert()` is the React cleanup; `onScroll({ target, enter })` passed as `autoplay` triggers on viewport entry (no `sync` = discrete play, not scrubbed). One trap: ScrollObserver's `repeat` DEFAULTS TO `true`, which would re-flash revealed content from opacity 0 every time it re-enters the viewport — both components below set `repeat: false` to make enter-once explicit.

- [ ] **Step 1: Install**

```bash
cd /Users/drewgodwin/sheepdogsociety
npm install animejs@^4
```

(v4 ships its own TypeScript types; no `@types/animejs`.)

- [ ] **Step 2: Create `src/components/motion/Reveal.tsx`**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, onScroll, utils } from "animejs";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Start offset in px (translateY). */
  y?: number;
  /** Delay in ms once the element enters the viewport. */
  delay?: number;
}

/**
 * Scroll-triggered fade-up (anime.js v4 ONLY — v3 syntax silently
 * no-ops). Progressive enhancement: the server renders content visible;
 * the effect hides it via utils.set and reveals on viewport entry, so
 * no-JS visitors and crawlers always see the content. Reduced motion:
 * we never hide anything at all.
 */
export function Reveal({ children, className, y = 16, delay = 0 }: RevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scope = createScope({ root }).add(() => {
      utils.set(root, { opacity: 0, translateY: y });
      animate(root, {
        opacity: 1,
        translateY: 0,
        duration: 450,
        delay,
        ease: "outQuad",
        // repeat defaults to true and would re-flash on re-entry.
        autoplay: onScroll({ target: root, enter: "bottom-=48 top", repeat: false }),
      });
    });
    return () => scope.revert();
  }, [y, delay]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/motion/StaggerReveal.tsx`**

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, createScope, onScroll, stagger, utils } from "animejs";

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  /** Selector for the staggered items, scoped to this wrapper.
   *  Wrapping a <ul>? Pass ":scope li". */
  selector?: string;
  y?: number;
  /** ms between items (MASTER.md: 40-60ms). */
  step?: number;
}

/**
 * Staggered children reveal on viewport entry (anime.js v4 ONLY).
 * Same progressive-enhancement + reduced-motion contract as Reveal.
 */
export function StaggerReveal({
  children,
  className,
  selector = ":scope > *",
  y = 16,
  step = 60,
}: StaggerRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (items.length === 0) return;

    const scope = createScope({ root }).add(() => {
      utils.set(items, { opacity: 0, translateY: y });
      animate(items, {
        opacity: 1,
        translateY: 0,
        duration: 400,
        delay: stagger(step),
        ease: "outQuad",
        // repeat defaults to true and would re-flash on re-entry.
        autoplay: onScroll({ target: root, enter: "bottom-=48 top", repeat: false }),
      });
    });
    return () => scope.revert();
  }, [selector, y, step]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + API sanity**

```bash
npx tsc --noEmit
```

Expected: no errors. If the installed v4 minor has drifted on `onScroll` option names, the compiler will say so — fix against `node_modules/animejs/types` (the shipped `.d.ts`), keeping the enter-once (no `sync`) semantics. Do NOT downgrade to v3 syntax under any circumstances.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/motion/Reveal.tsx src/components/motion/StaggerReveal.tsx
git commit -m "feat(motion): anime.js v4 Reveal and StaggerReveal scroll primitives"
```

---

### Task 3: Masthead + nav + footer rebuild

**Files:**
- Rewrite: `src/components/public/public-nav.tsx`
- Rewrite: `src/components/public/public-footer.tsx`
- Modify: `src/components/public/newsletter-form.tsx`
- Modify: `src/components/motion/ScriptureMarquee.tsx`

**Interfaces:**
- Consumes: `.folio`/`.brand-wordmark`/`.link-editorial`/`.lift` + `--color-brass-deep` (Task 1), `ThemeToggle` (existing).
- Produces: the shared chrome every page renders inside (`(public)/layout.tsx` imports are unchanged — same component names, same files). Nav hrefs are canonical (`/groups`, `/letter`, `/join`); until Tasks 4–6 land those resolve through today's redirect shims, so every commit stays shippable.
- **READ THE LIVE FILE FIRST:** `public-nav.tsx` changed after the recon (`fe6b053`) — it now probes `/api/auth/session` and computes `links` from `isAdmin`. That pattern is preserved verbatim below; do not reinvent it.
- **Two documented micro-deviations from spec §2's masthead wording:** (1) the masthead hairlines run full-bleed to the viewport edges (the study confirms the prototype's rules "run from the page edges to the crests" — the row below is deliberately NOT inside the max-w container); (2) the mobile panel is a slide-DOWN under the nav row, not the spec's "slide-over" sheet — the study is silent on the open panel, and slide-down preserves the existing nav's interaction with less client code and no focus-trap surface. Both are decisions, not oversights.

- [ ] **Step 1: Rewrite `src/components/public/public-nav.tsx`**

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/groups", label: "Groups" },
  { href: "/events", label: "Events" },
  { href: "/letter", label: "The Letter" },
  // Gallery is an admin tool (login-gated in middleware); it is spliced
  // in after The Letter for signed-in admins only — see `links` below.
  { href: "/resources", label: "Resources" },
  {
    href: "/about",
    label: "About",
    children: [
      { href: "/about", label: "About us" },
      { href: "/stories", label: "Stories" },
      { href: "/how-we-gather", label: "How we gather" },
      { href: "/what-to-expect", label: "What to expect" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/acts-20-28", label: "Acts 20:28" },
    ],
  },
  // { href: "/giving", label: "Give" }, // hidden — uncomment to restore
];

/**
 * Broadsheet masthead (Phase 2). Three stacked rows on desktop:
 *   1. folio topbar (strapline + utility links + theme toggle)
 *   2. masthead row (hairline — crest — wordmark — mirrored crest — hairline)
 *   3. slim nav — the ONLY sticky element (rows 1-2 scroll away)
 * Mobile collapses to the single sticky nav row: crest + wordmark left,
 * theme toggle + hamburger right, slide-down panel below.
 */
export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gallery is an admin tool (login-gated in middleware). The tab renders
  // only for a signed-in admin, so visitors never land on a sign-in wall.
  // Client-side session probe keeps every public page statically renderable.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (alive && s?.user && (s.user as { role?: string }).role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const links: NavLink[] = isAdmin
    ? [
        ...navLinks.slice(0, 4),
        { href: "/gallery", label: "Gallery" },
        ...navLinks.slice(4),
      ]
    : navLinks;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  return (
    <>
      {/* Rows 1-2 — scroll away; desktop only */}
      <header className="hidden bg-background text-foreground lg:block">
        {/* Row 1: folio topbar */}
        <div className="border-b border-foreground/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 md:px-10">
            <p className="folio">
              Acts 20:28 &middot; Keep watch over yourselves and all the flock
            </p>
            <div className="flex items-center gap-5">
              <Link href="/acts-20-28" className="folio transition-colors hover:text-brass">
                The Verse
              </Link>
              <Link href="/join" className="folio transition-colors hover:text-brass">
                New here
              </Link>
              <ThemeToggle className="inline-flex h-7 w-7 items-center justify-center text-stone transition-colors hover:text-brass" />
            </div>
          </div>
        </div>

        {/* Row 2: masthead — mirrored crests, heraldic supporters.
            Full-bleed on purpose: the hairlines run from the viewport
            edges to the crests, per the prototype study. */}
        <div className="border-b border-foreground/10">
          <div className="flex items-center gap-6 py-4">
            <div className="hairline flex-1" aria-hidden />
            <Image src="/logo.png" alt="" width={44} height={53} className="h-[53px] w-11" />
            <Link href="/" className="text-center" aria-label="Sheepdog Society home">
              <span className="brand-wordmark block text-3xl">Sheepdog Society</span>
              <span className="folio mt-1.5 block">
                A brotherhood anchored in Acts 20:28
              </span>
            </Link>
            {/* Right crest mirrored so the sheepdogs face the wordmark */}
            <Image
              src="/logo.png"
              alt=""
              width={44}
              height={53}
              className="h-[53px] w-11 -scale-x-100"
            />
            <div className="hairline flex-1" aria-hidden />
          </div>
        </div>
      </header>

      {/* Row 3: the slim sticky nav (mobile: the whole masthead) */}
      <div className="sticky top-0 z-50 border-b border-foreground/15 bg-background/95 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 md:px-10">
          {/* Mobile brand — single-row masthead collapse */}
          <Link
            href="/"
            className="flex items-center gap-3 lg:hidden"
            aria-label="Sheepdog Society home"
          >
            <Image src="/logo.png" alt="" width={32} height={38} className="h-[38px] w-8" />
            <span className="leading-tight">
              <span className="brand-wordmark block text-lg">Sheepdog Society</span>
              <span className="folio block text-[0.625rem]">Acts 20:28</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {links.map((link) => {
              if (link.children) {
                const isOpen = openMenu === link.href;
                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => {
                      cancelClose();
                      setOpenMenu(link.href);
                    }}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      href={link.href}
                      className="folio inline-flex items-center gap-1 px-3 py-3 transition-colors hover:text-brass"
                      onFocus={() => setOpenMenu(link.href)}
                      aria-haspopup="true"
                      aria-expanded={isOpen}
                    >
                      {link.label}
                      <Icon
                        name="chevron-down"
                        size={12}
                        className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </Link>
                    {isOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 min-w-[200px] border border-foreground/15 bg-popover text-popover-foreground"
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        <ul className="py-2">
                          {link.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block px-4 py-2 text-sm text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                                onClick={() => setOpenMenu(null)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="folio px-3 py-3 transition-colors hover:text-brass"
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA — the ONE nav CTA, label exactly "Join" */}
          <div className="hidden shrink-0 items-center lg:flex">
            <Link
              href="/join"
              className="section-mark lift inline-flex h-11 items-center gap-2 border border-foreground/70 px-4 transition-colors hover:border-brass hover:bg-brass/10"
            >
              Join
              <Icon name="arrow-right" size={12} />
            </Link>
          </div>

          {/* Mobile cluster */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle className="inline-flex h-11 w-11 items-center justify-center border border-foreground/15 text-foreground/70 transition-colors hover:border-brass hover:text-brass" />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-none text-foreground"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <Icon name={mobileOpen ? "close" : "menu"} size={22} />
            </button>
          </div>
        </nav>

        {/* Mobile slide-down panel */}
        {mobileOpen && (
          <div className="border-t border-foreground/10 bg-background px-6 pb-6 pt-2 lg:hidden">
            {links.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 text-sm font-medium text-foreground/80"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="ml-4 border-l border-foreground/10 pl-4">
                    {link.children
                      .filter((c) => c.href !== link.href)
                      .map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-sm text-foreground/65"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 border-t border-foreground/10 pt-4">
              <Link
                href="/join"
                onClick={() => setMobileOpen(false)}
                className="lift inline-flex h-12 w-full items-center justify-center gap-2 bg-foreground px-5 text-sm font-medium text-background"
              >
                Join
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

Notes for the implementer: the fragment (not a single `<header>`) is what makes `position: sticky` work — the nav row's containing block is the layout's full-height flex column, so it pins for the whole page while rows 1–2 scroll away. `/logo.png` is taller than wide; 44×53 (and 32×38) match its ratio so `next/image` does not warn. The CTA label is "Join" on BOTH breakpoints (the old mobile "Join the brotherhood" label is retired here).

- [ ] **Step 2: Rewrite `src/components/public/public-footer.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { NewsletterForm } from "./newsletter-form";
import { ScriptureMarquee } from "@/components/motion/ScriptureMarquee";

/**
 * Broadsheet footer. The crest bookends the page (single, centered,
 * ~40px, opacity-80 — MASTER.md), then three link columns + the Letter
 * signup, then the colophon line.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-foreground/15 bg-background text-foreground">
      <ScriptureMarquee />
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        {/* Crest bookend */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={48}
            className="h-12 w-10 opacity-80"
          />
          <p className="brand-wordmark text-2xl">Sheepdog Society</p>
          <p className="folio">Keep watch over yourselves and all the flock</p>
          <Link
            href="/acts-20-28"
            className="link-editorial mt-1 inline-flex items-center gap-1.5 text-sm text-foreground/80"
          >
            Read the verse
            <Icon name="arrow-up-right" size={13} />
          </Link>
        </div>

        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-3">
            <h3 className="folio">Get involved</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/join" className="text-foreground/80 transition-colors hover:text-brass">
                  Join
                </Link>
              </li>
              <li>
                <Link href="/groups" className="text-foreground/80 transition-colors hover:text-brass">
                  Find a group
                </Link>
              </li>
              <li>
                <Link
                  href="/join?path=start"
                  className="text-foreground/80 transition-colors hover:text-brass"
                >
                  Start a group
                </Link>
              </li>
              {/* "Give" link hidden for now — uncomment when the giving flow is ready
              <li>
                <Link href="/giving" className="text-foreground/80 transition-colors hover:text-brass">
                  Give
                </Link>
              </li>
              */}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="folio">On the record</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/letter" className="text-foreground/80 transition-colors hover:text-brass">
                  The Letter
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-foreground/80 transition-colors hover:text-brass">
                  Gatherings
                </Link>
              </li>
              <li>
                <Link href="/stories" className="text-foreground/80 transition-colors hover:text-brass">
                  Stories
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-foreground/80 transition-colors hover:text-brass">
                  Resources
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="folio">The society</h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-foreground/80 transition-colors hover:text-brass">
                  About
                </Link>
              </li>
              <li>
                <Link href="/how-we-gather" className="text-foreground/80 transition-colors hover:text-brass">
                  How we gather
                </Link>
              </li>
              <li>
                <Link href="/what-to-expect" className="text-foreground/80 transition-colors hover:text-brass">
                  What to expect
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-foreground/80 transition-colors hover:text-brass">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-foreground/80 transition-colors hover:text-brass">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="folio">The Letter</h3>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A weekly word for men of faith. Delivered Sunday mornings before
              the day starts.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="hairline mt-16" />
        <div className="mt-8 flex flex-col-reverse items-start gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Sheepdog Society. All rights
            reserved. &middot;{" "}
            <Link href="/privacy" className="link-editorial">
              Privacy
            </Link>{" "}
            &middot;{" "}
            <Link href="/sms-terms" className="link-editorial">
              SMS terms
            </Link>
          </p>
          <p className="folio">Forth as sheepdogs &middot; Glory to God</p>
        </div>
      </div>
    </footer>
  );
}
```

(PRESERVE carried through: the tagline moved into the crest bookend as the strapline; "A weekly word for men of faith. Delivered Sunday mornings before the day starts." and "Forth as sheepdogs · Glory to God" are verbatim.)

- [ ] **Step 3: Fix `src/components/public/newsletter-form.tsx`**

Two surgical edits (recon §4: the error state is set but never rendered; the brass button uses theme-flipping `text-ink` and a hue-jump hover).

Edit A — render the error. The non-success return is the bare flex `<form>` — its `<input>` and `<button>` are DIRECT children (there is no inner `</div>` anywhere in the form), so the error line must live OUTSIDE the horizontal bar. Wrap the return in a fragment and put the error after the form. Change the start of the return (lines 43–47):

```tsx
  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center border border-stone/25 transition-colors focus-within:border-brass"
    >
```

to:

```tsx
  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-center border border-stone/25 transition-colors focus-within:border-brass"
      >
```

and change the end (lines 65–67):

```tsx
    </form>
  );
}
```

to:

```tsx
      </form>
      {status === "error" && (
        <p className="mt-2 text-sm text-destructive">
          That did not go through. Check the address and try again.
        </p>
      )}
    </>
  );
}
```

(Re-indenting the form's inner lines to match is optional; only the fragment wrapper and the error block matter.)

Edit B — in the submit button's className (line 60), change `bg-brass … text-ink hover:bg-stone` tokens: replace `text-ink` with `text-iron` and `hover:bg-stone` with `hover:bg-gold`.

- [ ] **Step 4: Fix the marquee em-dash**

In `src/components/motion/ScriptureMarquee.tsx` line 5 (the string is unique in the file, so match on it, not the line number), change `"Romans 5:3—4"` to `"Romans 5:3-4"` (brand voice bans em-dashes; recon §5 cites line 6, off by one).

- [ ] **Step 5: Typecheck + targeted check**

```bash
npx tsc --noEmit   # expected: no errors
```

With `npm run dev`: `curl -s http://localhost:3000 | grep -c "logo.png"` — expected ≥3 (two masthead crests + mobile brand + footer bookend render server-side). Signed-out HTML must NOT contain `href="/gallery"`.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/public-nav.tsx src/components/public/public-footer.tsx src/components/public/newsletter-form.tsx src/components/motion/ScriptureMarquee.tsx
git commit -m "feat(nav): broadsheet masthead with mirrored crests, slim sticky nav, crest-bookend footer"
```

---

### Task 4: Locations slug + /groups consolidation

**Files:**
- Create: `drizzle/0015_locations_slug.sql`, `src/lib/locations/slug.ts`, `src/lib/locations/slug.test.ts`, `src/components/public/groups-browser.tsx`, `src/components/public/group-interest-form.tsx`
- Modify: `src/db/schema.ts`, `src/server/admin-groups-locations.ts`, `src/app/api/admin/locations/route.ts`, `src/app/api/public/locations/route.ts`, `src/components/map/location-map.tsx`, `next.config.ts`
- Rewrite: `src/app/(public)/groups/page.tsx`, `src/app/(public)/groups/[slug]/page.tsx` (both are 5–10-line redirect shims today)
- Delete: `src/app/(public)/locations/page.tsx`, `src/app/(public)/locations/[id]/page.tsx`, `src/app/(public)/locations/request/page.tsx`, `src/app/(public)/groups/start/page.tsx`, `src/components/map/location-card.tsx`
- Modify (href sweep): `src/app/(public)/page.tsx`, `src/components/LocationsPreview.tsx`, `src/components/AskTheWatch.tsx`, `src/app/(public)/how-we-gather/page.tsx`, `src/app/(public)/what-to-expect/page.tsx`, `src/app/(public)/events/page.tsx`

**Interfaces:**
- Consumes: `Kicker` (Task 1), `.display-xl`/`.dropcap`/`.folio`/`text-display-*` (Task 1), existing `LocationMap`, existing APIs `POST /api/public/locations/interest` and `POST /api/public/locations/request` (both unchanged).
- Produces: `locations.slug` column; `locationSlug(name, city)` from `@/lib/locations/slug`; `LocationPin` gains `slug: string | null`; canonical pages `/groups` + `/groups/[slug]`; the first FOUR `next.config.ts` redirect rows (including `/groups/start`, which must land in the same commit that deletes its page file).
- The `locations` table is the ONLY data source (spec §1) — the legacy `groups` table is never queried by public pages. Visibility gates preserved exactly as today: list = `displayedOnMap AND isActive`; detail = `status = 'active'` (recon flags the mismatch; changing gate semantics is out of scope).

- [ ] **Step 1: Pure slug helper + tests (write tests first)**

Create `src/lib/locations/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { locationSlug } from "./slug";

describe("locationSlug", () => {
  it("slugifies name + city", () => {
    expect(locationSlug("Iron Table", "Rockmart")).toBe("iron-table-rockmart");
  });
  it("collapses punctuation and whitespace runs", () => {
    expect(locationSlug("St. Mark's — Men", "Dallas / Hiram")).toBe(
      "st-mark-s-men-dallas-hiram"
    );
  });
  it("trims leading/trailing dashes", () => {
    expect(locationSlug("(The) Forge!", "Rome!")).toBe("the-forge-rome");
  });
  it("falls back to 'group' when nothing survives", () => {
    expect(locationSlug("§§§", "***")).toBe("group");
  });
  it("tolerates empty inputs", () => {
    expect(locationSlug("", "")).toBe("group");
  });
});
```

Create `src/lib/locations/slug.ts`:

```ts
/**
 * URL slug for a location: slugify(name + city), e.g.
 * "Iron Table" + "Rockmart" -> "iron-table-rockmart".
 * Mirrors the SQL backfill in drizzle/0015_locations_slug.sql — if you
 * change one, change both. Dedupe (-2/-3... suffixes) happens at the
 * call site against the DB, not here (this stays pure for Vitest).
 */
export function locationSlug(name: string, city: string): string {
  const base = `${name ?? ""}-${city ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "group";
}
```

Run `npm test` — expected: the new suite passes (5/5) alongside the existing recurrence suite.

- [ ] **Step 2: Schema — `slug` column + partial unique index**

In `src/db/schema.ts`, inside `export const locations = pgTable(` (lines ~896–946; do NOT touch other tables), insert after the `imageUrl: text("image_url").default(""),` line:

```ts
    /** Pretty public URL segment for /groups/[slug] (migration 0015).
     *  Backfilled from name+city; nullable so legacy admin flows that
     *  don't set it keep working (public pages fall back to the id). */
    slug: text("slug"),
```

and change the index list from:

```ts
  (table) => [
    index("locations_city_idx").on(table.city),
    index("locations_state_idx").on(table.state),
    index("locations_status_idx").on(table.status),
  ]
```

to:

```ts
  (table) => [
    index("locations_city_idx").on(table.city),
    index("locations_state_idx").on(table.state),
    index("locations_status_idx").on(table.status),
    uniqueIndex("locations_slug_unique")
      .on(table.slug)
      .where(sql`slug IS NOT NULL`),
  ]
```

(`uniqueIndex` and `sql` are already imported at the top of schema.ts.)

- [ ] **Step 3: Migration 0015**

Create `drizzle/0015_locations_slug.sql`:

```sql
-- 0015: locations.slug — pretty public URLs for /groups/[slug].
-- Additive + re-run safe (the GH Action re-applies on push to main).
-- Backfill mirrors locationSlug() in src/lib/locations/slug.ts:
-- slugify(name + city), '-2'/'-3'... suffixes by creation order for
-- duplicates. Only NULL-slug rows are written, so re-runs never rename
-- a live URL.

ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "slug" text;

UPDATE "locations" AS l
SET "slug" = d.final_slug
FROM (
  SELECT id,
         CASE WHEN rn = 1 THEN base_slug
              ELSE base_slug || '-' || rn::text END AS final_slug
  FROM (
    SELECT id,
           base_slug,
           row_number() OVER (PARTITION BY base_slug ORDER BY created_at, id) AS rn
    FROM (
      SELECT id,
             created_at,
             COALESCE(
               NULLIF(
                 trim(both '-' from
                   regexp_replace(
                     lower(coalesce(name, '') || '-' || coalesce(city, '')),
                     '[^a-z0-9]+', '-', 'g')),
                 ''),
               'group') AS base_slug
      FROM "locations"
    ) s
  ) numbered
) d
WHERE l.id = d.id AND l."slug" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "locations_slug_unique"
  ON "locations" ("slug")
  WHERE "slug" IS NOT NULL;
```

(The row_number dedupe runs over ALL rows, not just NULL ones, so a re-run after new rows arrive numbers them consistently against the already-slugged originals. If an admin has renamed a location since its slug was minted a collision would abort the migration loudly — acceptable, additive-safe.)

Apply it:

```bash
cd /Users/drewgodwin/sheepdogsociety
node scripts/apply-neon-migration.mjs
```

Expected: `0015_locations_slug.sql` applied. Verify: `slug` populated and unique on existing rows (the script's output, or a follow-up `SELECT slug FROM locations LIMIT 5` via the same env). If the pooled endpoint trips its circuit breaker, re-run with `DATABASE_URL` set to the `DATABASE_URL_UNPOOLED` value (Phase 1 Task 2 precedent).

- [ ] **Step 4: Admin insert sets a deduped slug; revalidate `/groups`**

In `src/server/admin-groups-locations.ts`:

(a) Add to the imports: `import { locationSlug } from "@/lib/locations/slug";` and add `like` to the existing `drizzle-orm` import.

(b) In the create branch (the `} else {` block containing `await db.insert(locations).values({` at ~line 241), insert immediately before the `await db.insert(...)` call:

```ts
    // Pretty /groups/[slug] URL (migration 0015). Deduped against
    // existing slugs with -2/-3... suffixes, matching the SQL backfill.
    const slugBase = locationSlug(
      input.locationName ?? input.groupName,
      input.city ?? "Unknown"
    );
    const taken = new Set(
      (
        await db
          .select({ slug: locations.slug })
          .from(locations)
          .where(like(locations.slug, `${slugBase}%`))
      ).map((r) => r.slug)
    );
    let slug = slugBase;
    for (let n = 2; taken.has(slug); n++) slug = `${slugBase}-${n}`;
```

and add `slug,` to the `values({ ... })` object (anywhere after `name:`).

(c) Replace all three `revalidatePath("/locations");` calls (lines 265, 304, 315) with `revalidatePath("/groups");`.

(d) The repo has ONE other `db.insert(locations)` path: the authenticated POST in `src/app/api/admin/locations/route.ts` (insert at ~line 61; no in-app consumers, but it is routable and must not mint slug-less rows). Add `import { locationSlug } from "@/lib/locations/slug";`, add `like` to its `drizzle-orm` import, insert the same dedupe block immediately before its `db.insert(locations)` call (that handler's inputs are `parsed.data.name` and `parsed.data.city` — both required by its zod schema):

```ts
  // Pretty /groups/[slug] URL (migration 0015) — same dedupe as the
  // admin server action, so no insert path creates slug-less rows.
  const slugBase = locationSlug(parsed.data.name, parsed.data.city);
  const taken = new Set(
    (
      await db
        .select({ slug: locations.slug })
        .from(locations)
        .where(like(locations.slug, `${slugBase}%`))
    ).map((r) => r.slug)
  );
  let slug = slugBase;
  for (let n = 2; taken.has(slug); n++) slug = `${slugBase}-${n}`;
```

and add `slug,` to its `.values({ ... })` object.

- [ ] **Step 5: Expose `slug` on the public pin payload + map popup**

(a) `src/app/api/public/locations/route.ts`: in the `.select({ ... })` object add `slug: locations.slug,` (after `name:`).

(b) `src/components/map/location-map.tsx`: in the exported `LocationPin` type (lines 12–25) add `slug: string | null;` after `name: string;`. In the popup HTML (~line 146), change the anchor href from `/locations/${loc.id}` to `/groups/${loc.slug ?? loc.id}`.

- [ ] **Step 6: GroupsBrowser client component**

Create `src/components/public/groups-browser.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocationMap, type LocationPin } from "@/components/map/location-map";
import { Icon } from "@/components/icons/Icon";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Map + search/day filter + ruled ledger of groups. Client component:
 * the filters and Mapbox need the browser; the pins arrive server-
 * fetched from the page so the list is in the HTML for crawlers.
 */
export function GroupsBrowser({ pins }: { pins: LocationPin[] }) {
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = pins;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.state.toLowerCase().includes(q)
      );
    }
    if (dayFilter !== "all") {
      result = result.filter(
        (l) => l.meetingDay?.toLowerCase() === dayFilter.toLowerCase()
      );
    }
    return result;
  }, [pins, search, dayFilter]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-3 border-y border-foreground/15 py-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            placeholder="City, state, or group name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full border border-foreground/15 bg-transparent pl-11 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
          />
        </div>
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="h-11 border border-foreground/15 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none md:w-[160px]"
        >
          <option value="all">All days</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <LocationMap
        locations={filtered}
        className="mt-6 h-[420px] border border-foreground/15 sm:h-[480px]"
      />

      {/* Ruled ledger of results */}
      <div className="mt-8 flex items-center justify-between">
        <span className="folio">
          {filtered.length} {filtered.length === 1 ? "group" : "groups"}
        </span>
        <span className="folio">{dayFilter !== "all" ? dayFilter : "All days"}</span>
      </div>
      {filtered.length > 0 ? (
        <ul className="mt-3 divide-y divide-foreground/10 border-y border-foreground/15">
          {filtered.map((loc) => {
            const memberPart =
              loc.groupSize != null && loc.groupSize > 0
                ? `${loc.groupSize} ${loc.groupSize === 1 ? "man" : "men"}`
                : null;
            const meta = [memberPart, loc.meetingDay, loc.meetingTime]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={loc.id}>
                <Link
                  href={`/groups/${loc.slug ?? loc.id}`}
                  className="group grid cursor-pointer gap-2 py-6 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8"
                >
                  <div>
                    <h3 className="font-display text-xl">{loc.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Icon name="map-pin" size={14} className="text-brass" />
                      {loc.city}, {loc.state}
                    </p>
                  </div>
                  {meta && <p className="section-mark">{meta}</p>}
                  <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                    Details →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 border border-dashed border-foreground/15 p-10 text-center">
          <Icon name="map-pin" size={32} strokeWidth={2} className="mx-auto text-foreground/30" />
          <p className="mt-4 font-pullquote text-lg italic text-muted-foreground">
            No groups in this view.
          </p>
          <Link
            href="/join?path=start"
            className="mt-4 inline-flex items-center gap-2 section-mark transition-colors hover:text-brass"
          >
            Plant one
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: The canonical `/groups` index**

Replace `src/app/(public)/groups/page.tsx` (currently an 8-line redirect shim) with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Kicker } from "@/components/public/kicker";
import { Icon } from "@/components/icons/Icon";
import { GroupsBrowser } from "@/components/public/groups-browser";
import type { LocationPin } from "@/components/map/location-map";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Groups — Sheepdog Society",
  description:
    "Find a Sheepdog Society group near you. Weekly Bible studies for men, open to all.",
};

/** Same visibility gate as the public map API: displayedOnMap AND isActive. */
async function getPins(): Promise<LocationPin[]> {
  try {
    return await db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
        latitude: locations.latitude,
        longitude: locations.longitude,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        meetingPlace: locations.meetingPlace,
        groupSize: locations.groupSize,
        maxSize: locations.maxSize,
        contactName: locations.contactName,
      })
      .from(locations)
      .where(and(eq(locations.displayedOnMap, true), eq(locations.isActive, true)))
      .orderBy(asc(locations.city), asc(locations.name));
  } catch {
    return [];
  }
}

export default async function GroupsPage() {
  const pins = await getPins();
  const totalMen = pins.reduce((acc, l) => acc + (l.groupSize ?? 0), 0);

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="The outposts" right="Come as you are" />
          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr] md:items-end md:gap-20">
            <h1 className="display-xl text-display-xl">
              Find a group.
              <br />
              <em>Or plant one.</em>
            </h1>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="display-xl text-4xl text-brass-deep md:text-6xl">
                  {pins.length}
                </p>
                <p className="folio mt-2">Active groups</p>
              </div>
              {totalMen > 0 && (
                <div>
                  <p className="display-xl text-4xl text-brass-deep md:text-6xl">
                    {totalMen}
                  </p>
                  <p className="folio mt-2">Men gathering</p>
                </div>
              )}
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            We meet in diners, coffee shops, gyms, garages. Wherever two or
            more can sit with the Word.
          </p>
        </div>
      </section>

      {/* Map + ledger */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <GroupsBrowser pins={pins} />
        </div>
      </section>

      {/* Plant CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="No group near you?" />
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <h2 className="display-xl text-display-md">Plant a table where you live.</h2>
            <Link
              href="/join?path=start"
              className="lift inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
            >
              Start a group
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

(PRESERVE: "Find a group. / Or plant one.", "Active groups", "Men gathering", the diners pull-quote from `LocationsPreview`, "No groups in this view." / "Plant one" in the browser.)

- [ ] **Step 8: GroupInterestForm client component**

Create `src/components/public/group-interest-form.tsx` (extracted from the retired `/locations/[id]` page; copy PRESERVE):

```tsx
"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

/**
 * "I'm interested" form for a group detail page. Posts to the existing
 * public interest API; the leader follows up by email. Copy preserved
 * from the retired /locations/[id] page.
 */
export function GroupInterestForm({ locationId }: { locationId: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, ...form }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      /* the retry is the form staying on screen */
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mt-10 flex items-start gap-4 border border-brass/40 p-6 md:p-8">
        <Icon name="check" size={24} className="text-brass" />
        <p className="font-pullquote text-lg italic leading-relaxed md:text-xl">
          Thank you, brother. The group leader will be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid gap-6">
      <Field
        label="Name"
        required
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <Field
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
      />
      <Field
        label="Phone (optional)"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
      />
      <div>
        <label className="folio" htmlFor="interest-message">
          Anything you want the leader to know
        </label>
        <textarea
          id="interest-message"
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="lift inline-flex h-12 cursor-pointer items-center gap-2 bg-foreground px-8 text-sm font-medium uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "I'm interested"}
          {!submitting && <Icon name="arrow-right" size={16} />}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `interest-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label className="folio" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-brass">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-base text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
      />
    </div>
  );
}
```

- [ ] **Step 9: The `/groups/[slug]` detail page**

Replace `src/app/(public)/groups/[slug]/page.tsx` (currently a 10-line shim that treats the slug as a UUID) with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Kicker } from "@/components/public/kicker";
import { Icon } from "@/components/icons/Icon";
import { GroupInterestForm } from "@/components/public/group-interest-form";

export const revalidate = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public detail payload. Same columns and gate (status = 'active') as
 * the old /api/public/locations/[id] route — contactEmail/contactPhone
 * stay admin-only, on purpose (see that route's comment). Accepts a
 * slug OR a legacy UUID (old /locations/[id] links 308 through here).
 */
async function getLocation(slugOrId: string) {
  const isUuid = UUID_RE.test(slugOrId);
  try {
    const [row] = await db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
        description: locations.description,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        meetingPlace: locations.meetingPlace,
        groupSize: locations.groupSize,
        maxSize: locations.maxSize,
        contactName: locations.contactName,
        signalGroupUrl: locations.signalGroupUrl,
      })
      .from(locations)
      .where(
        and(
          isUuid ? eq(locations.id, slugOrId) : eq(locations.slug, slugOrId),
          eq(locations.status, "active")
        )
      )
      .limit(1);
    return row ? { ...row, wasUuid: isUuid } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) return { title: "Group — Sheepdog Society" };
  return {
    title: `${loc.name} — Sheepdog Society`,
    description: `A Sheepdog Society group in ${loc.city}, ${loc.state}. Weekly Bible study for men, open to all.`,
  };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) notFound();
  // Legacy UUID URL and we know the pretty slug: settle on the canonical.
  if (loc.wasUuid && loc.slug) permanentRedirect(`/groups/${loc.slug}`);

  const when = [loc.meetingDay, loc.meetingTime].filter(Boolean).join(" · ");
  const where = loc.meetingPlace || loc.address || "";

  return (
    <article className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <Kicker
          left="Gathering post"
          right={`${loc.city}, ${loc.state}`}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          {/* Left column */}
          <div className="lg:col-span-8">
            <h1 className="display-soft text-display-lg">{loc.name}</h1>
            {loc.description ? (
              <p className="dropcap mt-8 max-w-prose font-serif text-lg leading-[1.75] text-foreground/85">
                {loc.description}
              </p>
            ) : (
              <p className="mt-8 max-w-prose font-pullquote text-lede italic text-muted-foreground">
                Weekly Scripture. Honest talk. Prayer before we leave.
              </p>
            )}

            {loc.signalGroupUrl && (
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-foreground/15 bg-card p-6 md:p-8">
                <div className="flex items-center gap-4">
                  <Icon name="message" size={28} strokeWidth={2} className="text-brass" />
                  <div>
                    <p className="font-display text-lg md:text-xl">Signal group</p>
                    <p className="text-sm text-muted-foreground">
                      Join for between-meeting comms.
                    </p>
                  </div>
                </div>
                <a
                  href={loc.signalGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift inline-flex h-11 cursor-pointer items-center gap-2 border border-foreground/70 px-5 text-xs font-medium uppercase tracking-wider transition-colors hover:border-brass"
                >
                  Join Signal
                  <Icon name="arrow-up-right" size={14} />
                </a>
              </div>
            )}

            <Link
              href="/groups"
              className="link-editorial mt-10 inline-flex items-center gap-2 text-sm"
            >
              ← All groups
            </Link>
          </div>

          {/* Right rail — the particulars */}
          <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-0">
            <p className="folio">The particulars</p>
            <dl className="mt-6 space-y-6">
              {when && (
                <div>
                  <dt className="folio">When</dt>
                  <dd className="mt-1.5 font-display text-lg">{when}</dd>
                </div>
              )}
              {where && (
                <div>
                  <dt className="folio">Where</dt>
                  <dd className="mt-1.5 font-display text-lg">{where}</dd>
                </div>
              )}
              <div>
                <dt className="folio">Group size</dt>
                <dd className="mt-1.5 font-display text-lg">
                  {loc.groupSize ?? 0} of {loc.maxSize} men
                </dd>
              </div>
              {loc.contactName && (
                <div>
                  <dt className="folio">Contact</dt>
                  <dd className="mt-1.5 font-display text-lg">{loc.contactName}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {/* Interest form */}
        <div className="mt-16 max-w-3xl border-t border-foreground/15 pt-12">
          <Kicker left="Interested?" />
          <h2 className="display-xl mt-8 text-display-md">
            Show up. We will be there.
          </h2>
          <GroupInterestForm locationId={loc.id} />
        </div>
      </div>
    </article>
  );
}
```

(PRESERVE: "Show up. We will be there.", "Thank you, brother. The group leader will be in touch.", "Join Signal" / "Join for between-meeting comms.", "X of Y men". The not-found path uses Next's `notFound()` rather than the old inline "Group not found." client state.)

- [ ] **Step 10: Redirects — replace `next.config.ts`**

Replace the whole file with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (handled in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow Clerk/Supabase images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Phase 2 IA consolidation. All 308s. Config redirects run before
  // middleware and the filesystem; keep /locations/request ABOVE
  // /locations/:id or the request page becomes a bogus group id.
  // /groups/start ships HERE (same commit that deletes its page file),
  // or "start" would fall into /groups/[slug] and 404.
  async redirects() {
    return [
      {
        source: "/locations/request",
        destination: "/join?path=start",
        permanent: true,
      },
      { source: "/locations/:id", destination: "/groups/:id", permanent: true },
      { source: "/locations", destination: "/groups", permanent: true },
      {
        source: "/groups/start",
        destination: "/join?path=start",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 11: Delete the retired pages + sweep the hrefs**

```bash
git rm "src/app/(public)/locations/page.tsx" "src/app/(public)/locations/[id]/page.tsx" "src/app/(public)/locations/request/page.tsx" "src/app/(public)/groups/start/page.tsx" src/components/map/location-card.tsx
```

(`/groups/start`'s 308 landed in Step 10 of THIS task, so deleting its page file here leaves no 404 window; nothing in src/ links to it anyway — recon §7. `LocationCard`'s only consumer was the deleted locations index. The `/api/public/locations*` routes stay — public reads, still used by the map browser's types and harmless.)

Href sweep (exact, recon "Cross-site dependencies"; skip files already rebuilt in Task 3 and files deleted above):

| File | Change |
|---|---|
| `src/app/(public)/page.tsx` L67 | `href="/locations"` → `href="/groups"` (hero CTA; page is fully rebuilt in Task 7, this keeps the interim commit clean) |
| `src/components/LocationsPreview.tsx` L70 | `href="/locations"` → `href="/groups"` |
| `src/components/LocationsPreview.tsx` L83 | `href="/locations/request"` → `href="/join?path=start"` |
| `src/components/AskTheWatch.tsx` L208 | `/locations` → `/groups` |
| `src/app/(public)/how-we-gather/page.tsx` L192 | `href="/locations"` → `href="/groups"` |
| `src/app/(public)/how-we-gather/page.tsx` L203 | `href="/locations/request"` → `href="/join?path=start"` |
| `src/app/(public)/what-to-expect/page.tsx` L196 | `href="/locations"` → `href="/groups"` |
| `src/app/(public)/what-to-expect/page.tsx` L203 | `href="/locations/request"` → `href="/join?path=start"` |
| `src/app/(public)/events/page.tsx` L270 | empty-state `href="/locations"` → `href="/groups"` |

Also sweep `src/app/(public)/get-started/page.tsx` (L89 + L201: `href="/locations"` → `href="/groups"`; L100 + L212: `href="/locations/request"` → `href="/join?path=start"`) — the file dies in Task 6, but this keeps the gate below clean and the interim commit shippable. Then verify:

```bash
grep -rn '"/locations' src/app src/components --include='*.tsx' | grep -v api
```

Expected: zero matches.

- [ ] **Step 12: Typecheck + tests + targeted check**

```bash
npx tsc --noEmit   # expected: no errors
npm test           # expected: recurrence + slug suites green
```

With `npm run dev`:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/locations
# expected: 308 http://localhost:3000/groups
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/groups/start
# expected: 308 http://localhost:3000/join?path=start (NOT a slug lookup)
curl -s http://localhost:3000/groups | grep -o "Find a group" | head -1
# expected: Find a group
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(groups): locations-backed /groups with slugs, ruled ledger, and 308s off /locations"
```

---

### Task 5: The /letter flip

**Files:**
- Rewrite: `src/app/(public)/letter/page.tsx`, `src/app/(public)/letter/[slug]/page.tsx`, `src/app/(public)/letter/archive/page.tsx` (all three are redirect stubs today, pointing the WRONG way — at `/encouragements`)
- Delete: `src/app/(public)/encouragements/page.tsx`, `src/app/(public)/encouragements/[slug]/page.tsx`
- Modify: `src/server/encouragements.ts`, `src/app/api/cron/publish-scheduled-letters/route.ts`, `src/app/(app)/admin/encouragements/[id]/editor.tsx`, `src/app/(public)/page.tsx` (one href), `next.config.ts`

**Interfaces:**
- Consumes: nothing new. The `encouragements` content system (tables, server module, admin UI, Resend broadcasts) keeps powering everything — only the PUBLIC URL changes (spec §1). The dormant legacy `letters` table stays dormant; `src/server/letters.ts` is NOT touched.
- Produces: `/letter` + `/letter/[slug]` as real pages (content byte-identical to today's encouragements pages except hrefs; Task 9 does the typographic elevation), `/encouragements*` 308s. Already-sent broadcast emails link `/encouragements/{slug}` — the 308 preserves them forever.

- [ ] **Step 1: Move the list page**

Overwrite `src/app/(public)/letter/page.tsx` (9-line stub) with the ENTIRE current content of `src/app/(public)/encouragements/page.tsx` (127 lines — read the live file and copy it whole), then apply exactly two changes:

1. The card link (old line 65): `` href={`/encouragements/${row.slug}`} `` → `` href={`/letter/${row.slug}`} ``
2. The component name: `export default async function EncouragementsListPage()` → `export default async function LetterIndexPage()`

Everything else — metadata ("The Letter — Sheepdog Society"), `force-dynamic`, hero copy, empty state, `LetterCover` fallback logic — stays byte-identical. Do not restyle here.

- [ ] **Step 2: Move the detail page**

Overwrite `src/app/(public)/letter/[slug]/page.tsx` (9-line stub) with the ENTIRE current content of `src/app/(public)/encouragements/[slug]/page.tsx` (230 lines), then apply exactly six changes:

1. Back link (old line 65): `href="/encouragements"` → `href="/letter"`
2. Back link label (old line 69): `All encouragements` → `All letters`
3. Footer CTA (old line 213): `href="/encouragements"` → `href="/letter"`
4. Footer CTA label (old line 216): `All encouragements` → `All letters`
5. Footer CTA (old line 220): `href="/get-started"` → `href="/join"` (label "Join the brotherhood" stays; `/join` already exists)
6. Component name: `EncouragementPage` → `LetterPage`

(The fifth pre-empts Task 6's sweep so this commit ships clean.)

- [ ] **Step 3: Archive placeholder redirect**

Overwrite `src/app/(public)/letter/archive/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

// The full-ledger archive page lands in the letter/stories elevation
// task (Phase 2 Task 9). Until then every issue is on the index.
export default function LetterArchivePage() {
  redirect("/letter");
}
```

- [ ] **Step 4: Delete the old pages**

```bash
git rm "src/app/(public)/encouragements/page.tsx" "src/app/(public)/encouragements/[slug]/page.tsx"
```

- [ ] **Step 5: Server-side path strings (recon §10 lists every site)**

1. `src/server/encouragements.ts` line 216: `revalidatePath("/encouragements");` → `revalidatePath("/letter");`
2. `src/server/encouragements.ts` line 253: `` const publicUrl = `${siteUrl}/encouragements/${row.slug}`; `` → `` const publicUrl = `${siteUrl}/letter/${row.slug}`; `` (future broadcast emails link the canonical URL; past emails ride the 308)
3. `src/app/api/cron/publish-scheduled-letters/route.ts` line 122: `revalidatePath("/encouragements");` → `revalidatePath("/letter");`
4. Same file line 124: `` revalidatePath(`/encouragements/${row.slug}`); `` → `` revalidatePath(`/letter/${row.slug}`); ``
5. `src/app/(app)/admin/encouragements/[id]/editor.tsx` line 484 (display copy only): `/encouragements/` → `/letter/`
6. `src/app/(public)/page.tsx` line 80: `href="/encouragements"` → `href="/letter"` (homepage secondary CTA; page is rebuilt in Task 7, this keeps the interim commit clean)

- [ ] **Step 6: Redirects**

In `next.config.ts` `redirects()`, add before the `/locations/request` entry:

```ts
      { source: "/encouragements/:slug", destination: "/letter/:slug", permanent: true },
      { source: "/encouragements", destination: "/letter", permanent: true },
```

- [ ] **Step 7: Typecheck + targeted check**

```bash
npx tsc --noEmit
grep -rn '"/encouragements' src/app/\(public\) src/components --include='*.tsx'
```

Expected: no type errors; zero grep matches (middleware and admin-route hrefs are exempt — admin URLs do not move). With `npm run dev`:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/encouragements
# expected: 308 http://localhost:3000/letter
curl -s http://localhost:3000/letter | grep -o "One letter" | head -1
# expected: One letter
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(letter): public URL flips to /letter, encouragements system keeps powering it"
```

---

### Task 6: /join consolidation — one page, two paths

**Files:**
- Create: `src/components/public/plant-request-form.tsx`
- Rewrite: `src/app/(public)/join/page.tsx`
- Delete: `src/app/(public)/get-started/page.tsx`
- Modify: `src/components/MemberSignup.tsx` (dark-mode token pass — it renders inside the rebuilt page), `next.config.ts`, `src/app/(public)/acts-20-28/page.tsx`, `src/app/(public)/page.tsx` (one href)

**Interfaces:**
- Consumes: `MemberSignup` + `GroupOption` (existing, unchanged — it posts `/api/members` and renders the covenant success card), `POST /api/public/locations/request` (existing, unchanged), `Kicker`, Task 1 utilities.
- Produces: `/join` with `?path=start` switching to the embedded plant-request form; `?group=<id>` preselect preserved; the five-core-principles copy rehomed from the deleted `/get-started`. Redirect rows `/get-started` → `/join` and `/groups/start` → `/join?path=start`.
- Note: `MemberSignup` keeps its own internal intent picker (join / start / just keep posted). Its "start" intent is a lightweight signal into `/api/members`; the page-level start path is the full plant-request form. Both are valid inputs and the admin sees both queues — do NOT modify MemberSignup here.

- [ ] **Step 1: Extract the plant-request form**

Create `src/components/public/plant-request-form.tsx` (copy PRESERVE from the retired `/locations/request` page; Magnetic dropped per the motion budget, tokens made theme-aware):

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

/**
 * Plant-a-group request form, extracted from the retired
 * /locations/request page for the /join start path. Posts to the
 * existing public API; copy preserved verbatim.
 */
export function PlantRequestForm() {
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    proposedCity: "",
    proposedState: "",
    proposedMeetingDetails: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/locations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      /* form stays on screen; user can retry */
    }
    setSubmitting(false);
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (submitted) {
    return (
      <div className="border border-brass/40 p-12 text-center">
        <Icon name="check" size={48} strokeWidth={2.25} className="mx-auto text-brass" />
        <h3 className="display-xl mt-8 text-3xl md:text-4xl">Request received.</h3>
        <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
          We will reach out to schedule a call. Welcome to the brotherhood.
        </p>
        <Link
          href="/groups"
          className="mt-8 inline-flex items-center gap-2 section-mark transition-colors hover:text-brass"
        >
          View all groups
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8">
      <p className="max-w-2xl font-pullquote text-lede italic text-muted-foreground">
        Two to twelve men. Weekly Scripture study. Tell us about your vision
        and we will set up a video call.
      </p>

      <div className="flex items-center gap-4">
        <span className="folio">Your details</span>
        <div className="hairline flex-1" aria-hidden />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Your name"
          required
          value={form.requesterName}
          onChange={(v) => update("requesterName", v)}
        />
        <Field
          label="Email"
          type="email"
          required
          value={form.requesterEmail}
          onChange={(v) => update("requesterEmail", v)}
        />
      </div>

      <Field
        label="Phone (optional)"
        value={form.requesterPhone}
        onChange={(v) => update("requesterPhone", v)}
      />

      <div className="mt-4 flex items-center gap-4">
        <span className="folio">Where</span>
        <div className="hairline flex-1" aria-hidden />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="City"
          required
          value={form.proposedCity}
          onChange={(v) => update("proposedCity", v)}
        />
        <div>
          <label className="folio" htmlFor="plant-state">
            State<span className="ml-1 text-brass">*</span>
          </label>
          <select
            id="plant-state"
            value={form.proposedState}
            onChange={(e) => update("proposedState", e.target.value)}
            required
            className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none"
          >
            <option value="" className="bg-background text-foreground">
              Select state
            </option>
            {US_STATES.map((s) => (
              <option key={s} value={s} className="bg-background text-foreground">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="folio" htmlFor="plant-meeting">
          Proposed meeting day, time, place
        </label>
        <textarea
          id="plant-meeting"
          rows={3}
          placeholder="e.g. Saturday mornings 7am at the diner on 5th"
          value={form.proposedMeetingDetails}
          onChange={(e) => update("proposedMeetingDetails", e.target.value)}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <label className="folio" htmlFor="plant-reason">
          Why you want to lead a group
        </label>
        <textarea
          id="plant-reason"
          rows={4}
          placeholder="Tell us about yourself and your vision."
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          className="mt-3 w-full border border-foreground/20 bg-transparent px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="lift inline-flex h-12 cursor-pointer items-center gap-2 bg-foreground px-8 text-sm font-medium uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit request"}
          {!submitting && <Icon name="arrow-right" size={16} />}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `plant-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <label className="folio" htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-brass">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-11 w-full border border-foreground/20 bg-transparent px-4 text-base text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
      />
    </div>
  );
}
```

- [ ] **Step 2: Rebuild `/join`**

Replace `src/app/(public)/join/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { MemberSignup, type GroupOption } from "@/components/MemberSignup";
import { PlantRequestForm } from "@/components/public/plant-request-form";
import { Kicker } from "@/components/public/kicker";
import { Icon, type IconName } from "@/components/icons/Icon";

export const metadata: Metadata = {
  title: "Join — Sheepdog Society",
  description:
    "Find a table near you. Or plant one where you live. Either way, do not stand alone.",
};

export const revalidate = 60;

async function getGroupOptions(): Promise<GroupOption[]> {
  try {
    const rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
      })
      .from(locations)
      .where(eq(locations.status, "active"))
      .orderBy(asc(locations.city), asc(locations.name))
      .limit(50);

    return rows.map((r) => {
      const place = [r.city, r.state].filter(Boolean).join(", ");
      const time = [r.meetingDay, r.meetingTime].filter(Boolean).join(" ");
      const head = r.name && r.name.trim() ? r.name : place || "Group";
      const tail = [place && head !== place ? place : null, time]
        .filter(Boolean)
        .join(" · ");
      // Middot, not the live file's em-dash: user-facing copy, and the
      // voice constraint bans em-dashes where a separator works.
      return { id: r.id, label: tail ? `${head} · ${tail}` : head };
    });
  } catch {
    return [];
  }
}

/** The five core principles, rehomed verbatim from the retired /get-started. */
const principles: { icon: IconName; roman: string; title: string; copy: string }[] = [
  {
    icon: "gate",
    roman: "I",
    title: "Free of charge.",
    copy: "Always free. No dues, no fees, no cost. This is a gift of brotherhood.",
  },
  {
    icon: "brothers",
    roman: "II",
    title: "Open to all men.",
    copy: "Every man is welcome regardless of background, denomination, or where he is in his walk.",
  },
  {
    icon: "hands",
    roman: "III",
    title: "Peer led.",
    copy: "No hierarchy. Any man can lead. We sharpen each other as equals before God.",
  },
  {
    icon: "flame",
    roman: "IV",
    title: "Ends with prayer.",
    copy: "Every gathering closes with the Circle of Prayer, where we lift one another up.",
  },
  {
    icon: "cross",
    roman: "V",
    title: "Christ-centered.",
    copy: "Jesus is our leader and foundation. Scripture is our guide. The Gospel is our hope.",
  },
];

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; path?: string }>;
}) {
  const sp = await searchParams;
  const path = sp.path === "start" ? "start" : "join";
  const groups = path === "join" ? await getGroupOptions() : [];
  const preselectedGroupId = sp.group;

  return (
    <>
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
          <Kicker left="Sit at the table" right="No application · No interview" />
          <h1 className="display-xl mt-10 text-display-xl">
            There is a chair.
            <br />
            <em>Sit in it.</em>
          </h1>
          <p className="dropcap mt-8 max-w-2xl font-scripture text-lg text-foreground/85">
            You do not need to have your life cleaned up. Tell us where you
            are. We will help you find a table.
          </p>

          {/* Two paths */}
          <nav aria-label="Join paths" className="mt-12 grid gap-px border border-foreground/15 bg-foreground/15 md:grid-cols-2">
            <Link
              href="/join"
              aria-current={path === "join" ? "page" : undefined}
              className={`block p-6 transition-colors ${
                path === "join"
                  ? "bg-card"
                  : "bg-background hover:bg-foreground/[0.03]"
              }`}
            >
              <span className={`section-mark ${path === "join" ? "" : "text-muted-foreground"}`}>
                I · Join a group
              </span>
              <p className="mt-2 font-display text-xl">Find a table near you.</p>
            </Link>
            <Link
              href="/join?path=start"
              aria-current={path === "start" ? "page" : undefined}
              className={`block p-6 transition-colors ${
                path === "start"
                  ? "bg-card"
                  : "bg-background hover:bg-foreground/[0.03]"
              }`}
            >
              <span className={`section-mark ${path === "start" ? "" : "text-muted-foreground"}`}>
                II · Start one
              </span>
              <p className="mt-2 font-display text-xl">
                Ready to lead? Plant a table where you live.
              </p>
            </Link>
          </nav>

          <div className="mt-12">
            {path === "start" ? (
              <PlantRequestForm />
            ) : (
              <MemberSignup
                groups={groups}
                preselectedGroupId={preselectedGroupId}
                source="/join"
              />
            )}
          </div>
        </div>
      </section>

      {/* Five core principles — what you are joining */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Five core principles" right="Know before you come" />
          <ul className="mt-8 divide-y divide-foreground/10 border-y border-foreground/15">
            {principles.map((p) => (
              <li key={p.title} className="grid gap-3 py-6 md:grid-cols-[64px_1fr] md:items-start">
                <span className="flex items-center gap-3 md:flex-col md:items-start">
                  <Icon name={p.icon} size={24} strokeWidth={2} className="text-brass" />
                  <span className="section-mark">{p.roman}</span>
                </span>
                <span>
                  <h3 className="font-display text-xl">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.copy}
                  </p>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Want the full picture first?{" "}
            <Link href="/what-to-expect" className="link-editorial">
              What to expect at a table
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
```

(PRESERVE: metadata, "There is a chair. / Sit in it.", the lede, all five principle titles + copies. The old join hero mark "§ Sit at the table" becomes the kicker. `getGroupOptions` is verbatim from the live file EXCEPT the option label's em-dash becomes a middot, per the voice constraint — deliberate copy fix, noted inline.)

- [ ] **Step 3: MemberSignup dark-mode token pass**

`MemberSignup` renders inside the rebuilt `/join` and still wears the retired iron/bone grammar; after Task 1's `.dark` flips, `bg-iron text-bone` is dark-on-dark (bone flips to a dark surface while iron stays constant) and `text-ink` on brass goes light-on-brass. Surgical swaps in `src/components/MemberSignup.tsx` (same style as Task 3's newsletter-form edits; line numbers from the live file, strings are the anchors):

1. Submit button (~line 322): `bg-iron px-6 … text-bone transition-colors hover:bg-iron/90` → `bg-foreground px-6 … text-background transition-colors hover:bg-foreground/90`.
2. Covenant "Save image" CTA (~line 459): in `bg-brass … text-ink … hover:bg-gold`, replace `text-ink` with `text-iron` (constant in both themes; the Model-rules brass pairing).
3. "Text a brother" CTA (~line 465): `border border-iron px-6 … text-iron transition-colors hover:bg-iron hover:text-bone` → `border border-foreground px-6 … text-foreground transition-colors hover:bg-foreground hover:text-background`.
4. Every `text-iron/55` fine-print paragraph (~lines 288, 328, 357, 473, 480) → `text-muted-foreground`.
5. Field label span (~line 352): `section-mark text-iron/70` → `section-mark text-muted-foreground` (the stacked override is LIVE after Task 1's layer move, so it must be a theme-safe token).
6. The covenant card's `border-t border-iron/15` (~line 480) → `border-t border-foreground/15`.
7. Gate: `grep -n "iron\|bone\|text-ink" src/components/MemberSignup.tsx` — apply the same mechanical swaps to any remaining hits (brass fills keep `text-iron`; expected result: only `text-iron` adjacent to `bg-brass` survives).

Do NOT touch its logic, fields, honeypot, or the `/api/members` payload.

- [ ] **Step 4: Delete `/get-started` + redirects**

```bash
git rm "src/app/(public)/get-started/page.tsx"
```

In `next.config.ts` `redirects()`, add after the `/groups/start` entry (which landed in Task 4):

```ts
      { source: "/get-started", destination: "/join", permanent: true },
```

- [ ] **Step 5: Href sweep (recon "Links to /get-started")**

1. `src/app/(public)/acts-20-28/page.tsx` line 68: `href="/get-started"` → `href="/join"` (button label "Join the brotherhood" stays).
2. `src/app/(public)/page.tsx` line 134: `href="/get-started"` → `href="/what-to-expect"` (the button is labeled "What to expect" — it now points at the page that actually answers that; homepage is rebuilt next task).
3. Letter detail CTA already flipped in Task 5. Nav/footer already `/join` from Task 3. Verify:

```bash
grep -rn '"/get-started\|"/groups/start' src/app src/components --include='*.tsx'
```

Expected: zero matches (middleware.ts keeps its stale-but-harmless entry).

- [ ] **Step 6: Typecheck + targeted check**

```bash
npx tsc --noEmit
```

With `npm run dev`:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/get-started   # 308 → /join
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/groups/start # 308 → /join?path=start
curl -s "http://localhost:3000/join?path=start" | grep -o "Submit request" | head -1        # Submit request
curl -s http://localhost:3000/join | grep -o "Five core principles" | head -1               # Five core principles
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(join): one join page, two paths, get-started and plant-request folded in; MemberSignup goes dual-theme"
```

---

### Task 7: Homepage rebuild — the front page

**Files:**
- Rewrite: `src/app/(public)/page.tsx`
- Delete: `src/components/LocationsPreview.tsx` (its map section leaves the homepage; the map lives on `/groups`; no other consumers after Task 4)

**Interfaces:**
- Consumes: `Kicker`, `Reveal`, `StaggerReveal`, `.display-xl`/`.dropcap`/`.ember-band`/`.paper-card`/`.folio`/`.link-editorial`, `cadenceLabel` + `SeriesCadence` (Phase 1), `listPublishedEncouragements` + `LetterCover` (existing), `NewsletterForm`, `events`/`eventSeries`/`testimonies`/`users` tables.
- Produces: the spec §1 homepage narrative in order: hero → Acts 20:28 ember band → how it works → next gatherings strip (live series data, never empty while a series is active) → latest Letter → past-gatherings photo strip → one story → final Join CTA. `Magnetic` and the aurora/dotted-grid hero layers are retired from this page (prototype grammar: composition over effects). `CountUp` and `Magnetic` component files stay (admin + contact still use them).

- [ ] **Step 1: Replace `src/app/(public)/page.tsx` entirely**

```tsx
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/db";
import { events, eventSeries, testimonies, users } from "@/db/schema";
import { and, asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { LetterCover } from "@/components/letters/LetterCover";
import { listPublishedEncouragements } from "@/server/encouragements";
import { cadenceLabel, type SeriesCadence } from "@/lib/events/series";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sheepdog Society — Acts 20:28",
  description:
    "Find your brothers. A brotherhood of men anchored in Acts 20:28, who tell the truth and grow stronger in Christ together.",
  openGraph: {
    title: "Sheepdog Society — Find your brothers.",
    description: "Brothers who tell the truth and hear yours. Acts 20:28.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};

type Photo = { url: string; alt?: string; caption?: string };

/** Next gatherings: one row per series (its next date), one-offs as-is,
 *  first four overall. Same filters as /events (Phase 1 semantics). */
async function getNextGatherings() {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        location: events.location,
        startTime: events.startTime,
        seriesId: events.seriesId,
        seriesCadence: eventSeries.cadence,
        seriesDayOfWeek: eventSeries.dayOfWeek,
        seriesNthWeek: eventSeries.nthWeek,
      })
      .from(events)
      .leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
      .where(
        and(
          gte(events.startTime, now),
          eq(events.isPast, false),
          eq(events.isCancelled, false)
        )
      )
      .orderBy(asc(events.startTime))
      .limit(24);

    const seen = new Set<string>();
    const strip: Array<(typeof rows)[number] & { label: string | null }> = [];
    for (const row of rows) {
      if (row.seriesId) {
        if (seen.has(row.seriesId)) continue;
        seen.add(row.seriesId);
      }
      strip.push({
        ...row,
        label: row.seriesCadence
          ? cadenceLabel({
              cadence: row.seriesCadence as SeriesCadence,
              dayOfWeek: row.seriesDayOfWeek ?? 0,
              nthWeek: row.seriesNthWeek,
            })
          : null,
      });
      if (strip.length === 4) break;
    }
    return strip;
  } catch {
    return [];
  }
}

async function getLatestLetter() {
  try {
    const rows = await listPublishedEncouragements();
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Three most recent past gatherings that have photos (Phase 1 predicate). */
async function getPhotoStrip() {
  try {
    return await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        photos: events.photos,
      })
      .from(events)
      .where(
        and(
          eq(events.isCancelled, false),
          or(
            eq(events.isPast, true),
            lt(events.endTime, new Date()),
            and(isNull(events.endTime), lt(events.startTime, new Date()))
          ),
          sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) > 0`
        )
      )
      .orderBy(desc(events.startTime))
      .limit(3);
  } catch {
    return [];
  }
}

async function getStory() {
  try {
    const [story] = await db
      .select({
        id: testimonies.id,
        title: testimonies.title,
        content: testimonies.content,
        authorFirstName: users.firstName,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt))
      .limit(1);
    return story ?? null;
  } catch {
    return null;
  }
}

const standingOrders = [
  { roman: "I", text: "Show up." },
  { roman: "II", text: "Tell the truth." },
  { roman: "III", text: "Stand watch." },
];

const howItWorks = [
  {
    roman: "I",
    title: "Find a table",
    copy: "Pick a group near you. Diners, garages, church basements.",
  },
  {
    roman: "II",
    title: "Show up as you are",
    copy: "No application. No interview. Sit down, read the Word, be honest.",
  },
  {
    roman: "III",
    title: "Keep showing up",
    copy: "The work is weekly. Scripture, straight talk, prayer. Steadier every week.",
  },
];

export default async function HomePage() {
  const [gatherings, letter, photoEvents, story] = await Promise.all([
    getNextGatherings(),
    getLatestLetter(),
    getPhotoStrip(),
    getStory(),
  ]);

  return (
    <>
      {/* 1 — Hero: the front page */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
          <Kicker left="The front page" right="Every man needs a watch to stand" />
          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              {/* Front-page-only raw clamp (documented Model-rules
                  exception): the prototype's 120px hero, above the
                  6rem cap of the locked --text-display-xl token. */}
              <h1 className="display-xl text-[clamp(3.25rem,9vw,7.5rem)]">
                Find your
                <br />
                <em>brothers.</em>
              </h1>
              <p className="dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85">
                You have walked alone a long time. There is honor in that, and
                a limit to it. Find brothers who will tell you the truth and
                hear yours, men who know the Word, who will stand watch beside
                you and grow stronger in Christ. That is the work. That is
                enough.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <Link
                  href="/groups"
                  className="lift group inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
                >
                  <Icon name="map-pin" size={18} />
                  Find a group near you
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link href="/letter" className="link-editorial text-base">
                  Read this week&rsquo;s Letter
                </Link>
              </div>
              <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted-foreground">
                We do not meet to perform. We do not meet to debate. We meet to
                be honest with each other, anchored in Scripture, and to send
                each other back into the week steadier than we came.
              </p>
            </div>

            {/* Right rail — standing orders */}
            <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-1">
              <p className="folio">Standing orders</p>
              <ol className="mt-6 space-y-5">
                {standingOrders.map((o) => (
                  <li key={o.roman} className="flex items-baseline gap-4">
                    <span className="section-mark w-6 shrink-0">{o.roman}.</span>
                    <span className="font-display text-2xl">{o.text}</span>
                  </li>
                ))}
              </ol>
              <Link
                href="/what-to-expect"
                className="link-editorial mt-8 inline-block text-sm text-foreground/80"
              >
                What to expect at a table
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* 2 — The why: Acts 20:28 ember band */}
      <section className="ember-band">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center md:px-10 md:py-28">
          <p className="section-mark">§ Acts 20:28</p>
          <blockquote className="mt-8 font-pullquote text-2xl italic leading-relaxed md:text-4xl">
            &ldquo;Keep watch over yourselves and all the flock of which the
            Holy Spirit has made you overseers. Be shepherds of the church of
            God, which he bought with his own blood.&rdquo;
          </blockquote>
          <Link href="/acts-20-28" className="link-editorial mt-8 inline-block text-sm">
            Read the verse
          </Link>
        </div>
      </section>

      {/* 3 — How it works */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
          <Kicker left="How it works" right="Three steps, no hoops" />
          <StaggerReveal className="mt-10 grid gap-10 md:grid-cols-3">
            {howItWorks.map((s) => (
              <div key={s.roman}>
                <span className="section-mark">{s.roman}</span>
                <h3 className="display-soft mt-4 text-display-md">{s.title}</h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {s.copy}
                </p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* 4 — Next gatherings (live series data) */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Next gatherings" right="Come once · Come often" />
          {gatherings.length > 0 ? (
            <ul className="mt-8 divide-y divide-foreground/10 border-y border-foreground/15">
              {gatherings.map((g) => {
                const start = new Date(g.startTime);
                return (
                  <li key={g.id}>
                    <Link
                      href={`/events/${g.id}`}
                      className="group grid cursor-pointer gap-3 py-6 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto] md:items-center md:gap-8"
                    >
                      <span className="flex items-baseline gap-2 md:flex-col md:gap-0">
                        <span className="display-xl text-2xl text-brass-deep">
                          {format(start, "MMM")}
                        </span>
                        <span className="display-xl text-2xl">
                          {format(start, "d")}
                        </span>
                      </span>
                      <span>
                        {g.label && (
                          <span className="section-mark">{g.label}</span>
                        )}
                        <span className="mt-1 block font-display text-xl">
                          {g.title}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {format(start, "EEEE · h:mm a")}
                          {g.location ? ` · ${g.location}` : ""}
                        </span>
                      </span>
                      <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-8 font-pullquote text-lede italic text-muted-foreground">
              The calendar is refilling. Check the gatherings page.
            </p>
          )}
          <Link
            href="/events"
            className="link-editorial mt-6 inline-block text-sm"
          >
            All gatherings
          </Link>
        </div>
      </section>

      {/* 5 — The latest Letter */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker
            left="The Letter"
            right={
              letter?.publishDate
                ? `No. ${letter.issueNumber} · ${format(new Date(letter.publishDate), "MMMM d, yyyy")}`
                : "Sunday mornings"
            }
          />
          <Reveal className="mt-10">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              {letter ? (
                <Link
                  href={`/letter/${letter.slug}`}
                  className="paper-card lift group/cover block overflow-hidden"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    {letter.coverImageUrl ? (
                      <Image
                        src={letter.coverImageUrl}
                        alt={letter.coverImageAlt ?? ""}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.03]"
                      />
                    ) : (
                      <LetterCover
                        id={letter.id}
                        title={letter.title}
                        theme={letter.theme}
                        className="h-full w-full transition-transform duration-500 group-hover/cover:scale-[1.03]"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="border border-dashed border-foreground/15 p-10 text-center">
                  <Icon name="sparkles" size={32} className="mx-auto text-brass" />
                  <p className="mt-4 font-pullquote text-lg italic text-muted-foreground">
                    The first letter is on the way.
                  </p>
                </div>
              )}
              <div>
                {letter && (
                  <>
                    <h2 className="display-soft text-display-md">{letter.title}</h2>
                    {letter.intro && (
                      <p className="mt-4 line-clamp-3 leading-relaxed text-muted-foreground">
                        {letter.intro}
                      </p>
                    )}
                    <Link
                      href={`/letter/${letter.slug}`}
                      className="link-editorial mt-4 inline-block text-sm"
                    >
                      Read this week&rsquo;s
                    </Link>
                  </>
                )}
                <p className="mt-8 max-w-xl font-pullquote text-lede italic text-muted-foreground">
                  One letter a week. A scripture. A practice. Sent at sunrise.
                  Read in five minutes. Carry it the rest of the week.
                </p>
                <div className="mt-5 max-w-xl">
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6 — Past gatherings photo strip */}
      {photoEvents.length > 0 && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="Past gatherings" right="What we came home with" />
            <StaggerReveal className="mt-10 grid gap-6 md:grid-cols-3" selector=":scope > a">
              {photoEvents.map((ev) => {
                const photos = (ev.photos as Photo[] | null) ?? [];
                const cover = photos[0];
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="paper-card lift group/past block overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-foreground/5">
                      {cover && (
                        <Image
                          src={cover.url}
                          alt={cover.alt ?? ev.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover/past:scale-[1.03]"
                        />
                      )}
                      {photos.length > 0 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-6 items-center gap-1 bg-foreground/85 px-2 text-[0.625rem] uppercase tracking-[0.14em] text-background">
                          <Icon name="image" size={10} />
                          {photos.length} photo{photos.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="folio">
                        {format(new Date(ev.startTime), "MMMM d, yyyy")}
                      </p>
                      <h3 className="mt-2 font-display text-xl">{ev.title}</h3>
                      <p className="section-mark mt-3 inline-flex items-center gap-2">
                        See the night
                        <Icon
                          name="arrow-right"
                          size={12}
                          className="transition-transform group-hover/past:translate-x-1"
                        />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </StaggerReveal>
          </div>
        </section>
      )}

      {/* 7 — One story */}
      {story && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="One story" right="Told plain" />
            <Reveal className="mt-10">
              <blockquote className="border-l-2 border-brass pl-6">
                <p className="font-pullquote text-xl italic leading-relaxed text-foreground/85 md:text-2xl">
                  {story.content.slice(0, 280)}
                  {story.content.length > 280 ? "..." : ""}
                </p>
                <footer className="section-mark mt-6">
                  {story.authorFirstName || "A brother"}
                </footer>
              </blockquote>
              <Link
                href="/stories"
                className="link-editorial mt-8 inline-block text-sm"
              >
                More stories
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* 8 — Final Join CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl border-t border-foreground/15 px-6 py-20 text-center md:px-10 md:py-28">
          <p className="folio">The invitation stands</p>
          <h2 className="display-xl mt-6 text-display-lg">
            There is a chair.
            <br />
            <em>Sit in it.</em>
          </h2>
          <div className="mt-10">
            <Link
              href="/join"
              className="lift inline-flex h-12 items-center gap-3 bg-foreground px-8 text-base font-medium text-background"
            >
              Join the brotherhood
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

(PRESERVE carried: metadata block; hero H1 "Find your / brothers." with the em now oxblood italic per the system; the full hero lede paragraph; "Find a group near you"; "Read this week's Letter"; the "We do not meet to perform…" sub-copy; the Letter pull-quote "One letter a week…"; the Acts 20:28 NIV verse from `/acts-20-28`; "See the night"; "A brother".)

- [ ] **Step 2: Delete the retired preview component**

```bash
git rm src/components/LocationsPreview.tsx
grep -rn "LocationsPreview" src/   # expected: zero matches
```

- [ ] **Step 3: Typecheck + targeted check**

```bash
npx tsc --noEmit
```

With `npm run dev`:

```bash
curl -s http://localhost:3000/ | grep -c "ember-band"        # expected: 1
curl -s http://localhost:3000/ | grep -o "Standing orders"    # expected: Standing orders (folio uppercases visually; source is sentence case)
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(home): broadsheet front page with ember verse, live gatherings strip, latest Letter"
```

---

### Task 8: Events index + detail elevation

**Files:**
- Modify: `src/app/(public)/events/page.tsx` (queries + grouping stay; the rendered JSX is replaced)
- Modify: `src/app/(public)/events/[slug]/page.tsx` (same split)

**Interfaces:**
- Consumes: `Kicker`, `StaggerReveal`, `.display-xl`/`.display-soft`/`.dropcap`/`.paper-card`/`.folio`, Phase 1 series grouping (`groupUpcoming`, `cadenceLabel`).
- Produces: the spec §2 events surface — "Upcoming" ruled ledger with series badges + details fold, "Past gatherings" paper-card grid with photo-count badges, detail pages with the particulars rail and the inline "The night, in pictures (N)" gallery. **Phase 1 behavior contracts preserved exactly:** cancelled instances hidden from both lists, cancelled notice on detail, RSVP hidden for past AND cancelled, series fold shows later dates, null-endTime past predicate.
- Two documented deviations from the prototype's gallery grammar: (1) recap-only past events (no photos) still render as paper-cards with a calendar-glyph placeholder — deliberate Phase 1 preservation (`getPast` admits recap-only rows; dropping them would hide written-up gatherings), where the prototype showed photo-bearing cards only. (2) The badge's `image` glyph is the icon set's closest match to the spec's "camera icon" — there is no `camera` in the `IconName` union; adding one is out of scope. The badge itself renders for ANY photo count ≥1 ("1 photo" is informative), per spec.
- READ THE LIVE FILES: both changed in Phase 1 after the recon (`f7c3de8` and the fix waves). The queries (`getUpcoming`, `getPast`, `getEvent`), `groupUpcoming`, and `generateMetadata` are correct as-is — do not touch them.

- [ ] **Step 1: Rebuild the events index JSX**

In `src/app/(public)/events/page.tsx`, keep everything from the imports through `groupUpcoming` (lines 1–139) EXCEPT: add `import { Kicker } from "@/components/public/kicker";` and `import { StaggerReveal } from "@/components/motion/StaggerReveal";` to the imports. Then replace the entire `export default async function EventsPage() { ... }` with:

```tsx
export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcoming(), getPast()]);
  const upcomingItems = groupUpcoming(upcoming);

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="Gatherings" right="Come once · Come often" />
          <h1 className="display-xl mt-10 text-display-xl">
            Bring a brother.
            <br />
            <em>Bring a friend.</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Weekly tables. Monthly breakfasts. Prayer nights. Camping. The
            calendar below is what is on the books.
          </p>
        </div>
      </section>

      {/* Upcoming — ruled ledger */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Upcoming" />

          {upcomingItems.length > 0 ? (
            <ul className="mt-10 divide-y divide-foreground/10 border-y border-foreground/15">
              {upcomingItems.map((item) => {
                const ev = item.row;
                const start = new Date(ev.startTime);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="group grid cursor-pointer gap-4 py-8 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto] md:items-start md:gap-8"
                    >
                      <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
                        <span className="display-xl text-3xl text-brass-deep">
                          {format(start, "MMM")}
                        </span>
                        <span className="display-xl text-3xl">
                          {format(start, "d")}
                        </span>
                      </div>
                      <div>
                        <span className="flex flex-wrap items-center gap-3">
                          {item.kind === "series" && (
                            <span className="section-mark">{item.label}</span>
                          )}
                          {ev.eventType && (
                            <span className="section-mark text-muted-foreground">
                              {ev.eventType}
                            </span>
                          )}
                        </span>
                        <h3 className="mt-2 font-display text-xl transition-colors group-hover:text-brass md:text-2xl">
                          {ev.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="clock" size={14} />
                            {format(start, "EEEE · h:mm a")}
                          </span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="map-pin" size={14} />
                              {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-3 max-w-prose text-foreground/70">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                    {item.kind === "series" && item.later.length > 0 && (
                      <details className="-mt-4 pb-6 pl-4 md:pl-[172px]">
                        <summary className="section-mark cursor-pointer list-none transition-colors hover:text-brass">
                          + {item.later.length} more date
                          {item.later.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {item.later.map((r) => (
                            <li key={r.id}>
                              <Link
                                href={`/events/${r.id}`}
                                className="transition-colors hover:text-brass"
                              >
                                {format(new Date(r.startTime), "EEEE, MMMM d · h:mm a")}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-10 border border-dashed border-foreground/15 p-12 text-center">
              <Icon name="calendar" size={32} className="mx-auto text-foreground/30" />
              <p className="mt-4 font-pullquote text-xl italic text-muted-foreground">
                No gatherings on the books yet.
              </p>
              <p className="mt-3 text-muted-foreground">
                Check back soon, or{" "}
                <Link href="/groups" className="link-editorial text-foreground">
                  find a weekly group
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Past gatherings — paper-card grid (the public gallery surface) */}
      {past.length > 0 && (
        <section className="bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
            <Kicker left="Past gatherings" />
            <p className="mt-4 max-w-2xl font-pullquote text-lg italic text-muted-foreground">
              The brothers who showed up, and what they came home with.
            </p>
            <StaggerReveal
              className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              selector=":scope > a"
            >
              {past.map((ev) => {
                const photos =
                  (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ??
                  [];
                const cover = photos[0];
                const start = new Date(ev.startTime);
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="paper-card lift group/past block overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-foreground/5">
                      {cover ? (
                        <Image
                          src={cover.url}
                          alt={cover.alt ?? ev.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover/past:scale-[1.03]"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-foreground/25">
                          <Icon name="calendar" size={48} />
                        </div>
                      )}
                      {photos.length > 0 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-6 items-center gap-1 bg-foreground/85 px-2 text-[0.625rem] uppercase tracking-[0.14em] text-background">
                          <Icon name="image" size={10} />
                          {photos.length} photo{photos.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="folio">
                        {format(start, "MMMM d, yyyy")}
                        {ev.eventType && <> · {ev.eventType}</>}
                      </p>
                      <h3 className="mt-2 font-display text-xl transition-colors group-hover/past:text-brass">
                        {ev.title}
                      </h3>
                      {ev.recap && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {ev.recap}
                        </p>
                      )}
                      <p className="section-mark mt-4 inline-flex items-center gap-2">
                        See the night
                        <Icon
                          name="arrow-right"
                          size={12}
                          className="transition-transform group-hover/past:translate-x-1"
                        />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </StaggerReveal>
          </div>
        </section>
      )}
    </>
  );
}
```

(PRESERVE: hero H1 + lede, "The brothers who showed up, and what they came home with.", "No gatherings on the books yet." block, "See the night", "Details →", the `+ N more dates` fold.)

- [ ] **Step 2: Rebuild the event detail JSX**

In `src/app/(public)/events/[slug]/page.tsx`, keep `getEvent` and `generateMetadata` untouched; add `import { Kicker } from "@/components/public/kicker";` to the imports; replace the entire `export default async function EventDetailPage(...)` with:

```tsx
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev) notFound();

  const start = new Date(ev.startTime);
  const end = ev.endTime ? new Date(ev.endTime) : null;
  const isPast = ev.isPast || (end ? end < new Date() : start < new Date());
  const photos =
    (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [];
  const recap = ev.recap ?? "";

  return (
    <article className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <Kicker left="Gathering notice" right={format(start, "EEEE, MMMM d, yyyy")} />

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          {/* Left column */}
          <div className="lg:col-span-8">
            {ev.eventType && <p className="section-mark">{ev.eventType}</p>}
            <h1 className="display-soft mt-4 text-display-lg">{ev.title}</h1>
            {ev.isCancelled && (
              <p className="mt-6 inline-flex items-center gap-2 border border-oxblood/50 bg-oxblood/15 px-3 py-1.5 text-sm text-foreground">
                This date is cancelled. Check the calendar for what is next.
              </p>
            )}

            {ev.description ? (
              <p className="dropcap mt-8 max-w-prose whitespace-pre-line font-scripture text-lg text-foreground/85">
                {ev.description}
              </p>
            ) : (
              <p className="mt-8 font-pullquote text-xl italic text-muted-foreground">
                More details coming soon.
              </p>
            )}

            {/* Recap (past events only) */}
            {isPast && recap && (
              <section className="mt-14 border-t border-foreground/15 pt-10">
                <Kicker left="Recap" />
                <div className="mt-6 max-w-prose space-y-5">
                  {recap.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="font-scripture text-lg text-foreground/85">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* RSVP / back nav — no RSVP for past OR cancelled dates */}
            <div className="mt-14 flex flex-wrap items-center gap-6 border-t border-foreground/15 pt-8">
              {!isPast && !ev.isCancelled && ev.registrationUrl && (
                <a
                  href={ev.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="lift inline-flex h-12 cursor-pointer items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
                >
                  RSVP
                  <Icon name="arrow-up-right" size={16} />
                </a>
              )}
              <Link href="/events" className="link-editorial text-sm">
                ← All gatherings
              </Link>
            </div>
          </div>

          {/* Right rail — the particulars */}
          <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-0">
            <p className="folio">The particulars</p>
            <dl className="mt-6 space-y-6">
              <div>
                <dt className="folio">When</dt>
                <dd className="mt-1.5 font-display text-lg">
                  {format(start, "EEEE, MMMM d")}
                  <br />
                  <span className="text-foreground/70">
                    {format(start, "h:mm a")}
                    {end ? ` – ${format(end, "h:mm a")}` : ""}
                  </span>
                </dd>
              </div>
              {ev.location && (
                <div>
                  <dt className="folio">Where</dt>
                  <dd className="mt-1.5 font-display text-lg">{ev.location}</dd>
                </div>
              )}
              {ev.eventType && (
                <div>
                  <dt className="folio">Type</dt>
                  <dd className="mt-1.5 font-display text-lg capitalize">
                    {ev.eventType}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {/* The night, in pictures — inline gallery */}
        {photos.length > 0 && (
          <section className="mt-16 border-t border-foreground/15 pt-10">
            <Kicker left={`The night, in pictures (${photos.length})`} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p, i) => (
                <li key={p.url} className="space-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-foreground/15 bg-foreground/5">
                    <Image
                      src={p.url}
                      alt={p.alt ?? ev.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                      priority={i < 2}
                      unoptimized
                    />
                  </div>
                  {p.caption && (
                    <p className="text-xs italic text-muted-foreground">{p.caption}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
```

(PRESERVE: the cancelled-notice sentence, "More details coming soon.", RSVP conditions `!isPast && !ev.isCancelled && ev.registrationUrl` from the Phase 1 fix wave, "← All gatherings". The dl content — When/Where/Type — is unchanged, restyled into the rail. Photos are display-only, no lightbox, per the spec.)

- [ ] **Step 3: Typecheck + targeted check**

```bash
npx tsc --noEmit
```

With `npm run dev` (the Phase 1 "Tuesday Table" series or any active series in the dev DB):

```bash
curl -s http://localhost:3000/events | grep -o "more date" | head -1   # series fold present when a series has later dates
curl -s http://localhost:3000/events | grep -c "paper-card"            # ≥1 when past gatherings with photos exist
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/events/page.tsx" "src/app/(public)/events/[slug]/page.tsx"
git commit -m "feat(events): ruled upcoming ledger, paper-card past grid, particulars rail on detail"
```

---

### Task 9: Letter + stories elevation

**Files:**
- Rewrite: `src/app/(public)/letter/page.tsx` (the Task 5 move gets its elevation)
- Rewrite: `src/app/(public)/letter/archive/page.tsx` (redirect → real ledger page)
- Modify: `src/app/(public)/letter/[slug]/page.tsx` (typographic pass, enumerated edits)
- Rewrite: `src/app/(public)/stories/page.tsx`

**Interfaces:**
- Consumes: `Kicker`, `StaggerReveal`, Task 1 utilities, `listPublishedEncouragements`/`getPublishedEncouragementBySlug`, `LetterCover`.
- Produces: `/letter` paper-card issue grid, `/letter/archive` full ruled ledger, detail with dropcap + measure, `/stories` ruled editorial list with a try/catch (recon flags the missing one).

- [ ] **Step 1: Elevate the Letter index**

Replace `src/app/(public)/letter/page.tsx` entirely with:

```tsx
import Link from "next/link";
import Image from "next/image";
import { listPublishedEncouragements } from "@/server/encouragements";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { LetterCover } from "@/components/letters/LetterCover";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The Letter — Sheepdog Society",
  description:
    "One letter a week. Scripture, guidance, and a word from the Watch.",
};

export default async function LetterIndexPage() {
  let rows: Awaited<ReturnType<typeof listPublishedEncouragements>> = [];
  try {
    rows = await listPublishedEncouragements();
  } catch {
    rows = [];
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="The Letter" right="Sunday mornings · Read in five minutes" />
          <h1 className="display-xl mt-10 text-display-xl">
            One letter
            <br />
            <em>a week.</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Scripture, guidance, a word from the Watch. Read it before the day
            starts. Save it, carry it, hand it to a brother.
          </p>
        </div>
      </section>

      {/* Issue grid */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          {rows.length === 0 ? (
            <div className="border border-dashed border-foreground/15 p-16 text-center">
              <Icon name="sparkles" size={48} className="mx-auto text-brass" />
              <h2 className="display-soft mt-8 text-2xl md:text-3xl">
                The first encouragement is on the way.
              </h2>
              {/* Copy fix, deliberate: the elevated index has no inline
                  signup form, so "below" would point at nothing. The
                  nearest form lives in the footer. */}
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
                Brothers are writing it. Sign up in the footer to get it the
                moment it lands.
              </p>
            </div>
          ) : (
            <>
              <StaggerReveal
                className="grid gap-6 md:grid-cols-2"
                selector=":scope > a"
              >
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/letter/${row.slug}`}
                    className="paper-card lift group/card block overflow-hidden"
                  >
                    {/* Real uploaded cover wins; else the deterministic SVG
                        keyed by theme so the archive reads as one series. */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      {row.coverImageUrl ? (
                        <Image
                          src={row.coverImageUrl}
                          alt={row.coverImageAlt ?? ""}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
                        />
                      ) : (
                        <LetterCover
                          id={row.id}
                          title={row.title}
                          theme={row.theme}
                          className="h-full w-full transition-transform duration-500 group-hover/card:scale-[1.03]"
                        />
                      )}
                    </div>
                    <div className="p-6 md:p-8">
                      <p className="folio">
                        No. {row.issueNumber}
                        {row.publishDate && (
                          <> · {format(new Date(row.publishDate), "MMM d, yyyy")}</>
                        )}
                      </p>
                      <h3 className="display-soft mt-3 text-2xl md:text-3xl">
                        {row.title}
                      </h3>
                      {row.intro && (
                        <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted-foreground">
                          {row.intro}
                        </p>
                      )}
                      <p className="section-mark mt-5 inline-flex items-center gap-2">
                        Read this week&rsquo;s
                        <Icon
                          name="arrow-right"
                          size={14}
                          className="transition-transform group-hover/card:translate-x-1"
                        />
                      </p>
                    </div>
                  </Link>
                ))}
              </StaggerReveal>
              <div className="mt-10">
                <Link href="/letter/archive" className="link-editorial text-sm">
                  The full archive
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
```

(PRESERVE: metadata, hero H1 + pull-quote, "Read this week's", the cover-fallback rationale. The empty-state's "Sign up below" becomes "Sign up in the footer" — a deliberate copy fix, since this page has no inline form; see the JSX comment.)

- [ ] **Step 2: The real archive ledger**

Replace `src/app/(public)/letter/archive/page.tsx` (the Task 5 redirect) with:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedEncouragements } from "@/server/encouragements";
import { Kicker } from "@/components/public/kicker";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Letter archive — Sheepdog Society",
  description: "Every issue of the Letter, oldest to newest. Scripture, guidance, a word from the Watch.",
};

export default async function LetterArchivePage() {
  let rows: Awaited<ReturnType<typeof listPublishedEncouragements>> = [];
  try {
    rows = await listPublishedEncouragements();
  } catch {
    rows = [];
  }

  return (
    <section className="bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
        <Kicker left="The archive" right={`${rows.length} issue${rows.length === 1 ? "" : "s"}`} />
        <h1 className="display-xl mt-10 text-display-lg">
          Every letter, <em>on the record.</em>
        </h1>

        {rows.length === 0 ? (
          <p className="mt-10 font-pullquote text-lede italic text-muted-foreground">
            The first letter is on the way.
          </p>
        ) : (
          <ul className="mt-10 divide-y divide-foreground/10 border-y border-foreground/15">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/letter/${row.slug}`}
                  className="group grid cursor-pointer gap-2 py-5 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[90px_130px_1fr_auto] md:items-baseline md:gap-6"
                >
                  <span className="section-mark">No. {row.issueNumber}</span>
                  <span className="folio">
                    {row.publishDate
                      ? format(new Date(row.publishDate), "MMM d, yyyy")
                      : ""}
                  </span>
                  <span className="font-display text-lg transition-colors group-hover:text-brass">
                    {row.title}
                  </span>
                  {row.theme && (
                    <span className="folio hidden md:inline">{row.theme}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link href="/letter" className="link-editorial mt-10 inline-block text-sm">
          ← Latest letters
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Detail typographic pass — enumerated edits**

In `src/app/(public)/letter/[slug]/page.tsx` (the Task 5 move; its structure matches the recon's `encouragements/[slug]` inventory), apply exactly these edits, nothing else:

1. Add `import { Kicker } from "@/components/public/kicker";` to the imports.
2. Hero section tag: `className="relative overflow-hidden bg-background text-foreground"` → `className="bg-background text-foreground"`, and DELETE the two decorative divs inside it (`<div className="aurora aurora--soft" aria-hidden />` and `<div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />`), and drop the now-unneeded `relative` from the inner container div's className.
3. Back link classes: `inline-flex items-center gap-2 section-mark text-stone/60 hover:text-brass` → `link-editorial inline-flex items-center gap-2 text-sm text-foreground/70`.
4. H1: `display-xl mt-6 max-w-4xl text-[clamp(2.5rem,7vw,6rem)] text-foreground` → `display-soft mt-6 max-w-4xl text-display-lg`.
5. Intro paragraph: `mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl` → `dropcap mt-10 max-w-2xl font-scripture text-lg text-foreground/85`.
6. Meta row spans: every `section-mark text-stone/55` → `folio`; keep the brass `No. {issueNumber}` mark as `section-mark`.
7. Every band section that is `bg-bone text-ink` → `bg-background text-foreground`; every `bg-background text-foreground` band stays. (Bands now differentiate by hairlines, not color blocks.)
8. Every `§ X` mark-plus-hairline row inside the bands → `<Kicker left="X" />` (e.g. `<Kicker left="This Week" />`, `<Kicker left="Scriptures" />`, `<Kicker left="Guidance" />`, `<Kicker left="Notes from the Watch" />` — the § prefix drops; kickers are folio).
9. Body text tokens: `text-iron/80` → `text-foreground/80`; `text-stone` in the scriptures/notes pull-quotes → `text-muted-foreground`.
10. Footer CTA pair: the bordered `border border-iron bg-background …` link → `lift inline-flex h-11 items-center gap-2 bg-foreground px-6 text-sm font-medium text-background`; the ghost `border border-iron/30 … text-iron hover:border-iron` link → `link-editorial text-sm text-foreground/80` (labels unchanged: "All letters", "Join the brotherhood").
11. The cover section keeps its logic; wrap the existing `aspect-[16/9] overflow-hidden` div's classes with a border: → `aspect-[16/9] overflow-hidden border border-foreground/15`.

- [ ] **Step 4: Elevate /stories**

Replace `src/app/(public)/stories/page.tsx` entirely with:

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";

export const metadata = {
  title: "Stories — Sheepdog Society",
  description:
    "Real stories of transformation from brothers across the Sheepdog Society.",
};

async function getStories() {
  // try/catch added in Phase 2: this was the only public page that threw
  // on a DB hiccup instead of degrading (recon §8).
  try {
    return await db
      .select({
        id: testimonies.id,
        title: testimonies.title,
        content: testimonies.content,
        createdAt: testimonies.createdAt,
        authorFirstName: users.firstName,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt))
      .limit(20);
  } catch {
    return [];
  }
}

export default async function StoriesPage() {
  const stories = await getStories();

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="Stories" right="Told plain" />
          <h1 className="display-xl mt-10 text-display-xl">
            Wolves transformed.
            <br />
            <em>Sheepdogs sent.</em>
          </h1>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            Real stories from brothers across the Sheepdog Society.
          </p>
        </div>
      </section>

      {/* Ruled ledger of stories */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
          {stories.length > 0 ? (
            <ul className="divide-y divide-foreground/10 border-y border-foreground/15">
              {stories.map((story) => (
                <li key={story.id} className="py-10">
                  <article>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="section-mark">
                        {story.authorFirstName || "A brother"}
                      </span>
                      <span className="folio">
                        {format(new Date(story.createdAt), "MMM yyyy")}
                      </span>
                    </div>
                    <h3 className="display-soft mt-4 text-2xl md:text-3xl">
                      {story.title}
                    </h3>
                    <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
                      {story.content.slice(0, 240)}
                      {story.content.length > 240 ? "..." : ""}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-foreground/15 p-16 text-center">
              <Icon name="flame" size={48} strokeWidth={2} className="mx-auto text-brass" />
              <h3 className="display-soft mt-8 text-2xl md:text-3xl">
                Stories on the way.
              </h3>
              <p className="mx-auto mt-4 max-w-md font-pullquote text-lg italic text-muted-foreground">
                Brothers are writing them now.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl border-t border-foreground/15 px-6 py-20 text-center md:px-10 md:py-28">
          <h2 className="display-xl text-display-md">Have a story?</h2>
          <p className="mx-auto mt-6 max-w-xl font-pullquote text-lede italic text-muted-foreground">
            Send it to us. We share what God has done.
          </p>
          <div className="mt-10">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 bg-foreground px-8 text-base font-medium text-background"
            >
              Share your story
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
```

(PRESERVE: hero H1, "Real stories from brothers…", byline fallback "A brother", "Stories on the way." / "Brothers are writing them now.", the whole CTA block copy. Stories have no detail route — cards stay non-links, as today.)

- [ ] **Step 5: Typecheck + targeted check**

```bash
npx tsc --noEmit
```

With `npm run dev`:

```bash
curl -s http://localhost:3000/letter | grep -c "paper-card"                 # ≥1 when letters exist
curl -s http://localhost:3000/letter/archive | grep -o "on the record"      # on the record
curl -s http://localhost:3000/stories | grep -o "Sheepdogs sent" | head -1  # Sheepdogs sent
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/letter" "src/app/(public)/stories/page.tsx"
git commit -m "feat(letter): paper-card index, ledger archive, dropcap detail; stories join the broadsheet"
```

---

### Task 10: Secondary sweep — full furniture + light pass

**Files:**
- Modify (FULL furniture): `src/app/(public)/about/page.tsx`, `src/app/(public)/faq/page.tsx`, `src/app/(public)/what-to-expect/page.tsx`, `src/app/(public)/how-we-gather/page.tsx`, `src/app/(public)/contact/page.tsx`
- Modify (LIGHT pass): `src/app/(public)/giving/page.tsx`, `src/app/(public)/partnerships/page.tsx`, `src/app/(public)/acts-20-28/page.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/sms-terms/page.tsx`
- Modify (DARK-MODE token pass — Step 7): `src/app/(public)/resources/page.tsx`, `src/app/(public)/resources/browser.tsx`, `src/app/(public)/resources/[slug]/page.tsx`, `src/app/(public)/gallery/page.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/admin/check-email/page.tsx`, `src/components/AskTheWatch.tsx`
- Modify: `src/components/icons/Icon.tsx` (Step 8)

This task is the documented deviation from the complete-code rule (see the plan header): every change below is an enumerated substitution against the recon's per-page inventory (`.superpowers/sdd/phase2-recon.md`, "design-plumbing-secondary" report — it lists each page's bands, line ranges, and hardcoded values). ALL page copy is PRESERVE unless a row below says otherwise.

**Roster note (refines spec §2's sweep lists, deliberately):** FAQ is promoted from the spec's lighter-pass list to FULL furniture (it is a top-nav About child and a common first-visit page); giving, partnerships, and acts-20-28 join the light pass (the spec named only faq/privacy/sms-terms); the light pass includes T2 kickers beyond the spec's "tokens, type, spacing only" because a Kicker swap is a pure class substitution; and resources/gallery/(auth) join as a dark-mode-only token pass in Step 7 — the spec's "all public routes get the treatment" makes them in-scope, and Task 1's `.dark` flips would otherwise ship them broken in dark mode.

**The shared transformation checklist (apply top to bottom on each page):**

- **T1 — Heroes:** `relative overflow-hidden bg-bone text-ink` (or `bg-background` + effects) → plain `bg-background text-foreground`; DELETE the `.aurora`/`.dotted-grid` layer divs on the page and any now-orphaned `relative` on the inner container. (Composition over effects; the utilities stay defined for admin.)
- **T2 — Kickers:** every `<span className="section-mark…">§ Label</span>` + `<div className="hairline flex-1" />` pair that opens a section → `<Kicker left="Label" />` (drop the `§ ` prefix; import `Kicker` from `@/components/public/kicker`). Inline `.section-mark` badges/roman numerals NOT paired with a hairline keep their current text and class.
- **T3 — Display scale:** hero H1 `display-xl … text-[clamp(…)]` → `display-xl text-display-xl`; section H2s → `display-xl text-display-lg` (or `display-soft text-display-md` for card/step titles); the brass second line `<span className="text-brass">…</span>` → `<em>…</em>`.
- **T4 — Token swaps (mechanical):** `text-ink` → `text-foreground` · `text-iron` → `text-foreground` · `text-iron/70`/`/60`/`/55`/`/40` → `text-muted-foreground` (or `text-foreground/70` where it reads as body copy) · `border-iron/N` → `border-foreground/N` · `divide-stone/15`/`divide-iron/N` → `divide-foreground/10` · `bg-bone` bands → `bg-background` (band rhythm now comes from Kickers + hairlines, not color blocks) · `bg-bone`/`bg-cream` CARDS → `bg-card border border-foreground/15` · `text-stone` body copy → `text-muted-foreground` (labels become `.folio`).
- **T5 — Buttons:** `border-bone bg-bone text-ink hover:bg-stone` (and the `border-iron bg-background` variants) → primary `lift inline-flex h-12 items-center gap-2 bg-foreground px-7 text-base font-medium text-background`; secondary → `link-editorial`. Brass fills stay `bg-brass text-iron hover:bg-gold`. One primary CTA per screen.
- **T6 — Pull-quote ledes:** `font-pullquote text-xl italic … text-iron/70` → `font-pullquote text-lede italic text-muted-foreground`.
- **T7 — Voice gate:** scan every line you touched for banned words and em-dashes (PRESERVE copy is exempt from rewording but not from the scan — flag, don't fix, if found in PRESERVE).
- **T8 — UX checks (MASTER.md):** tap targets ≥44px on anything clickable you touched; `cursor-pointer` present on non-Link clickables; no horizontal scroll at 375px (verify by eye in Task 12).

**Per-page specifics (on top of T1–T8):**

- [ ] **Step 1: `/about` (recon: 6 bands, 221 lines)**
  1. T1–T6 throughout (hero clamp 2.5–6.5rem → `text-display-xl`).
  2. The "Foundation — Acts 20:28" band (band 3, `bg-bone` with a brass-left-border blockquote): convert the SECTION to `className="ember-band"` and the blockquote to `font-pullquote text-2xl italic leading-relaxed md:text-4xl` with a `§ Acts 20:28` `.section-mark` above it — this is the page's one dark interlude (Model rules). Remove the brass left border.
  3. The 3 convictions cards (`spotlight lift bg-bone` in a `gap-px` grid): → `spotlight lift bg-card border border-foreground/15` (spotlight stays; it is a kept utility).
  4. Culture `<ol>`: `divide-y divide-stone/15 border-y` → `divide-y divide-foreground/10 border-y border-foreground/15`.
  5. Wrap the convictions grid in `<StaggerReveal className="…">` (import it from `@/components/motion/StaggerReveal`; move the grid classes onto the StaggerReveal), the page's one motion moment.
- [ ] **Step 2: `/faq` (recon: 3 bands; hero and body are BOTH `bg-bone` and visually merge; body has `pb-28` and no top padding)**
  1. T1–T6; give the body section its own `pt-4 md:pt-8` so the accordion doesn't crowd the hero lede.
  2. `AccordionTrigger` currently styled `display-xl`: → `font-display text-lg md:text-xl text-left` (accordion questions are not display type).
  3. The CTA band's raw `<a href="/contact">` → next/link `<Link href="/contact">` with the T5 primary classes (recon flags the raw anchor).
- [ ] **Step 3: `/what-to-expect` (recon: 5 bands, inverted hero with `opacity-[0.04]` grid)**
  1. T1–T6 (the hero loses aurora + dotted-grid like every other page).
  2. The verse-plate band (band 3, `bg-background` Acts 20:28 blockquote) → `.ember-band` treatment as on `/about`.
  3. The `TABLE_RHYTHM` step titles use `font-display font-semibold` (recon: mixed heading pattern) — normalize to `display-soft text-display-md`.
  4. CTA pair (hrefs already `/groups` + `/join?path=start` from Task 4): brass-filled primary stays brass (`bg-brass text-iron hover:bg-gold`); outline secondary → `link-editorial`.
- [ ] **Step 4: `/how-we-gather` (recon: 4 bands, rhythms ledger `md:grid-cols-[120px_1fr_240px]`)**
  1. T1–T6. The rhythms `<ol>` IS already a ruled ledger — keep its grid, swap `divide-stone/15` per T4.
  2. The rhythm-I notes' `h-px w-3 bg-brass` dash markers stay (brand mark, fine at any size).
  3. The CTA band's two shadcn Buttons: primary keeps `Button asChild` but with T5 primary classes; secondary → plain `link-editorial` Link (drop the second Button).
- [ ] **Step 5: `/contact` (recon: the ONLY fully-client secondary page; SEO via raw `<title>`/`<meta>` JSX)**
  1. T1–T6 on both bands; the local `Field` helper's `border-stone/25` inputs → `border-foreground/20`, labels → `.folio`.
  2. Keep `"use client"`, the hoisted `<title>` tags, and the `Magnetic`-wrapped submit (hover micro-motion, not scroll motion — allowed). Document in the commit body: metadata-API conversion deferred, accepted gap.
- [ ] **Step 6: LIGHT pass — `/giving`, `/partnerships`, `/acts-20-28`, `/privacy`, `/sms-terms`**
  Apply ONLY T1–T4 + T6 (tokens, type scale, kickers) — no structural moves, no motion, no ember bands:
  1. `/giving`: keep the `Spotlight` ways-to-give cards (`bg-bone` → `bg-card border border-foreground/15`). The dead `#give-online`/`#give-partner` anchors stay as-is (no giving platform is wired; the page is nav-hidden — recon note carried, not fixed).
  2. `/partnerships`: the CTA button oddity `border-iron bg-background text-foreground` on a constant band → T5 primary.
  3. `/acts-20-28`: VersePlate + all verse/exposition copy PRESERVE verbatim; T2 the `§ Acts 20:28 · NIV` mark stays a `.section-mark` (scripture mark, not a kicker); CTA already `/join` from Task 6.
  4. `/privacy` + `/sms-terms`: single `bg-bone max-w-3xl` band → `bg-background`; `display-xl` clamp → `text-display-lg`; section h2s `font-display` stays; ALL policy/TCPA copy byte-preserved ("We do not sell or share mobile opt-in data…", STOP/HELP language, quiet hours, "Last revised · April 2026" untouched).
- [ ] **Step 7: Dark-mode token pass — /resources, /gallery, the (auth) flow, AskTheWatch**

These surfaces are nav-linked or auth-critical, still wear the retired iron/bone grammar, and no other task touches them. Apply the T4 table mechanically (no structural changes, no kickers, no motion — this is survival, not elevation). Verifier-confirmed anchors:

1. `src/app/(public)/resources/browser.tsx`: hero band `bg-bone text-ink` (L129) → `bg-background text-foreground`; raw `text-brass` on the light band (L140) → `text-brass-deep`; `text-iron/70` (L142) → `text-muted-foreground`; card titles `text-iron` (L585, L634, L767) → `text-foreground`; photo/cover badges `bg-iron/85 … text-bone` (L733, L756) → `bg-foreground/85 … text-background`; sticky filter bar (L741) `bg-bone/95 text-iron` → `bg-background/95 text-foreground`, and retune its `sticky top-16` (L158, tuned to the OLD navbar) to the new slim nav: `top-[61px]` (nav = 2×py-2 + h-11 + 1px border; confirm the rendered height at Task 12 point 4 and adjust ±1px there if it gaps). Then `grep -n "bg-bone\|text-ink\|text-iron\|text-bone\|bg-iron\|border-iron" src/app/\(public\)/resources/browser.tsx` and T4-swap every remaining hit.
2. `src/app/(public)/resources/page.tsx` + `src/app/(public)/resources/[slug]/page.tsx`: same grep-driven T4 swap (detail anchors: `bg-bone text-ink` bands L68/L156, `display-xl … text-iron` H1 L206, action buttons L229–285).
3. `src/app/(public)/gallery/page.tsx` (admin-only but public-layout tokens): `bg-iron text-bone` hero (L22) → `bg-background text-foreground` (dark editorial mood is fine to keep via the page's own classes IF expressed semantically); grep-driven T4 swap on L22–93.
4. `src/app/(auth)/layout.tsx`: `bg-bone text-ink` → `bg-background text-foreground`. Do NOT wrap the layout in `.admin-shell` — in LIGHT mode admin-shell flips bone to a deep ink value and would turn the whole auth canvas dark. The sign-in PAGE needs nothing: its own wrapper already carries `admin-shell` (sign-in/page.tsx line 36), and Task 1's `.dark .admin-shell` ink/cream restores keep its brass button and bone text correct in both themes.
5. `src/app/(auth)/admin/check-email/page.tsx`: both `hover:text-iron` link states (the "Try again" and "Email Drew" links) → `hover:text-foreground`. `text-olive`/`text-stone` are theme-aware tokens and stay.
6. `src/components/AskTheWatch.tsx`: `grep -n "bg-bone\|bg-iron\|text-ink\|text-iron\|text-bone" src/components/AskTheWatch.tsx` and T4-swap every hit (brass fills keep `text-iron`).

- [ ] **Step 8: Icon consistency pass (MASTER.md: stroke 1.75, optical 16/20/24)**

In `src/components/icons/Icon.tsx`, change the default `strokeWidth` for stroke-variant glyphs from `2.25` to `1.75` (the default sits in the props destructuring / group stroke near the bottom of the file — recon §5 of the design-plumbing report). Explicit per-call `strokeWidth` props keep winning. This is the spec §2 "icon set consistency pass"; it touches admin rendering too, which is intended. Size usage is already 14/16/24-ish per call site — do NOT sweep call sites, only the default weight.

- [ ] **Step 9: Sweep gate**

```bash
grep -rn "bg-bone\|bg-cream\|bg-iron\|text-ink\|text-bone\|text-iron\|border-iron\|divide-iron\|divide-stone" "src/app/(public)" src/components/public --include='*.tsx'
```

Expected: the only remaining matches are `text-iron` on the SAME line as `bg-brass` (the allowed brass-fill pairing — events RSVP, what-to-expect primary). Anything else gets the T4 swap — Step 7 already covered /resources and /gallery, so no directory in the grep scope is exempt. (`MemberSignup` was swept in Task 6; `AskTheWatch` in Step 7; `LetterCover` renders self-contained SVG gradients and is theme-agnostic; admin chrome is out of scope by design.)

- [ ] **Step 10: Typecheck + commit**

```bash
npx tsc --noEmit   # expected: no errors
git add "src/app/(public)" "src/app/(auth)" src/components/icons/Icon.tsx src/components/AskTheWatch.tsx
git commit -m "feat(design): broadsheet sweep across secondary pages, dark-mode pass on resources/gallery/auth, icon stroke pass"
```

---

### Task 11: Redirects, SEO, and accessibility audit

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts` (NEITHER exists today — CLAUDE.md's claim is stale, recon §8; only `src/app/manifest.ts` exists)
- Create: `scripts/check-contrast.mjs`
- Modify: `package.json` (script), `src/app/layout.tsx` (the deferred `defaultTheme="system"` flip)

**Interfaces:**
- Consumes: canonical routes from Tasks 4–9; `locations.slug`; `listPublishedEncouragements`; the completed sweep (Tasks 7–10) — which is exactly why the theme default flips HERE and not in Task 1.
- Produces: `/sitemap.xml`, `/robots.txt`, `npm run check:contrast` (Task 12 gate), the verified redirect matrix, and `defaultTheme="system"` (spec §2). Middleware already allowlists `/sitemap.xml` + `/robots.txt` (middleware.ts lines 61–62).

- [ ] **Step 1: Create `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { db } from "@/db";
import { events, locations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { listPublishedEncouragements } from "@/server/encouragements";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

/**
 * Canonical public URLs only — every legacy path (/locations*,
 * /encouragements*, /get-started, /groups/start) 308s via next.config.ts
 * and must NOT appear here. Each dynamic block degrades to nothing on a
 * DB hiccup so the sitemap never 500s.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/groups",
    "/events",
    "/letter",
    "/letter/archive",
    "/join",
    "/resources",
    "/about",
    "/stories",
    "/how-we-gather",
    "/what-to-expect",
    "/faq",
    "/contact",
    "/acts-20-28",
    "/giving",
    "/partnerships",
    "/privacy",
    "/sms-terms",
  ].map((p) => ({ url: `${SITE}${p}`, lastModified: now }));

  let groupRoutes: MetadataRoute.Sitemap = [];
  try {
    // Intersection of BOTH visibility gates: the /groups list shows
    // displayedOnMap+isActive, but the detail page 404s unless
    // status='active' (preserved gate mismatch, Task 4 Interfaces).
    // A sitemap row must satisfy the DETAIL gate or crawlers get 404s.
    const rows = await db
      .select({ id: locations.id, slug: locations.slug, updatedAt: locations.updatedAt })
      .from(locations)
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true),
          eq(locations.status, "active")
        )
      );
    groupRoutes = rows.map((r) => ({
      url: `${SITE}/groups/${r.slug ?? r.id}`,
      lastModified: r.updatedAt ?? now,
    }));
  } catch {
    /* degrade to static routes */
  }

  let letterRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await listPublishedEncouragements();
    letterRoutes = rows.map((r) => ({
      url: `${SITE}/letter/${r.slug}`,
      lastModified: r.publishDate ? new Date(r.publishDate) : now,
    }));
  } catch {
    /* degrade */
  }

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ id: events.id, startTime: events.startTime })
      .from(events)
      .where(eq(events.isCancelled, false))
      .orderBy(desc(events.startTime))
      .limit(100);
    eventRoutes = rows.map((r) => ({
      url: `${SITE}/events/${r.id}`,
      lastModified: r.startTime,
    }));
  } catch {
    /* degrade */
  }

  return [...staticRoutes, ...groupRoutes, ...letterRoutes, ...eventRoutes];
}
```

- [ ] **Step 2: Create `src/app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /gallery is an admin tool behind login; keep crawlers off the
        // sign-in bounce. /admin and /api are never content.
        disallow: ["/admin", "/api", "/gallery"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Create `scripts/check-contrast.mjs` + wire the script**

```js
#!/usr/bin/env node
/**
 * WCAG AA contrast gate for the Pasture & Iron token pairs, BOTH themes.
 * Parses src/app/globals.css (top-level :root and .dark blocks only —
 * .admin-shell overrides are admin chrome, out of scope), converts
 * oklch()/hex to relative luminance, and fails (exit 1) if any declared
 * pair misses its threshold. Run: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const cssPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/app/globals.css"
);
const css = readFileSync(cssPath, "utf8");

/** Merge every top-level `selector { ... }` block's custom properties. */
function collectVars(selector) {
  const vars = {};
  // Match `:root {` / `.dark {` exactly (not `.dark .admin-shell {`).
  const re = new RegExp(
    String.raw`(^|\n)\s*${selector.replace(".", "\\.")}\s*\{([^}]*)\}`,
    "g"
  );
  for (const m of css.matchAll(re)) {
    for (const d of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars[`--${d[1]}`] = d[2].trim();
    }
  }
  return vars;
}

const light = collectVars(":root");
const dark = { ...light, ...collectVars(".dark") };

function resolve(vars, value) {
  let v = value;
  for (let i = 0; i < 4 && /^var\(/.test(v); i++) {
    const name = v.match(/^var\((--[\w-]+)\)/)?.[1];
    if (!name || !(name in vars)) return null;
    v = vars[name];
  }
  return v;
}

// 0.03928 is WCAG 2.1's published relative-luminance crossover (the IEC
// sRGB constant is 0.04045; no 8-bit value falls between them, but we
// match the spec byte-for-byte).
const srgbToLinear = (c) =>
  c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

function hexToLinear(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) =>
    srgbToLinear(parseInt(full.slice(i, i + 2), 16) / 255)
  );
}

/** oklch() -> linear sRGB (standard OKLab matrices). */
function oklchToLinear(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function toLuminance(value) {
  const v = value.trim();
  let rgb;
  if (v.startsWith("#")) rgb = hexToLinear(v);
  else {
    const m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
    if (!m) return null;
    rgb = oklchToLinear(+m[1], +m[2], +m[3]);
  }
  const [r, g, b] = rgb.map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(bg, fg) {
  const [hi, lo] = [Math.max(bg, fg), Math.min(bg, fg)];
  return (hi + 0.05) / (lo + 0.05);
}

// (bgVar, fgVar, min, label). Literal hex allowed for the ember constants.
const PAIRS = [
  ["--background", "--foreground", 4.5, "body text"],
  ["--background", "--muted-foreground", 4.5, "muted body text"],
  ["--card", "--card-foreground", 4.5, "card text"],
  ["--background", "--c-stone", 4.5, "folio small print"],
  ["--background", "--c-brass-deep", 4.5, "section marks / brass-colored text"],
  ["--background", "--c-oxblood", 3.0, "oxblood display ems (display size)"],
  ["--c-brass", "--c-iron", 4.5, "brass fill + iron text (CTA)"],
  ["--c-bone", "--c-ink", 4.5, "legacy bone/ink safety net"],
  ["#1c1610", "#efe7d5", 4.5, "ember band body"],
  ["#1c1610", "#c9834a", 4.5, "ember band copper kicker"],
];

let failed = false;
for (const [themeName, vars] of [
  ["light", light],
  ["dark", dark],
]) {
  console.log(`\n=== ${themeName} ===`);
  for (const [bgKey, fgKey, min, label] of PAIRS) {
    const bgRaw = bgKey.startsWith("#") ? bgKey : resolve(vars, vars[bgKey] ?? "");
    const fgRaw = fgKey.startsWith("#") ? fgKey : resolve(vars, vars[fgKey] ?? "");
    const bg = bgRaw ? toLuminance(bgRaw) : null;
    const fg = fgRaw ? toLuminance(fgRaw) : null;
    if (bg == null || fg == null) {
      console.log(`  ?? ${label}: could not resolve ${bgKey} / ${fgKey}`);
      failed = true;
      continue;
    }
    const r = ratio(bg, fg);
    const ok = r >= min;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? "OK " : "FAIL"} ${label}: ${r.toFixed(2)}:1 (needs ${min}:1) [${bgKey} vs ${fgKey}]`
    );
  }
}
process.exit(failed ? 1 : 0);
```

In `package.json` scripts, after `"test": "vitest run"`, add:

```json
    "check:contrast": "node scripts/check-contrast.mjs"
```

Run it:

```bash
npm run check:contrast
```

Expected: every pair OK in both themes, exit 0. If a pair fails, darken the light-theme value (or lighten the dark-theme one) in `globals.css` until it passes — the script is the authority, and the adjusted hex goes in the commit body. Do NOT relax a threshold.

- [ ] **Step 4: Flip the theme default to system (deferred from Task 1)**

The sweep is complete (Tasks 7–10), so every public surface now has a real dark variant — dark-OS visitors can safely get dark by default. In `src/app/layout.tsx`, in the `ThemeProvider`, change `defaultTheme="dark"` to `defaultTheme="system"` and nothing else. (Spec §2; CLAUDE.md is corrected in Task 12.)

- [ ] **Step 5: Verify the full redirect matrix**

With `npm run dev` running:

```bash
for pair in \
  "/locations /groups" \
  "/locations/request /join?path=start" \
  "/encouragements /letter" \
  "/get-started /join" \
  "/groups/start /join?path=start"; do
  set -- $pair
  echo "$1 -> $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "http://localhost:3000$1")"
done
```

Expected: every line reports `308` with the mapped destination. Then the dynamic one: take any live location UUID (`SELECT id, slug FROM locations LIMIT 1` via the migration script's env, or from `/groups` page source) and:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/locations/<uuid>
# expected: 308 .../groups/<uuid>
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/groups/<uuid>"
# expected: 308 .../groups/<slug>  (the uuid branch settles on the pretty slug)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/letter/<any-published-slug>"
# expected: 200; and /encouragements/<same-slug> gives 308 to it
```

- [ ] **Step 6: Metadata/OG spot-checks on every moved page**

```bash
for p in /groups /letter /join; do
  echo "== $p"; curl -s "http://localhost:3000$p" | grep -o "<title>[^<]*</title>"
done
curl -s http://localhost:3000/sitemap.xml | grep -c "<loc>"     # expected: >= 18 (statics) + dynamics
curl -s http://localhost:3000/sitemap.xml | grep -c "locations\|encouragements\|get-started"  # expected: 0
curl -s http://localhost:3000/robots.txt                          # expected: sitemap line + disallow /admin /api /gallery
```

Expected titles: "Groups — Sheepdog Society", "The Letter — Sheepdog Society", "Join — Sheepdog Society". Also confirm `/groups/<slug>` and `/letter/<slug>` emit their `generateMetadata` titles.

- [ ] **Step 7: Focus-visible audit (static)**

```bash
grep -rn "outline-none\|outline-hidden" "src/app/(public)" src/components/public --include='*.tsx'
```

For every hit, confirm the same element carries a visible focus affordance (`focus:border-brass` on inputs is the house pattern). The Task 1 global `:focus-visible` ring covers everything that does NOT suppress outlines. Fix any element that suppresses the outline with no replacement.

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/sitemap.ts src/app/robots.ts scripts/check-contrast.mjs package.json src/app/layout.tsx
git commit -m "feat(seo): sitemap + robots for canonical URLs, AA contrast gate, theme default goes system"
```

---

### Task 12: Full verification + docs + final review + PR

**Files:**
- Modify: `CLAUDE.md`

This task is run BY THE CONTROLLER (browser access). Implementer subagents stop at Task 11.

- [ ] **Step 1: Static gates**

```bash
npm test                                        # expected: recurrence + slug suites, all green
npx tsc --noEmit                                # expected: no errors
npm run lint                                    # expected: no NEW errors (the pre-existing admin/events warning noted in Phase 1 is tolerated)
npm run check:contrast                          # expected: all pairs OK, both themes
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run build   # expected: production build succeeds
```

(The `DATABASE_URL` override is the known env fact: a build-mode env file still carries a dead Supabase-era var that breaks the pooled URL during `next build`. Do not "fix" the env file in this phase.)

- [ ] **Step 2: Authenticated smoke session setup**

Mint an admin session exactly the way Phase 1 Task 10 did (`.superpowers/sdd/progress.md`, Task 10 entries): ephemeral `AUTH_SECRET`, minted `authjs.session-token` JWE, seeded smoke admin, all against the isolated Neon dev branch. Do not re-derive the method and do not smoke against production data. Dev server via `npm run dev`.

- [ ] **Step 3: Browser smoke (controller, desktop 1440×900 + mobile 375×812, BOTH themes)**

1. **Masthead scroll behavior (1440):** on `/`, the folio topbar and the crest masthead scroll away; ONLY the slim nav pins, translucent with blur; the right crest renders mirrored (`-scale-x-100`, sheepdogs face the wordmark).
2. **Mobile nav (375):** single-row masthead (crest + wordmark + Acts 20:28 folio, toggle + hamburger); slide-down panel lists every link incl. About children; "Join" CTA full-width; panel closes on navigation; no horizontal scroll anywhere; tap targets ≥44px.
3. **Admin-only Gallery tab:** signed OUT — no Gallery tab, `/gallery` bounces to `/admin/sign-in`. Signed IN (minted session) — Gallery tab appears between The Letter and Resources on desktop AND in the mobile panel; `/gallery` loads.
4. **Theme:** toggle light↔dark on EVERY rebuilt/swept page (`/`, `/groups`, `/groups/[slug]`, `/events`, `/events/[slug]`, `/letter`, `/letter/[slug]`, `/letter/archive`, `/join`, `/join?path=start`, `/stories`, `/about`, `/faq`, `/what-to-expect`, `/how-we-gather`, `/contact`, `/acts-20-28`, `/giving`, `/partnerships`, `/privacy`, `/sms-terms`, `/resources`, one `/resources/[slug]`, `/admin/sign-in`, `/admin/check-email`, and `/gallery` while signed in): no pinned-light cards in dark mode, no dark-on-dark text, ember bands identical in both themes. On `/resources`, confirm the sticky filter bar sits flush under the pinned nav (Task 10 Step 7 retune, adjust ±1px if it gaps). Fresh private window with OS dark mode → site opens dark (system default, flipped in Task 11).
5. **Redirect matrix:** re-run the Task 11 Step 5 loop; every 308 lands.
6. **/groups:** map renders with pins; search filters the ledger live; day filter works; a ledger row opens `/groups/[slug]`; the interest form submits and shows "Thank you, brother…"; a legacy `/locations/<uuid>` URL chains 308→308 to the pretty slug.
7. **/join:** join path shows the group picker (a `?group=<id>` URL preselects it); MemberSignup submits through to the covenant card; `?path=start` shows the plant form; plant form submits to "Request received."; the five principles ledger renders.
8. **Homepage:** all 8 sections in spec order; gatherings strip shows live series data with "Every Tuesday"-style labels; ember verse band renders with the copper kicker; dropcap on the lede; reveals fire once on scroll (no re-trigger scrolling back up).
9. **/events:** upcoming ledger groups series (badge + "+ N more dates" fold opens); past paper-cards show cover, hover zoom, "N PHOTOS" badge; detail shows particulars rail, dropcap description, inline "The night, in pictures (N)" grid with captions; a cancelled instance shows the notice, is absent from the index, and hides its RSVP button.
10. **/letter:** index paper-cards; detail dropcap + Kicker sections; archive ledger rows link through; an old `/encouragements/<slug>` email URL 308s to the letter.
11. **Reduced motion:** with the OS/devtools `prefers-reduced-motion: reduce`, every page renders fully visible with zero scroll animation.
12. **Keyboard:** tab through the masthead and one form — 2px brass focus ring visible in both themes; skip-link behavior unharmed.
13. **Console:** no new errors on any page above (Mapbox token warnings excepted if the local env lacks the token).
14. **375px sweep:** every page in point 4 at 375px — no horizontal scroll, ledgers stack, particulars rail moves above/below content per its `border-t-2` mobile treatment.

Fix-forward anything that fails, re-run the relevant gate, and record fixes as `fix(scope): …` commits.

- [ ] **Step 4: Update CLAUDE.md**

1. `## Stack` → the `**Brand**:` bullet, replace with:

```md
- **Brand**: Pasture & Iron palette (bone, iron, navy, brass, olive, oxblood, stone) + Fraunces variable (display, opsz/SOFT/WONK, broadsheet masthead system) + Cormorant Garamond (pull-quotes/scripture) + Inter (UI/body/folio) + Merriweather (scripture + lede serif) + JetBrains Mono (section marks). Barlow Condensed retired 2026-07-08.
```

2. `## Stack` → the `**Theme**:` bullet, replace with:

```md
- **Theme**: next-themes, default SYSTEM (public + admin follow the OS; toggle in the masthead). True dual theme on public pages: bone/cream/ink flip in `.dark`, iron stays constant (globals.css contract comment).
```

3. `## Commands` block, add after the `npm test` line:

```bash
npm run check:contrast  # WCAG AA math over the globals.css token pairs, both themes
```

4. `## Active Routes` → replace the entire `**Public (`(public)`):**` line with:

```md
**Public (`(public)`):** `/`, `/groups`, `/groups/[slug]`, `/events`, `/events/[slug]`, `/letter`, `/letter/[slug]`, `/letter/archive`, `/join` (`?path=start` = plant-a-group), `/resources`, `/resources/[slug]`, `/about`, `/stories`, `/how-we-gather`, `/what-to-expect`, `/faq`, `/contact`, `/acts-20-28`, `/giving`, `/partnerships`, `/privacy`, `/sms-terms`. `/gallery` sits in `(public)` but is login-gated (admin tool; nav tab renders for admins only). Legacy 308s live in `next.config.ts` `redirects()`: `/locations*`, `/encouragements*`, `/get-started`, `/groups/start`.
```

5. `## Active Routes` → replace the `**SEO:**` line with:

```md
**SEO:** `/sitemap.xml` + `/robots.txt` (from `src/app/sitemap.ts` / `robots.ts`, added Phase 2). No feed.xml.
```

- [ ] **Step 5: Commit docs, push, PR**

```bash
git add CLAUDE.md
git commit -m "docs: Phase 2 routes, Fraunces brand system, system theme default, SEO files"
git push -u origin feat/site-elevation-phase2
gh pr create --title "Phase 2: IA + design elevation (broadsheet editorial)" --body "$(cat <<'EOF'
## Summary
- Canonical IA: /groups (locations-backed, new slug column via migration 0015), /letter (encouragements-powered), /join (one page, two paths); every legacy URL 308s via next.config.ts
- Broadsheet design system per design-system/sheepdog-society/MASTER.md: Fraunces variable display type, three-row masthead with mirrored crests, kicker rows, ruled ledgers, paper-cards, ember-band verse interludes, drop caps
- True dual theme (system default) with a programmatic AA contrast gate (npm run check:contrast), anime.js v4 scroll reveals (reduced-motion safe), sitemap + robots
- Admin-only Gallery nav preserved; Phase 1 recurring-events behavior (series folds, cancelled tombstones, RSVP rules) untouched and re-verified

## Verification
- npm test / tsc --noEmit / lint / check:contrast / production build: green
- Full redirect matrix curled (all 308)
- Controller browser smoke: masthead scroll + mobile nav + admin gallery tab + both themes on every rebuilt page + reduced motion + 375px sweep

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Pushing `drizzle/0015_locations_slug.sql` triggers the migration GH Action against production. It already ran locally in Task 4; the re-run only backfills rows created slug-less since then (both insert paths now set slugs, so normally zero), and it aborts LOUDLY if an admin renamed a location into a slug collision — a red Action there means resolve the duplicate slug, not a broken migration.

- [ ] **Step 6: Post-deploy check**

After the Vercel deploy: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.acts2028sheepdogsociety.com/locations` → `308 …/groups`; spot-check `/`, `/groups`, `/letter` render; `/sitemap.xml` serves; old broadcast-email URL shape `/encouragements/<slug>` still lands on the letter.
