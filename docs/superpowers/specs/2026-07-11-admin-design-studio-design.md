# Admin Design Studio — Design Spec (rev 2)

**Date:** 2026-07-11 · **Approved by Drew** at design level after 4 shaping decisions: curated studio (not block builder) · all public pages · AI = per-field assist + describe-it changesets, draft-only · five hand-designed themes.
**Rev 2:** folds in the 3-lens adversarial review (27 findings, 4 Blockers) — every mechanism below was verified against the installed next@16.1.6, globals.css, and the real pages.

> **DS-1 SHIPPED 2026-07-11** — PR #48, squash `ab79754`, migration 0020 applied + shape-verified on Neon, live prod verification green (homepage/About render byte-identical parity; `/admin/studio` gates unauthenticated visitors; zero runtime errors). All five DS-1 acceptance checks (PARITY, ISOLATION, LOOP, UNDO, SAFETY) verified against the real running app and the real database. Ships with `pasture-iron` active and an empty config — the site changed nothing until an admin acts.
>
> **DS-2 SHIPPED 2026-07-11** — coverage extended to all 11 remaining public pages (about, join, faq, contact, giving, what-to-expect, how-we-gather, events, letter, stories, resources) with zero changes to the DS-1 engine (`config.ts` render-merge, `server/studio.ts` Apply/Discard/Restore, `middleware.ts` compare-strip, `(public)/layout.tsx` theme injection — all untouched). Section registries + governed text keys added for every page; `/admin/studio`'s page selector now covers all 12 pages, with the `saveDraftConfig` per-page patch verified to never drop other pages' saved layouts. FAQ's accordion stays one locked section (not per-item keys) per the plan's own carve-out; Join's hero (incl. the live sign-up/plant form) stays locked; Contact was split into a server page + a new `ContactForm` client component to enable the async Studio data fetch. Three content-fidelity defects were found and fixed in-flight (Giving's "why we give"/"partners" two-line headlines, Letter's and Stories' empty-state heading+body splits) — a final whole-branch review swept for a fourth instance of the same class and found none. DS-3 (AI layer) and DS-4 (polish/hardening) remain, per the Build Order below.

**Goal:** Jeremy changes the site's text, layout, and look from one Studio page — with AI help, device/mode preview, side-by-side compare against live, and full undo — without being able to break the site, the brand, or Scripture.

## The loop (the only mental model Jeremy needs)

> Change things in a **draft** → **preview** it (phone/desktop, light/dark) → **compare** to what's live → **Apply** → (**undo** any time).

Nothing touches the live site until Apply. Discard-draft is always one click. Every Apply is a snapshot he can restore.

## Route + page anatomy

`/admin/studio` (admin layout gates it; sidebar: Site Content group, first item). Three zones:

- **Left rail (controls):** Theme picker · Page selector + section list (show/hide toggles, up/down reorder; locked sections greyed with the reason) · Text fields for the selected page (site-text rows, draft-aware).
- **Preview pane:** iframe of the real site with the draft applied. Toggles: device (mobile 375 / desktop) · mode (light / dark) · **Compare** (splits into live | draft, same page/device/mode, synchronized scroll).
- **Helper strip:** AI recommendations · "Tell me what you want" box (describe-it) · **Stuck?** panel · Versions drawer · Apply / Discard with plain-English confirms.

All UI copy hand-written in Jeremy's voice (system-prompt rules). HintTooltips everywhere; AdminPageIntro explains the page in one sentence.

## Data model (migration 0020)

- **`site_studio`** — single row (letter_autopilot precedent, ORDER BY id, seeded on first read):
  `id`, `draft` jsonb, `published` jsonb, `updated_at` timestamptz, `updated_by` FK users SET NULL.
  Config shape (both columns): `{ themeId: string, pages: { [pageId]: { sections: [{ id: string, visible: boolean }] } } }` — array order = render order. An empty/absent config renders today's site exactly.
- **`site_text.draft_value`** — nullable text. NULL = no draft edit. Empty/whitespace draft = staged "reset to default". **Carrier rows:** a draft edit on a key with NO existing row INSERTs `value: ''` (publicly invisible — resolveSiteText treats blank as default) with label/groupName copied from the registry. **Promote** (inside Apply) is two set-based statements: `DELETE WHERE draft_value IS NOT NULL AND btrim(draft_value) = '' ` (staged resets + abandoned carriers — but only where `btrim(value) = ''` too; a staged reset over a real override becomes `value=''` deletion… see precise rule below), then `UPDATE SET value = draft_value, draft_value = NULL, updated_at, updated_by WHERE draft_value IS NOT NULL`. Precise reset rule: promoting a blank draft_value deletes the row (that IS the reset); promoting non-blank sets value; afterwards no row carries a non-NULL draft_value and no orphan `value=''` rows remain.
- **`studio_versions`** — `id bigint GENERATED ALWAYS AS IDENTITY` (ALL ordering, undo arithmetic, and pruning key on id DESC — never created_at, which ties), `snapshot` jsonb `{ config, textOverrides }`, `summary` text (auto one-liner), `created_at`, `created_by` FK SET NULL. `textOverrides` = site_text key/value rows only (overrides, never resolved registry defaults — defaults live in code and may legitimately change later).

