# Sheepdog Society — Site Elevation Design

**Date:** 2026-07-08
**Status:** Approved by Drew (brainstorming session, sections 1–6 approved individually)
**Scope:** One unified spec, implemented as 4 independently shippable phases.

## Context

The site (acts2028sheepdogsociety.com, Next.js 16 / Drizzle / Neon / Tailwind v4) is fully public; only admins log in (architecture decision 2026-04-29). Drew's asks, verified against the codebase:

1. **Recurring events bug** — the `events` table has `isRecurring` / `recurrenceRule` / `eventType` columns (`src/db/schema.ts:509-542`) but nothing writes or expands them. Admin-created "weekly" events are single dated rows; weekly gatherings silently vanish from `/events` after their one date passes.
2. **Design feels "blah and dated"** — keep the Pasture & Iron brand, elevate the execution.
3. **Flow is not logical** — nav labels don't match URLs (Groups→`/locations`, Letter→`/encouragements` while `/letter` also exists); four overlapping join entry points (`/join`, `/get-started`, `/groups/start`, `/locations/request`).
4. **Resources/icons automation** — enrichment is semi-automated; Claude tagging, clustering, and cover generation are manual per-section buttons.
5. **Built-in ESV Bible** — legacy multi-provider Bible code exists (`src/lib/bible/`, ESV via `ESV_API_KEY`) but is orphaned in the decommissioned member area.

**Tooling decision:** ui-ux-pro-max drives design intelligence (styles, palettes, type, UX guidelines). 21st.dev Magic MCP is **not** used for component generation — generated template components would dilute the hand-built editorial brand. web-animation skill (anime.js v4) drives motion.

## Decisions (from brainstorming Q&A)

| Question | Decision |
|---|---|
| Recurrence model | **Series + auto-materialized instances** (real event rows per occurrence) |
| Design scope | **Elevate the existing brand** (keep Pasture & Iron identity) |
| Bible scope | **Public reader + instant search** at `/bible` |
| Resources automation | **Zero-click on add + AI covers for everything** (SVG as placeholder/failure fallback) |
| Execution | **Approach A:** one spec, 4 shippable phases, recurrence first |
| Gallery visibility | **Admin-only** (Drew, 2026-07-08): no public Gallery tab; `/gallery` stays login-gated; public photos surface via past gatherings on `/events` |

## Section 1 — Information architecture

One conversion path: **discover → find a group → show up.**

**Public nav:** Home · Groups (`/groups`) · Events (`/events`) · The Letter (`/letter`) · Bible (`/bible`, new) · Resources (`/resources`) · About (dropdown: About, Stories, How we gather, What to expect, FAQ, Contact, Acts 20:28). Single CTA: **Join** → `/join`.

**Gallery is admin-only (Drew, 2026-07-08):** no public Gallery tab. `/gallery` stays login-gated (it already is in middleware; the stale public nav link was removed the same day). Photos reach the public through past gatherings on `/events` and the homepage photo strip.

**URL consolidation (all old URLs 308-redirect):**
- `/groups` becomes the canonical public surface, **backed by the `locations` table** (the live locator data: map, meeting day/time, contact). The legacy `groups`-table-backed public pages are retired — that table belongs to the decommissioned member model. `locations` gains a `slug` column (additive) for pretty URLs; `/locations` → `/groups` and `/locations/[id]` → `/groups/[slug]` via id→slug lookup. Map + list + start-a-group CTA all live on `/groups`.
- `/encouragements`, `/encouragements/[slug]` → `/letter`, `/letter/[slug]`. Note: today `/letter` redirects **to** `/encouragements` (consolidation went the wrong direction for branding — the page is titled "The Letter"). We flip it: the `encouragements` content type keeps powering the pages, but the public URL matches the public name. The dormant legacy `letters` table stays dormant.
- `/get-started`, `/groups/start`, `/locations/request` → `/join` (one page, two paths: join a group / start a group; start path embeds the existing plant-request form)

