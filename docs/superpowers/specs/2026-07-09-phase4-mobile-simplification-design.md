# Phase 4 — Mobile-First Simplification, Letter Autopilot, Admin for a Ten-Year-Old

**Date:** 2026-07-09
**Status:** Approved design, pending implementation plan
**Sequence:** Phase A (public mobile) → Phase A-FN (resources field notes; ships immediately after A merges, may overlap the start of C, must merge before B begins) → Phase C (Letter autopilot) → Phase B (admin + site text)

## Problem

Users and admins report the site is hard to use. 99% of users are on phones. Specifically:

1. The homepage never states who Sheepdog Society is for, and when/where groups meet is only discoverable through live event rows. Three paragraphs of literary copy sit above the first CTA.
2. Mobile navigation is a hamburger — every destination is two taps and a menu-read away.
3. The resources section fails its stated job ("a man on his phone answering questions in a Bible study"): icons are overloaded (Amazon books and generic files share a scroll icon; provider + audience + duration badges + up to 7 pills per card), and most resources bounce the man out to Amazon/YouTube after 3 taps.
4. The admin console is desktop-first: the mobile drawer exists (AdminShell), but the pages behind it — tables, forms — are unusable at 375px, and there is no way to edit public-site text (homepage and About copy are hardcoded JSX).
5. The weekly Letter requires manual theming and scheduling. The series engine (2–12 letters, 10 reformed-theologian voice presets, cron publishing, Resend broadcasts) exists but: series letters get no cover images, there is no theologian rotation or seasonal awareness, themes are hand-typed, and there is no discrete call-to-action field.

## Decisions (made with Drew, 2026-07-09)

| Decision | Choice |
|---|---|
| Scope | All sub-projects, sequenced **A → A-FN → C → B** |
| Build order | Approach 1: straight sequence. Homepage ships as code in A; copy migrates to the site-text table in B. |
| Mobile nav | Bottom tab bar (5 destinations), mobile only; desktop masthead unchanged |
| Resources depth | Both, phased: wayfinding fix in A, field-notes pipeline in A-FN |
| Letter trust model | **Full autopilot** — no human approval gate; machine gates + visibility email + kill switch instead |
| Admin text editing | Curated editable sections ("Site text" screen), not a block CMS |

**Table note:** the series engine and everything the autopilot touches operate on `weekly_encouragements` (schema-new). A separate legacy `letters` table (schema.ts:1112, Tiptap bodies, `/admin/letters` only, no public rendering path) coexists — no Phase 4 work targets it.

## Phase A — Public Mobile Experience

### A.1 Bottom tab bar