**Snapshot model (unambiguous):** the newest version row always equals the CURRENT published state.
**Apply transaction:** `SELECT pg_advisory_xact_lock(815552)` (new app constant — 815551 belongs to letter series; Apply and Restore both take it) → if studio_versions is empty, insert a baseline version capturing the pre-apply published state (summary "Before the first Studio change") → write draft config to published → promote text drafts → build snapshot from the NEW published state → insert version row → prune to newest 50 by id. Then `updateTag("studio")` + `updateTag("site-text")` + **`revalidatePath("/", "layout")`** — one layout-scoped call regenerates every route's HTML (several governed pages are fully static with no revalidate timer; per-page enumeration is the failure mode, not the design).
**Apply, Discard, and Restore are Server Actions** (updateTag is Server-Action-only — Phase B lesson). Only the draftMode enable/disable endpoints are route handlers (the browser must hit a route for the cookie).

**Restore** = full diff against current published state, staged into the DRAFT: for every current registry key — snapshot has an override → stage it as draft_value (carrier row if needed); currently overridden but absent from snapshot → stage a reset (`draft_value = ''`). Config restored into draft config wholesale, then passed through the render-merge rule (below), dropping stale ids with a per-item note (same idiom as changeset validation). Going live is still an explicit Apply — which snapshots first, so redo is free. The Restore confirm states plainly: "This loads the old version into your draft. Your unsaved draft changes go away."

**Live editor interaction:** `/admin/site-text` remains a second write path. Its blank-save and reset change from row DELETE to `UPDATE value = ''` when `draft_value IS NOT NULL` (never destroy a pending draft; delete only when both are blank). Last-write-wins between the live editor and a Studio Apply is accepted and named in the Stuck? panel. DS-2 revisits folding the site-text editor into the Studio.

## Themes

**The var surface (the half-true claim, corrected):** globals.css indirects only the 11 `--c-*` palette names through `@theme inline`; the dominant surface colors — `--background, --foreground, --card, --card-foreground, --popover, --popover-foreground, --muted, --muted-foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --accent, --accent-foreground, --destructive, --border, --input, --ring, --bronze, --bronze-foreground` — are raw oklch at `:root`/`.dark`. A theme therefore defines **both groups**, explicitly enumerated in the theme record: `{ id, name, blurb, light: Record<ThemeVar, string>, dark: Record<ThemeVar, string> }` where ThemeVar = the 11 `--c-*` names + the 20 semantic names above. Sidebar/chart vars are admin-only and excluded.