**Homepage narrative:** hero (one promise, one CTA) → Acts 20:28 (why) → how it works (3 steps) → next gatherings strip (fed by recurring instances, never empty) → latest Letter → recent-gatherings photo strip (fed by past events with photos, not a public gallery) → story/testimony → final Join CTA.

**Not changing:** admin routes, internal content-type names (`encouragements` tables/APIs), the sign-in flow.

## Section 2 — Design system elevation

Keep: iron/bone/brass palette, Barlow Condensed display, Cormorant scripture quotes, Inter body, custom ~60-icon SVG set, editorial voice ("Jeremy" rules in CLAUDE.md).

Rebuild:
- **Typography:** fluid `clamp()` type scale; Barlow Condensed 900 reserved for display; body measure 65–75ch; scripture pull-quotes get prominence.
- **True dual-theme:** full token pass so every public surface (including editorial cards currently pinned light) has a real dark variant. WCAG AA verified in both themes with automated contrast checks. Default theme = `system` (resolves code-default-dark vs CLAUDE.md-default-light contradiction; CLAUDE.md updated to match).
- **Motion:** anime.js v4 (never v3 syntax) — scroll-triggered reveals, staggered card entrances, hero micro-motion. Fast and subtle; `prefers-reduced-motion` honored everywhere.
- **Imagery:** one photo treatment (iron/brass duotone overlay, uniform radii/aspect ratios) across gallery, events, resources.
- **Components:** elevated card/button/section-header system refining existing utilities (`.glass-card`, `.aurora`, `.section-mark`, `.hairline`); icon set consistency pass (stroke weight, optical sizing).
- **Mobile:** rebuilt slide-over nav with the same single-CTA hierarchy; ≥44px tap targets; every public page audited at 375px.
- **Sweep:** all public routes get the treatment; secondary pages (FAQ, privacy, sms-terms) get the lighter pass (tokens, type, spacing only).

## Section 3 — Recurring events

**Schema (additive migration via `scripts/apply-neon-migration.mjs`; never `drizzle-kit push`):**
- New `event_series`: `id`, `title`, `description`, `cadence` (`weekly` | `biweekly` | `monthly_nth_weekday`), `dayOfWeek`, `nthWeek` (for monthly), `startTimeOfDay`, `durationMinutes`, `timezone` (IANA), `location`, `groupId`, `imageUrl`, `active`, timestamps, `deletedAt`.
- `events` gains nullable `seriesId` FK + unique constraint on `(seriesId, startTime)`. Existing `isRecurring` / `recurrenceRule` columns marked deprecated in schema comments; not dropped.

**Materializer:** `ensureSeriesHorizon()` in `src/lib/events/` — pure, idempotent, generates instance rows 8 weeks ahead in the series timezone. Unit-tested (Vitest). Runs on series create/edit and via daily Vercel cron (existing `CRON_SECRET` pattern). Series edits regenerate only future, admin-untouched instances (an `editedAt`-style flag marks hand-edited instances as protected). Occurrences can be individually cancelled (`isCancelled`) without breaking the series.

**Admin UX:** event creation in `/admin/events` and the gallery manager (`src/app/(app)/admin/gallery/manager.tsx`) asks one-time vs recurring first. Recurring opens a series editor with live preview of the next 5 dates. Gallery photo uploads to a series default to the most recent past occurrence.

**Public `/events`:** upcoming groups by series — one card per series with "Every Tuesday" badge + next date, expandable to all upcoming dates; one-offs list normally. Past view unchanged (recap + photos). `/gallery` (admin-only) continues reading `events.photos` per instance — no gallery changes required beyond the manager's series-aware attach.

## Section 4 — ESV Bible (`/bible`)

**Reader:** book → chapter navigation, prev/next, scripture typography (Cormorant/Merriweather, proper measure), shareable deep links `/bible/[book]/[chapter]#v16` that scroll to and highlight the verse. Resurrects `src/lib/bible/` out of the member area; public and stateless — legacy bookmarks/notes/highlights are **not** carried over. Route added to middleware `PUBLIC_ROUTES` and public nav.