- New client component `MobileTabBar` in the public layout, `lg:hidden`, fixed bottom, `env(safe-area-inset-bottom)` padding, `z-40` (below the sticky nav's `z-50`, above content).
- Five destinations: **Home `/`, Groups `/groups`, Letter `/letter`, Bible `/bible`, Resources `/resources`.** Icon + word label; brass active state **plus** icon weight change (never color alone).
- Active state uses **prefix matching** per destination (`/letter/archive` and `/letter/[slug]` light Letter; `/bible/[book]/[chapter]` lights Bible; `/groups/[slug]` lights Groups; Home is exact-match).
- Hamburger stays, demoted to secondary destinations, **Join at the top**: Join, Events, Stories, About, FAQ, What to Expect, How We Gather, Contact, Giving, SMS terms, Privacy. `/join` also remains reachable via in-page CTAs (homepage hero, group pages, Join band).
- The hamburger's slide-down panel closes on pathname change (`usePathname` effect) so a tab-bar tap never leaves a stale open menu.
- Keyboard behavior: the bar stays fixed while inputs are focused (iOS 17+ handles fixed elements with the keyboard open); no hide-on-focus logic in this phase.
- Public pages get bottom padding on mobile so content never hides behind the bar.

### A.2 Homepage restructure (5W1H)

Section order, with a **hard cap of 40 words of prose per section** (checked at review):

1. **Hero** — one headline + one paragraph (currently three). Paragraph answers Who + What: Christian men, weekly brotherhood groups, anchored in Acts 20:28. Primary CTA "Find your group" → `/groups`; secondary "Read the Letter" → `/letter`.
2. **"What this is" band** (new) — five compact entries: Who it's for · What happens at a table · Why it exists · When & where · How to start (condensed 3 steps). The When & where entry is live data: distinct meeting days + cities from `locations` **where `isActive AND displayedOnMap AND meetingDay != ''`** (the exact visibility gate the public /groups locator uses — note the status enum is `active|pending|inactive`, there is no `approved` value), capped at 4 entries. Zero-rows fallback: a hand-written sentence ("Tables gather weekly across Georgia. New ones are forming now."). Caching: the homepage stays its current rendering mode; location approval in admin adds `revalidatePath('/')`.
3. **Acts 20:28 ember band** — unchanged.
4. **Next gatherings** — bigger touch targets; hover-only "Details →" becomes always-visible chevron.
5. **The Letter preview + newsletter signup** — kept, tightened.
6. **One story** — kept.
7. **Join CTA** — kept.
8. **Photo strip** — removed from homepage (lives on /events).

Also in scope: **update the homepage `metadata` title/description/openGraph** to match the new hero copy (same voice budget). All copy hand-written (not runtime-AI): short Anglo-Saxon sentences, imperative + invitation, no banned words, no em-dashes where commas work.

### A.3 Resources wayfinding

- **Icons die.** One plain-English type label per resource — Book / Video / Article / Guide / Download — as a small text badge. Derivation precedence: **provider domain wins (Amazon→Book, YouTube→Video), then mime (`video/*`→Video, `application/pdf`→Guide, other files→Download), then section-based fallback; anything unclassifiable → Download.** Full mapping table in the implementation plan.
- **Cards shrink to:** thumbnail, type label, title, one-line summary, ≤ 2 pills (book of Bible, topic). Duration/audience move to the detail page.
- **Mobile order:** search pinned top → section pill rail → cards. Nothing pushes cards below the fold.
- **Detail page content-first:** readable/watchable content at top when it exists; external links become clearly-labeled secondary buttons ("Get the book on Amazon").

### A.4 Touch & accessibility pass (all public pages)

- 44px minimum touch targets.
- No information or action reachable **only** via hover (hover enhancement of a visible affordance is fine).
- `check:contrast` green on both themes.
- Text-scaling check: 200% browser text zoom on `/`, `/groups`, `/letter`, `/resources` with no clipped or overlapping content (WCAG 1.4.4).

## Phase A-FN — Resources Field Notes

- New columns on `resources`: `fieldNotes` (HTML), `fieldNotesStatus` (`draft` | `approved`), `fieldNotesGeneratedAt`.
- **Drafting inputs are provider-specific, stated in the prompt contract:** file/docx → `bodyText`; YouTube → title + description; Amazon/web → title + author + description only. **Insufficiency rule:** below a content threshold, Claude must draft framing-only notes (why we recommend it, how to use it in a study) with **no claims about the work's specific content**; if even that isn't possible, the resource is flagged "needs manual notes" instead of generated. This is a prompt-contract rule, not just an admin-review hope — one-tap approve is the expected flow, so hallucinated book summaries must be structurally prevented.
- Structure: what it says / why we recommend it (2–3 short paragraphs) · 3–5 key scripture references (reference-only, never verse text) · how to use it in a study. Output runs through `scrubAiPayload` + the new banned-word gate (see C.4).
- Admin: one-tap approve/edit in `/admin/resources`; drafts never render publicly.
- Backfill: section-by-section via the existing section-automation bar, **capped batch size per run**; a failed item stays without a draft rather than blocking its section.
- **Metric:** from the `/resources` list, ≤ 2 taps to approved field notes on the detail page.

## Phase C — Letter Autopilot

The existing engine is retained. Two extractions are prerequisites (both verified against current code):

- **P1 — Session-less series core.** `createSeriesWithLetters` is a `"use server"` action that requires an admin session and stamps `createdBy`/`authorId` from it; a cron has no session. Extract the insert/scheduling internals (including `computeScheduledFor`, which cannot be exported from a `"use server"` file) into a shared server library `createSeriesWithLettersCore(authorId, input)` used by both the admin action and the cron. Autopilot runs attribute to a configured admin author stored in `letter_autopilot.default_author_id` (seeded to Jeremy's user id). Wrap the issue-number MAX+1 + inserts in a transaction so concurrent wizard/cron writers can't collide and a mid-run death leaves nothing half-created.
- **P2 — Server-side image generation.** Extract the gpt-image-1 internals of `/api/admin/image-gen` for cron use. `OPENAI_API_KEY` confirmed present in production.

### C.1 Theme calendar (pure, TDD)

`src/lib/letters/theme-calendar.ts` — deterministic date → season context. Returns `{ liturgical, cultural? }` — cultural markers are an **optional overlay**, not a winner-takes-all label (New Year sits inside Christmastide; Father's Day inside Ordinary Time). Liturgical: Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time (Easter date math). Cultural: New Year, Father's Day, back-to-school, Thanksgiving. **Input contract:** each letter's season is computed from its `scheduledFor` converted to America/Chicago; the theme step receives the season contexts of **all four letters** so the theme survives a boundary crossing (a late-Lent block must know Easter falls inside it). No AI. Full Vitest coverage including movable feasts and year boundaries (liturgical year starts at Advent).

### C.2 Theologian rotation

Cycles the 10 existing presets in `lib/ai/voices.ts` (Piper, Keller, Sproul, MacArthur, Begg, Carson, Ferguson, DeYoung, Baucham, Washer); no repeat until all ten used. State lives in a new `letter_autopilot` table (single row: `enabled`, rotation state, `default_author_id`, last-run and last-block metadata).

### C.3 Autopilot cron

New `/api/cron/autopilot-letters` (weekly; `vercel.json` entry with `maxDuration: 300`). When **fewer than 2 scheduled, non-deleted letters remain — counting ALL scheduled letters, manual or autopilot** (a long manual series naturally pauses autopilot; no double-sends possible) — and autopilot is enabled:

1. Compute the block's dates: weekly, starting `max(scheduledFor) + 7d` across all scheduled letters (regardless of any manual series' own cadence); per-letter season contexts from C.1.
2. Claude proposes a **theme of 1–3 words** (enforced by the `generateObject` schema, not post-hoc) fitting the block's seasons + next theologian.
3. Generate a 4-letter block via the extracted series core. Engine extensions — a discrete `callToAction` field per letter (one concrete move, ≤ 60 words, rendered as its own block in page + email) and a strengthened emotional-resonance instruction ("one image or story that lands in the chest") — **apply to all series generation, wizard included**; `callToAction` is nullable in schema and rendering, so existing letters and wizard flows are unaffected. "The wizard remains untouched" means its UI and flow do not change in this phase.
4. Generate a cover image per letter (P2) with a new "Sheepdog broadsheet" style preset. **Best-effort per letter:** image failure = existing SVG `LetterCover` fallback, never a blocked letter, never a half-created series.
5. Schedule; send the visibility email (C.5).

**Migration:** `weekly_encouragements.call_to_action` (nullable text) + the `letter_autopilot` table.

### C.4 Machine gates (replace the human)

- **Existing, verified:** `generateObject` schema validation; count/length bounds; `scrubAiPayload` (dashes/hashtags). Structural for the series path: scriptures are reference-only jsonb — verse text is never generated or rendered, so no verse-verbatim check is needed.
- **New — banned-word/cliché gate:** the lists in `system-prompt.ts` are prompt-only today; nothing checks output. Build a post-generation string gate over intro/guidance/notes/callToAction. Shared by autopilot, the wizard, and A-FN field notes.
- **New — `verifyReference(ref)`:** (a) parse and bounds-check book/chapter/verse **locally first** against `src/lib/bible/books.ts` data (catches most hallucinated refs with zero API calls); (b) only then hit the ESV API via `getESVPassage` — an empty `passages` array means **unresolvable → regenerate**; (c) thrown errors / missing key / non-200 mean **verification unavailable → skip verification for this run and note it in the visibility email** — an ESV outage must not burn regeneration budgets or skip slots. (`ESV_API_KEY` is absent from Preview by design; the live-fire plan must account for this.)
- **Budget:** all gates share a **single 2-attempt regeneration budget per letter**. Any gate failing on attempt 2 skips that slot.
- **Skipped-slot semantics:** surviving letters keep their originally computed dates; a failed slot is a gap week, named explicitly in the "autopilot needs you" email so Jeremy can fill it manually. Failure mode is silence, not a bad letter.

### C.5 Visibility, status, and kill switch

- On block generation: one email to Jeremy — subject names the theme and theologian — with links to all 4 letters at `/admin/letters/[id]`, behind the existing admin sign-in (the sign-in hop is accepted; **no unauthenticated draft URLs**).
- **Autopilot status card** at the top of `/admin/encouragements`: enabled toggle, last run, last block (theme, theologian, 4 letter links), read from `letter_autopilot`. **No separate route** — B.2's "autopilot status" nav concept points here.
- **Kill-switch semantics (option A):** disabling autopilot (a) stops the generation cron and (b) **flips unpublished autopilot-originated letters back to `draft`** so the publish cron cannot send them. Requires tagging autopilot-generated letters (via their series row / a source column) so manually scheduled letters are never collateral. Re-enabling does not auto-reschedule the drafted letters; the status card lists them for manual action.
- Manual series creation via the existing wizard coexists (see C.3 collision rules).

## Phase B — Admin for a Ten-Year-Old

### B.1 Site text

- New `site_text` table: `key` (unique), `label`, `groupName`, `value`, `updatedAt`, `updatedBy`.
- `getSiteText(key)` server helper wrapped in `unstable_cache` with a `site-text` tag; saves call `revalidateTag('site-text')` plus `revalidatePath` for affected pages. **Fallback rule: NULL, empty, or whitespace-only values are treated as missing** and render the shipped default — neither an empty DB nor an admin clearing a textarea can blank the site.
- **Seeded keys are exactly:** the Phase A homepage sections (hero headline, hero paragraph, five What-this-is entries, join CTA) plus About page copy. **No other pages migrate in this phase**; more keys are a follow-on decision. Exact key list in the implementation plan.
- Homepage `metadata` converts to `generateMetadata` reading site_text so search/OG snippets follow edits.
- New `/admin/site-text`: grouped plain-named list ("Homepage — Hero headline", "About — Opening"), tap → textarea → save → live. No layout controls by design.

### B.2 Admin nav regroup

Five groups → four, by job: **This Week** (Home, Inbox) · **The Letter** (letters incl. autopilot status card, subscribers) · **People & Groups** (members, groups, plant requests, group interest, events, past events) · **Site Content** (site text, resources, **gallery**, stories). Settings (admins, audit, settings) stays at bottom. **Group membership is fixed here; the implementation plan may adjust order, icons, and labels only.** Tap budget: from `/admin/dashboard`, any page reachable in ≤ 2 taps on desktop (groups always expanded) and ≤ 3 on mobile (opening the drawer counts as tap 1).

### B.3 Mobile admin pass (bounded)

- **Tier 1 — card-list treatment, full triage parity at 375px:** Dashboard, Inbox (contacts), Members, Plant Requests, Group Interest, Groups, Events, Encouragements list. The pages Jeremy triages from his phone.
- **Tier 2 — baseline only (drawer nav, no horizontal scroll, 44px targets):** every other sidebar page.
- **Explicitly out:** the letter editor gets read + publish/schedule actions at 375px, not full editing; orphan routes not in the sidebar (prayer, locations) get no pass.

### B.4 Guidance

`AdminPageIntro` plain-English intro on every sidebar page (extend where missing); every action button labeled with a verb.

## Cross-cutting

- **Voice:** all UI copy hand-written per `src/lib/ai/system-prompt.ts` rules. Bible text never generated — references only.
- **Shipping pipeline per phase:** branch → static gates (tsc, vitest, eslint, `check:contrast`) → live-fire with disposable data + cleanup → PR → squash-merge → live production verification. Migrations via `scripts/apply-neon-migration.mjs` / GH Action, never `drizzle-kit push`.
- **Migrations added:** `resources.field_notes*` (A-FN); `weekly_encouragements.call_to_action` + `letter_autopilot` table (C); `site_text` (B).
- **New crons:** `autopilot-letters` (weekly, `maxDuration: 300`) added to `vercel.json`.
- **Repo path note:** local checkout moved to `/Users/drewgodwin/Code/sheepdogsociety` on 2026-07-09.

## Out of scope (explicitly)

- Native apps, push notifications, PWA install prompts.
- Block CMS / page builder (rejected in favor of curated site text).
- Member-area (chat/prayer/channels) changes.
- Search-by-question AI answering in resources (field notes serve the study job first; revisit after usage).
- Tokenized unauthenticated letter previews.
- Site-text migration of FAQ/What to Expect/How We Gather/Contact/Giving copy.

## Risks

1. **Full-autopilot voice drift** — mitigated by machine gates + visibility email + kill switch (option A semantics); accepted by Drew 2026-07-09 knowing an off-key letter could ship unread.
2. **gpt-image-1 style consistency** — a fixed style preset constrains it; SVG fallback bounds the downside.
3. **Homepage copy is load-bearing** — 5W1H rewrite reviewed by Drew before Phase A merges.
4. **Admin regroup muscle-memory** — Jeremy is one user; a single walkthrough email covers retraining.
5. **ESV dependency in gates** — handled by the local-parse-first + inconclusive-outage design in C.4; an ESV outage degrades verification, never publication.
