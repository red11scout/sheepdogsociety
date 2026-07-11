# Admin Design Studio — Design Spec

**Date:** 2026-07-11 · **Approved by Drew:** 2026-07-11 ("love it. get it after") after 4 shaping decisions: curated studio (not block builder) · all public pages · AI = per-field assist + describe-it changesets, draft-only · five hand-designed themes.

**Goal:** Jeremy changes the site's text, layout, and look from one Studio page — with AI help, device/mode preview, side-by-side compare against live, and full undo — without being able to break the site, the brand, or Scripture.

## The loop (the only mental model Jeremy needs)

> Change things in a **draft** → **preview** it (phone/desktop, light/dark) → **compare** to what's live → **Apply** → (**undo** any time).

Nothing touches the live site until Apply. Discard-draft is always one click. Every Apply is a snapshot he can restore.

## Route + page anatomy

`/admin/studio` (admin layout gates it; sidebar: Site Content group, first item, icon `sparkles` or closest existing). Three zones:

- **Left rail (controls):** Theme picker · Page selector + section list (show/hide toggles, up/down reorder) · Text fields for the selected page (site-text editor rows, draft-aware).
- **Preview pane:** iframe of the real site with the draft applied. Toggles: device (mobile 375 / desktop) · mode (light / dark) · **Compare** (splits into live | draft, same page/device/mode).
- **Helper strip:** AI recommendations list · "Tell me what you want" box (describe-it) · **Stuck?** panel (playbook cards + first-run walkthrough) · Versions drawer · Apply / Discard buttons with plain-English confirms.

All UI copy hand-written in Jeremy's voice (system-prompt rules; no banned words; no em-dashes where commas work). Every control gets a HintTooltip; AdminPageIntro explains the page in one sentence.

## Data model (migration 0020)

- **`site_studio`** — single row (letter_autopilot precedent, ORDER BY id, seeded on first read):
  `id`, `draft` jsonb, `published` jsonb, `updated_at` timestamptz, `updated_by` FK users SET NULL.
  Config shape (both columns): `{ themeId: string, pages: { [pageId]: { sections: [{ id: string, visible: boolean }] } } }` — array order = render order. Absent page/section entries mean "registry default" (all visible, registry order), so an empty config renders today's site.
- **`site_text.draft_value`** — nullable text column. Draft semantics mirror the shipped value semantics: NULL = no draft edit for this key; empty/whitespace draft = "reset to default" staged. Apply promotes every non-NULL draft_value into value (empty → delete row, same as today's blank-save), then NULLs all draft_values.
- **`studio_versions`** — `id`, `snapshot` jsonb `{ config, textOverrides }` (the FULL published state after that Apply: config + every site_text row), `summary` text (auto-written one-liner: "Switched to Harvest, hid photo strip, edited 3 lines"), `created_at`, `created_by` FK SET NULL. Keep the newest 50 (delete older inside the Apply transaction).

**Apply is one transaction:** snapshot current published state → write draft config to published → promote text drafts → insert version row → prune to 50. Then `updateTag("studio")` + `updateTag("site-text")` + `revalidatePath` for affected pages. (Next 16: `updateTag`, never `revalidateTag` — read-your-own-writes; established in Phase B.)

**Restore** loads a version's snapshot into the DRAFT (config + text draft_values) for preview; going live is still an explicit Apply (which itself snapshots — so redo is free).

## Themes

`src/lib/studio/themes.ts` — registry of exactly 5 themes, each: `{ id, name, blurb, light: Record<CVar, string>, dark: Record<CVar, string> }` where CVar = the existing `--c-*` custom-property names (iron, bone, cream, ink, navy, brass, gold, olive, oxblood, stone, brass-deep + the semantic background/foreground set). `pasture-iron` (id of the current look) is values-identical to today's globals.css and is the default when config.themeId is absent.

- globals.css already indirects every color through `var(--c-*)` under `@theme inline` — the load-bearing fact that makes themes cheap. The published theme renders as a `<style>` block (root layout, server-rendered from cached config) that overrides `--c-*` at `:root` (light) and `.dark`/`[data-theme=dark]` (dark) — matching however globals.css scopes dark values today (verify at plan time and mirror exactly). `pasture-iron` renders NO override block (zero risk to today's site).
- Typography is fixed. Furniture (@utility classes) untouched. Only color variables change.
- **Contrast gate extended:** `scripts/check-contrast.mjs` grows to iterate all 5 themes × both modes over its existing pair list; CI/local gate fails if any theme fails AA. A theme that fails cannot ship — the registry is code, so the gate runs at build/PR time, not runtime.

## Section registries + page wiring

`src/lib/studio/sections.ts` — per public page: `{ pageId, label, sections: [{ id, label, hint, locked?: true }] }`.

- Pages covered: home, about, join, what-to-expect, how-we-gather, faq, contact, giving, plus FRAMING sections of events/letter/stories/resources indexes (headline + intro copy blocks; the dynamic lists themselves are single locked sections).
- **Locked (always-on, never reorderable):** every Scripture/ember band, every page hero, the dynamic-content sections (event list, letter list, resource browser, group map). Locked sections render in the section list greyed with the reason in the hint ("Scripture stays.").
- Each governed page reads `getStudioConfig()` (cached, tag `studio`) and renders its sections by config order/visibility, defaulting to registry order. Implementation shape per page: sections extracted into a `const SECTIONS: Record<sectionId, ReactNode>`-style map or ordered array the page assembles — smallest structural change that allows ordering, decided per page at plan time.
- Text coverage: SITE_TEXT_KEYS grows from 38 keys (Homepage/About) to every governed page's copy (groups per page). Scripture is never a key (standing rule). Dynamic/DB content is never a key.

## Draft preview + compare

- **Draft visibility uses Next's `draftMode()`** (built-in, cookie-scoped, bypasses ISR for draft requests only — public ISR caching is untouched for everyone else). `POST /api/admin/studio/preview` (requireAdmin) enables it; disable on studio exit and via a "stop preview" chip. When draftMode is enabled, `getStudioConfig()`/`getSiteTextMap()` read draft-merged state (config: draft column; text: draft_value ?? value).
- **Preview pane** iframes the real page URL. Device toggle = iframe width (375 / 1280). Mode toggle = query param `?studio-mode=dark|light`, honored by a tiny client helper ONLY when draftMode is enabled (never affects real visitors); it forces the next-themes attribute inside the iframe document.
- **Compare** = two synchronized-scroll iframes. Both carry the admin's draftMode cookie, so the LIVE side opts out explicitly with `?studio=published` — when draftMode is enabled AND this param is present, loaders serve published state. Param is inert without draftMode (public requests can't use it to see drafts, and it never fragments the public cache).

## AI layer (draft-only, always)

Three endpoints under `/api/admin/studio/` (requireAdmin, all log to ai_generations, model claude-sonnet-4-5, house `anthropic` import):

1. **`recommend`** — input: page id + its current text/sections/theme. Output: suggestion list, each `{ what, why, changeset? }` (why is one plain sentence). Deterministic pre-checks seed it (headline word count, section count, empty text overrides) so the panel is useful even before the model responds.
2. **`assist`** — per-field rewrite/tighten/warm-up. Returns draft text + one-line why. Existing editor-assist idiom.
3. **`describe`** — Jeremy's free-text goal → a full **changeset**: `{ themeId?, sectionChanges: [{pageId, sectionId, visible?, position?}], textEdits: [{key, value, why}] }`. Schema is BOUNDS-FREE (Anthropic structured output rejects all size bounds — house rule) with post-hoc validation: every key/pageId/sectionId/themeId must exist in its registry, locked sections untouchable, banned-language gate over every drafted string, length caps enforced in code. Valid changeset writes into the draft; invalid parts are dropped with a per-item note shown to Jeremy ("skipped two suggestions that touched locked sections").

AI never Applies. The Apply button is Jeremy's alone.

## Guides / get-unstuck layer

- AdminPageIntro + HintTooltips everywhere (house pattern).
- **Stuck? panel** — 6 static playbook cards: My change isn't on the live site (you haven't hit Apply) · I don't like my changes (Discard draft) · I applied and regret it (Versions → Restore) · The preview looks broken (refresh preview / stop-start preview) · What does each theme look like (theme picker previews instantly in the pane) · What can't I change (locked sections, Scripture, fonts — and why).
- **First-run walkthrough:** a dismissible 4-step card strip (pick a theme → toggle a section → edit a line → Apply) shown until dismissed (flag in site_studio config).