**Search:** one input, auto-detected intent — references (`John 3:16`, `rom 8`) route to the passage; keywords hit the ESV search API with debounced instant results and match highlighting. Recent searches stored in localStorage only. Mobile-first placement.

**Licensing/resilience:**
- **Prerequisite (Drew):** confirm `ESV_API_KEY` exists in Vercel env; if missing, request a free non-commercial key at api.esv.org. Phase 3 cannot ship search without it.
- ESV attribution/copyright notice on every Bible page per Crossway terms; server-side chapter caching kept within Crossway's published limits (verify exact terms during implementation).
- ESV down/missing → reader falls back to public-domain WEB with a visible notice; search shows a graceful "search requires ESV" state.

## Section 5 — Resources automation

**Zero-click pipeline on every add path** (link, bulk upload, file): enrichment (ISBN via Open Library/Google Books, YouTube oEmbed, OG scraping — as today) → Claude tags + summary → cluster assignment → cover resolution.

**Cover resolution order:** real thumbnail (book cover / YouTube still) → **auto-generated gpt-image-1 cover** (quality "low", ~$0.01) → themed SVG shows instantly as placeholder until the AI cover lands, and remains permanently on failure.

**Anti-sameness (the "56 identical covers" fix):** an art-direction matrix replaces the single prompt — per-cluster palette/motif/composition locked to Pasture & Iron, plus seeded variation from title/author/type so batches produce visibly distinct covers that still read as one family. Queued generation (concurrency ≈2, retry with backoff) so bulk uploads never stall. Every generation logged to `ai_generations` for cost visibility.

**Backfill:** admin "Backfill catalog" action brings all existing resources up to standard (tags, summaries, clusters, covers) + weekly cron catch-up. The section automation bar remains for manual overrides (re-tag, re-cluster, regenerate one cover).

**Icons:** SVG cluster-cover themes (`src/components/resources/ResourceCover.tsx`) and the `Icon.tsx` set get the Section 2 consistency pass.

## Section 6 — Phases, verification, error handling

**Phases (each independently shippable, in order):**
1. **Recurring events** — schema, materializer + cron, admin series UX, public `/events` regrouping.
2. **IA + design elevation** — redirects, nav/`/join` consolidation, design-system sweep, motion, dual-theme, mobile.
3. **ESV Bible** — reader + search (blocked only by the ESV key prerequisite).
4. **Resources automation** — zero-click pipeline, art-directed covers, backfill.

**Verification per phase:** `tsc --noEmit`, `next build`, lint; browser-driven smoke of every changed flow (create weekly series → instances appear → upload photos → correct occurrence; Bible search both intents; add resource → auto-enriched with distinct cover); programmatic contrast checks in both themes. Vitest added for `src/lib` pure functions only (materializer, reference parser, prompt matrix) — no site-wide test harness.

**Error handling:** idempotent cron (safe re-runs); ESV → WEB fallback; AI-cover failure → SVG stays; all AI calls server-only and logged; soft-delete + 30-day purge conventions preserved.

## Non-goals

- No member login, member portal, or any non-admin auth (architecture decision 2026-04-29 stands).
- No deletion of deprecated member-area code or schema tables (separate cleanup phase, needs explicit approval).
- No 21st.dev Magic component generation.
- No new art direction — the brand stays.
- No bookmarks/notes/highlights in the Bible.
- No surfacing of the dormant legacy `letters` table content (future migration task, per the existing redirect's code comment).

## Open prerequisites (Drew)

1. Confirm or obtain `ESV_API_KEY` (api.esv.org, free non-commercial) and set it in Vercel — blocks Phase 3 search.
2. `OPENAI_API_KEY` must remain funded for gpt-image-1 cover generation at catalog scale (~$0.01/cover).