- **Registry + data split:** color records live in `src/lib/studio/themes-data.mjs` (plain module — `scripts/check-contrast.mjs` is plain node and must import it natively); `src/lib/studio/themes.ts` wraps it with types/names/blurbs. Exactly 5 themes; `pasture-iron` is values-identical to today's globals.css and renders NO override block.
- **Injection point:** the override `<style>` block is emitted by **`src/app/(public)/layout.tsx`** — never the root layout (which wraps admin/auth; a `:root` override there would repaint the admin with ungated contrast, and a DB read there runs during every static prerender). Selectors: scope through the public wrapper (marker attribute on the (public) layout's wrapper, e.g. `body:has([data-site-theme])` for light and `.dark body:has([data-site-theme])` for dark — verified no public component portals to document.body). Plain `<style>` (no React `precedence` prop) so it renders after the head stylesheet and wins the tie. Dark selector is `.dark` only — ThemeProvider uses `attribute="class"`; `[data-theme=dark]` is dead code here.
- The Bible reader lives inside (public) and gets themed — colors only; Scripture text is never touched.
- `getStudioConfig()` mirrors getSiteTextMap's try/catch: DB error → default config (pasture-iron + registry defaults). Builds and outages fail soft.
- **Theme-constant surfaces (by design):** the ember bands (`@utility ember-band`, literal hex), letter cover art, and `--c-iron` (the deep-ink surface color the paper-card shadow and the admin light/dark contract both key off) are furniture, not themeable content, and do NOT re-theme — so a theme record spans 10 of the 11 `--c-*` names plus all 20 semantic names, never `--c-iron`. Every one of the 5 themes must be designed to harmonize with the fixed ember palette (#1c1610 ground / copper kicker) — a design-time acceptance check per theme, not a code change. Stated in the theme picker's hint so it never reads as a bug.
- Typography fixed. Furniture (@utility) untouched. **Contrast gate:** check-contrast.mjs builds each theme's var map as `{ ...parsedGlobalsBaseline, ...theme[mode] }` and runs the existing PAIRS list for all 5 themes × both modes; any failure fails the build.

## Section registries + page wiring

`src/lib/studio/sections.ts` — per public page: `{ pageId, label, sections: [{ id, label, hint, locked?: true }] }`.

- Pages: home, about, join, what-to-expect, how-we-gather, faq, contact, giving + the framing copy of events/letter/stories/resources indexes. **Each dynamic list is its own locked section** (events has two: upcoming + past).
- **Locked:** every Scripture/ember band, every page hero, every dynamic-content section (lists, browser, map, forms). Page realities, verified: home/about/faq/events extract cleanly into top-level sections; **join** is mostly a text-keys page (hero locked, paths+signup form locked-dynamic, principles list is its one governable section); **FAQ** Q&As become keyed text groups in DS-2 (each Q and A a key, group "FAQ"; the accordion is one section).
- **Render-merge rule (used identically on studio read, public render, and restore):** config order/visibility applies only to section ids it names; registry sections missing from the config render visible at their registry position; config ids not in the registry are dropped; locked sections are forced visible regardless of config; unknown themeId falls back to pasture-iron.
- Text coverage: SITE_TEXT_KEYS grows to every governed page (groups per page). Scripture is never a key. Dynamic/DB content is never a key.
- Per-page bar: render-identical with empty config (DOM-diff, modulo build hashes).

## Draft preview + compare

- **Draft visibility = Next `draftMode()`** (cookie-scoped `__prerender_bypass`; bypasses ISR/static cache only for the draft holder). Enable/disable via route handlers under `/api/admin/studio/preview` (requireAdmin).
- **Loader pattern (anti-poisoning, guard rail 5b):** `draftMode()` is checked OUTSIDE any cache scope — never inside an unstable_cache closure. Draft branch = direct uncached DB read (config draft column; site_text `draft_value ?? value` merge). Published branch = the existing unstable_cache reads, untouched. Reading `draftMode().isEnabled` is prerender-safe (returns false, no dynamic bailout), so ISR/static prerendering is unaffected.
- **Preview pane** iframes the real page URL; device toggle = iframe width. **Mode toggle:** `?studio-mode=dark|light`, honored by a `<StudioModeForcer/>` client helper that the (public) layout renders ONLY when `(await draftMode()).isEnabled` — it reads location.search in an effect and toggles the `dark` class + `style.colorScheme` on the iframe's documentElement directly. It must NEVER call next-themes setTheme or touch localStorage (storage events would flip every open tab, including the Studio itself, and overwrite Jeremy's real preference).
- **Compare:** two synchronized iframes; both naturally carry the draft cookie, so the LIVE side uses `?studio=published`, implemented in **middleware**: when the URL carries the param, the request is forwarded with the `__prerender_bypass` cookie stripped from the Cookie header — the live iframe is then a true public request end to end (published theme, config, text, served from the normal cache). No loader or page ever reads the param; layouts never see searchParams (verified — this killed the rev-1 design). Inert without draftMode: no cookie, nothing to strip.
- **Draft ribbon:** while draftMode is enabled, every public page renders a fixed "Draft preview — not live · Stop preview" ribbon (server-conditional on draftMode; only the cookie-holding admin ever sees it). This closes the "I opened the site from my bookmark and it shows changes I never applied" trap.

## AI layer (draft-only, always)

Three Server-Action/route entry points under the studio module (requireAdmin, ai_generations logging, model claude-sonnet-4-5, house `anthropic` import):

1. **recommend** — page context in → suggestion list `{ what, why, changeset? }`, seeded by deterministic pre-checks (headline word count, section count, empty overrides).
2. **assist** — per-field rewrite/tighten/warm-up; returns draft text + one-line why.
3. **describe** — free-text goal → changeset `{ themeId?, sectionChanges: [{pageId, sectionId, visible?, position?}], textEdits: [{key, value, why}] }`. Schema BOUNDS-FREE (house rule); post-hoc validation: every id must exist in its registry · locked sections untouchable · **materialize the page's full section order (registry+config merge) before applying position patches, then bounds-check positions** · duplicate {pageId, sectionId} entries reject the changeset · empty/whitespace textEdits.value is invalid and dropped (resets are a human action) · accepted items capped at 20, remainder dropped · findBannedLanguage over every drafted string · length caps in code. Valid parts write into the draft; every dropped item is listed to Jeremy with a reason.

AI never Applies. The Apply button is Jeremy's alone.

## Guides / get-unstuck layer

- AdminPageIntro + HintTooltips (house pattern).
- **Stuck? panel — 7 cards:** change isn't live (you haven't hit Apply) · don't like the draft (Discard) · applied and regret it (Versions → Restore) · preview looks broken (stop/start preview) · what do themes look like (picker previews instantly) · what can't change and why (locked sections, Scripture, fonts, ember bands) · **"the site shows a Draft ribbon"** (you're in preview on this browser — Stop preview returns it to live; other people always see live).
- **First-run walkthrough:** dismissible 4-step strip (pick theme → toggle section → edit a line → Apply); dismissal flag in site_studio config.

## Guard rails (invariants)

1. Scripture: never an editable key, never a hideable section; ember bands theme-constant.
2. Themes: only the 5 registry themes, all AA-gated at build time across both var groups; no free-form colors.
3. AI writes only to draft; all AI strings pass findBannedLanguage; changesets validate post-hoc per the describe contract.
4. Apply/Restore are Server Actions in single transactions serialized by `pg_advisory_xact_lock(815552)`; cache flush is exactly updateTag("studio") + updateTag("site-text") + revalidatePath("/", "layout").
5. draftMode gates all draft reads; the draftMode() check lives OUTSIDE every cache scope (5b); `?studio=published` is a middleware cookie-strip, inert without draftMode; preview endpoints requireAdmin; the draft ribbon renders whenever draftMode is on.
6. Locked sections: not hideable, not reorderable, not AI-touchable; render-merge forces them visible.
7. Empty/absent config + no drafts renders today's site DOM-identically; pasture-iron emits no override block.

## DS-1 acceptance (the definition of "loop proven")

1. **PARITY** — empty config, no drafts: homepage HTML is DOM-identical to the pre-studio baseline (curl + diff modulo build hashes); `npm run check:contrast` passes 5 themes × 2 modes.
2. **ISOLATION** — draft theme+text active in browser A (draftMode on): 10 consecutive homepage requests from a clean browser B serve published output with zero draft markers (no override style block, no draft copy, no ribbon).
3. **LOOP** — change theme + one text line + hide one section: preview reflects all three in both devices and both modes; compare shows live≠draft; Apply lands them on the public site within seconds (fresh browser check).
4. **UNDO** — restore the pre-change version, Apply: public site matches the original state exactly (HTML diff), and the Versions drawer shows the full history.
5. **SAFETY** — locked sections cannot be hidden/moved via UI or a describe changeset; Scripture appears in no registry; `?studio=published` on a public browser without draftMode changes nothing.

## Build order (each its own plan → PR → live verification)

- **DS-1 (prove the loop, homepage only):** migration 0020 · themes-data + registry + contrast-gate extension · config plumbing (cached published reads, draft branch, render-merge) · (public)-layout theme block + StudioModeForcer + draft ribbon · middleware cookie-strip · homepage section registry + wiring · Studio page (theme picker, homepage sections, homepage text keys) · preview + compare · Apply/Discard/Restore + versions. Meets all 5 acceptance checks.
- **DS-2 (coverage, SHIPPED 2026-07-11):** registries + text keys for all remaining pages (FAQ stayed one locked accordion section, not per-item keys; join reality per above); page wiring; page selector grows. The site-text editor draft-safety change turned out to already be shipped in DS-1 (verified before DS-2 execution) — no separate task needed.
- **DS-3 (AI):** recommend / assist / describe + helper strip + changeset validation.
- **DS-4 (polish + hardening):** guides final pass, studio 375px pass, live-fire drills (cache-poisoning drill from acceptance #2 re-run under load, restore-under-concurrent-edit, cookie expiry mid-session), docs.

## Out of scope (explicit)

Block/page builder · font/typography changes · per-section custom colors · AI-minted themes · image upload/management · member-area/admin/letter-body editing · scheduled theme changes · re-theming ember bands or cover art.

## Risks

1. **Draft/ISR interplay** — mitigated by the pinned loader pattern (5b) + middleware strip; acceptance #2 is the drill.
2. **Section extraction churn** — per-page DOM-parity bar; join/FAQ realities pre-named so nobody discovers them mid-plan.
3. **Semantic-token theme design** — 31 vars × 2 modes × 5 themes is real design work; the contrast gate catches readability, but harmony with the fixed ember palette is a human design check per theme.
4. **Scope creep toward page-builder** — the registries are the fence; new section types are code PRs by design.
5. **Concurrent admins** — one shared draft (named in Stuck?); Apply/Restore races serialized by the advisory lock.