## Guard rails (invariants)

1. Scripture: never an editable key, never a hideable section.
2. Themes: only the 5 registry themes; all AA-gated at build time; no free-form colors anywhere.
3. AI writes only to draft; every AI string passes findBannedLanguage; changesets validate against registries post-hoc.
4. Apply/Restore/prune are single transactions; Apply uses updateTag (never revalidateTag).
5. draftMode gates all draft reads; `?studio=published` is inert without it; preview endpoints requireAdmin.
6. Locked sections: not hideable, not reorderable, not AI-touchable.
7. An empty/absent config renders today's site exactly (pasture-iron + registry defaults) — the studio shipping changes nothing until Jeremy acts.

## Build order (each its own plan → PR → live verification)

- **DS-1 (prove the loop):** migration 0020, themes registry + contrast-gate extension, studio config plumbing (cached reads, draftMode, apply/discard/versions), homepage section registry + wiring, the Studio page with theme picker + homepage sections + existing homepage text keys, preview (device/mode) + compare, Apply/undo end to end. Ships fully usable for the homepage.
- **DS-2 (coverage):** section registries + text keys for the remaining public pages; page wiring; studio page selector grows.
- **DS-3 (AI):** recommend / assist / describe endpoints + helper strip UI + changeset validation.
- **DS-4 (polish + hardening):** guides/walkthrough final pass, 375px admin pass on the studio itself, live-fire drills (restore under concurrent edits, draft-cookie expiry, theme swap on slow connections), docs.

## Out of scope (explicit)

Block/page builder (rejected again — curated studio won); font/typography changes; per-section custom colors or free-form styling; image upload/management; editing member-area, admin, Bible reader, or letter bodies; AI-minted themes (the 5 are hand-designed; revisit only after usage); scheduled/timed theme changes.

## Risks

1. **Draft/ISR interplay** — draftMode is the sanctioned mechanism, but the loaders' draft-merge logic must never leak into cached public renders; DS-1 live-fire includes a cache-poisoning drill (draft on in one browser, public checks from another).
2. **Section extraction churn** — reordering requires restructuring each page's JSX into addressable sections; per-page diffs kept minimal and each page independently verifiable (render-identical with empty config is the bar).
3. **Compare-pane cookie sharing** — solved by explicit `?studio=published` opt-out; the drill for this is in DS-1.
4. **Scope creep toward page-builder** — the registries are the fence; anything needing a new section type is a code PR, by design.
5. **Concurrent admins** — single-row draft means two admins share one draft; acceptable (Jeremy is effectively the only editor); noted in the Stuck? panel.
