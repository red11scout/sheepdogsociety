# Acts 2028 Sheepdog Society

## Overview
A weekly editorial newsletter for Christian men, anchored in Acts 20:28. Brief at `/Users/drewgodwin/Downloads/compass_artifact_wf-145eb503-8b48-455b-b02c-82c124aca57a_text_markdown.md`. Public site (Letter, Devotionals, Groups, Resources, Subscribe) plus a member community (chat, prayer, accountability, channels, reading plans) preserved from the original build. Admin-only auth via magic-link.

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript strict
- **UI**: shadcn/ui + Tailwind CSS v4 + Radix UI + Lucide icons
- **Brand**: Pasture & Iron palette + broadsheet-editorial system (2026-07-08 elevation): Fraunces variable (display/masthead, opsz/SOFT/WONK axes), Inter (folio/UI/body), Cormorant Garamond (pull-quotes/ember-band verse), Merriweather (reader serif), JetBrains Mono (section marks). Design truth: design-system/sheepdog-society/MASTER.md. Furniture utilities are Tailwind v4 @utility (cascade-layer safe).
- **Auth**: Auth.js v5 (NextAuth) + Resend magic-link + Drizzle adapter (allowlist via `ADMIN_EMAILS`)
- **Database**: Neon Postgres in production (`DATABASE_URL` = pooled endpoint, host suffix `-pooler`; `DATABASE_URL_UNPOOLED` available for migrations). Wired into Vercel via the Marketplace integration so env vars sync automatically. Previous Supabase install was retired 2026-05-08.
- **ORM**: Drizzle ORM (`src/db/schema.ts`, 38 tables)
- **AI**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) streaming via `claude-sonnet-4-5`. NEVER LangChain.
- **Email**: Resend (transactional + Broadcasts) + React Email templates (`src/emails/`)
- **Editor**: Tiptap v3 (StarterKit + Underline + Link + Image + Placeholder + BubbleMenu via `@tiptap/react/menus`)
- **Maps**: Mapbox GL + react-map-gl (Phase E geocoder/draggable-pin admin not yet built; existing `LocationMap` component covers reads)
- **Storage**: Vercel Blob (`@vercel/blob`)
- **Theme**: next-themes, defaultTheme="system" + enableSystem (2026-07-08); every public surface has true dark variants; AA gated by `npm run check:contrast` (scripts/check-contrast.mjs, both themes).

## Commands
```bash
npm run dev          # next dev — local server on :3000
npm run build        # next build — Turbopack production build
npm test             # vitest — src/lib unit tests (recurrence math)
DATABASE_URL='...' node scripts/apply-neon-migration.mjs  # apply Drizzle SQL to prod Postgres
npx drizzle-kit generate                                       # generate new migration after schema change
```

NEVER `drizzle-kit push` to prod. Migrations apply via `scripts/apply-neon-migration.mjs` or a manual GitHub Action.

## Key Patterns
- Server Components by default; `"use client"` only for interactivity (editor, modals, state)
- Auth.js `auth()` available at `@/auth` (full Session) or `@/lib/auth-compat` (Clerk-shape `{ userId }` for the 76 legacy call sites still in transition)
- Admin gating: middleware lets public routes through; admin pages double-check `users.role === "admin"` server-side
- AI calls: server-only, all log to `ai_generations` with prompt/version/model/tokens. Banned-word list in `src/lib/ai/system-prompt.ts`. Programmatic banned-language gate at `src/lib/ai/banned.ts` (resources field notes + all letter-series generation). **Anthropic structured output rejects ALL size bounds** (array minItems/maxItems, string min/max, integer min/max — zod v4 `.int()` auto-emits the latter): every AI schema stays bounds-free; validate post-hoc with retry. Letter autopilot: `src/server/letters/autopilot.ts` (engine, `runAutopilot({dryRun})`), state in `letter_autopilot` (single row), series writes via `createSeriesWithLettersCore` (transactional, advisory lock 815551 shared with the wizard + single-letter create). Visibility email is load-bearing (failure reverts the block to drafts); covers best-effort after it. Resource field notes: AI-drafted + admin-approved via `src/lib/resources/generate-field-notes.ts`; only status `approved` renders publicly; admin hand-edits sanitized by `src/lib/resources/sanitize-field-notes.ts`. Bible verse text NEVER generated — use `{{VERSE: ref}}` placeholders
- Soft delete: `deletedAt` column + partial unique indexes (`.where(deleted_at IS NULL)`); 30-day cron purge
- Letter versions: every autosave writes a row to `letter_versions` for restore/diff
- Site text: curated editable copy (homepage + About ONLY). Registry in `src/lib/site-text/registry.ts` is the source of truth for keys/labels/defaults; `site_text` table stores overrides only (empty/whitespace = use default; blank-save deletes the row). Read via `getSiteTextMap()` (`src/lib/site-text/get.ts`, `unstable_cache` tag `site-text`); saves in `src/server/site-text-admin.ts` call `updateTag("site-text")` — NOT `revalidateTag`, which in Next 16 requires a profile arg and would serve stale copy after saves. Editor at `/admin/site-text`. Scripture is never a site_text key.
- Design Studio (`/admin/studio`, DS-1 + DS-2 + DS-3 shipped, ALL 12 public pages governed (home/about/join/faq/contact/giving/what-to-expect/how-we-gather/events/letter/stories/resources) + an AI layer — see `docs/superpowers/specs/2026-07-11-admin-design-studio-design.md`): draft/publish site theme+layout with preview, side-by-side compare against live, and full undo. `site_studio` (single row, `draft`/`published` jsonb configs), `studio_versions` (snapshot history, bigint identity ordering), `site_text.draft_value` (draft overlay on the existing site-text table). Render-merge rule (`src/lib/studio/config.ts`) makes locked sections (Scripture, page heroes, live feeds/forms) permanently unhideable/unreorderable regardless of what's in the config — `src/lib/studio/sections.ts`'s `SECTION_REGISTRY` covers all 12 pages. Draft visibility is Next's `draftMode()`, checked strictly OUTSIDE every `unstable_cache` scope (never inside — that's the anti-poisoning rule); the theme `<style>` override renders ONLY from `src/app/(public)/layout.tsx`, never the root layout. Compare's "live" pane works via a middleware cookie-strip (`?studio=published` in `src/middleware.ts`) — not a loader-level check, since layouts can't read query params. Apply/Restore are Server Actions serialized by `pg_advisory_xact_lock(815552)` (NOT 815551, which belongs to letter series) with cache flush `updateTag("studio") + updateTag("site-text") + revalidatePath("/", "layout")`. 5 hand-designed themes (`src/lib/studio/themes-data.mjs`) cover 10 of 11 `--c-*` vars + all 20 shadcn semantic vars — `--c-iron` and the ember bands are theme-constant by design; the contrast gate (`check-contrast.mjs`) covers all 5 themes × both modes. Ships disabled-by-default: empty config = today's site, unchanged. `/admin/studio`'s page selector (`PAGES` const in `page.tsx`) drives which page's sections/text/preview-iframe render; `saveDraftConfig` always takes and patches the WHOLE `StudioConfig` object (`{ ...config, pages: { ...config.pages, [selectedPage]: { sections } } }`) — never a partial object, or every other page's saved layout is lost. Contact is the one page split into a server `page.tsx` + a `src/components/public/contact-form.tsx` client component, since it was the only fully-client public page (needed the async Studio data fetch). Gotcha class hit 3 times during DS-2: a site-text default's WORDING can match the real page copy while its JSX STRUCTURE doesn't (e.g. a two-line `<br/>`+`<em>` headline collapsed into one key) — always check the actual surrounding markup shape, not just the rendered words, before wiring any headline/empty-state copy. AI layer (`src/server/studio-ai.ts`): `recommendForPage`/`assistField`/`describeChangeset`, all `requireAdmin`-gated, all logged to `ai_generations` (migration 0023 adds `studio_recommend`/`studio_assist`/`studio_describe` enum values — must be applied before the AI strip is used, auto-runs via `.github/workflows/apply-migrations.yml` on merge to main). AI never Applies — only calls the existing `saveDraftConfig`/`saveDraftText`. Changeset validation core (`src/lib/studio/changeset.ts`) enforces id existence, locked-section immunity, position bounds against the real `renderMerge`-materialized order, duplicate rejection, and a 20-item cap before anything reaches a draft; every AI string passes `findBannedLanguage`; every AI schema is bounds-free. `describeChangeset` reads the draft directly from the DB (`db.select().from(siteStudio)...normalize(row?.draft)`, matching `/admin/studio`'s own page.tsx) — NEVER `getStudioConfig()`, which only returns the real draft when `draftMode()`'s preview cookie happens to be on, not during normal editing; using it as the base silently reverts unstaged changes. DS-4 (polish/hardening) is the next phase.
- Resend Broadcasts: created in `publishLetter` server action; failures don't block the website publish
- Bible reader: public + stateless at `/bible` (no bookmarks/notes/highlights). Pure data/parsers in `src/lib/bible/books.ts` (Vitest), fetch in `chapter.ts`: ESV 24h cache → WEB public-domain fallback with a visible notice. Scripture renders verbatim from the API — never edited, never AI-generated. Crossway attribution at the end of every reader page.

## Brand Voice (Jeremy)
Pastoral, warm, direct, masculine without macho. Short Anglo-Saxon sentences. Imperative + invitation, never command. Tender and tough. NEVER: delve, leverage, navigate, robust, tapestry, journey (n.), rise, reclaim, real men, alpha, based, toxic masculinity. NEVER em-dashes when commas work. NEVER political/culture-war framing.

## Active Routes
**Public (`(public)`):** `/`, `/groups`, `/groups/[slug]`, `/events`, `/events/[id]`, `/letter`, `/letter/[slug]`, `/letter/archive`, `/bible`, `/bible/[book]/[chapter]`, `/join` (single entry, ?path=start), `/stories`, `/resources`, `/resources/[slug]`, `/about`, `/faq`, `/what-to-expect`, `/how-we-gather`, `/contact`, `/giving`, `/partnerships`, `/acts-20-28`, `/privacy`, `/sms-terms`. 308s: `/locations*`→`/groups*`, `/encouragements*`→`/letter*`, `/get-started`+`/groups/start`+`/locations/request`→`/join`. `/gallery` is login-gated (admin tool; masthead tab renders for signed-in admins only). Contact: form notifies shepherd@acts2028sheepdogsociety.com (forwards to the on-duty admin).
**Auth (`(auth)`):** `/admin/sign-in`, `/admin/check-email`
**Admin (`(app)/admin`):** `/admin/dashboard`, `/admin/letters`, `/admin/letters/[id]`, `/admin/blog`, `/admin/contacts`, `/admin/devotionals`, `/admin/events`, `/admin/groups`, `/admin/locations`, `/admin/location-requests`, `/admin/location-interests`, `/admin/newsletter`, `/admin/prayer`, `/admin/reading-plans`, `/admin/resources`, `/admin/scripture`, `/admin/site-text`, `/admin/studio`, `/admin/testimonies`, `/admin/users`. Sidebar groups by job (Phase B): This Week / The Letter / People & Groups / Site Content / Settings.
**SEO:** `/sitemap.xml`, `/robots.txt`
**API:** `/api/auth/[...nextauth]`, `/api/ai/draft`, `/api/ai/improve`, `/api/ai/blog-draft`, `/api/ai/devotional`, `/api/ai/scripture-of-day`, `/api/ai/reading-plan`, `/api/webhooks/resend`, plus existing CRUD under `/api/admin/*` and public reads under `/api/public/*`, `/api/public/bible/search` (ESV keyword search; 503 without `ESV_API_KEY`). Legacy member `(app)/bible` pages + `/api/bible/*` routes removed 2026-07-09 (`src/lib/bible/index.ts`/`api-bible.ts` remain dormant, consumer-less).

## Required Env Vars
**Auth:** `AUTH_SECRET`, `AUTH_RESEND_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`
**Email:** `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM_AUTH`, `RESEND_FROM_NEWSLETTER`
**DB:** `DATABASE_URL` (Neon pooled endpoint — used by the entire runtime: app queries + Auth.js + every feature). `DATABASE_URL_UNPOOLED` for migration scripts that need a stable session. Migrations applied via the GitHub Action at `.github/workflows/apply-migrations.yml` (auto on push to main when `drizzle/*.sql` changes) using the `DATABASE_URL_PRODUCTION` env secret.
**AI:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (for `gpt-image-1`, optional)
**Maps:** `NEXT_PUBLIC_MAPBOX_TOKEN`
**Storage:** `BLOB_READ_WRITE_TOKEN`
**Bible:** `ESV_API_KEY` (Prod+Dev only, NOT Preview — Preview deploys serve the WEB fallback and the search-down state by design), `API_BIBLE_KEY` (legacy, dormant)
**Cron:** `CRON_SECRET`
**Legacy / dead weight:** Vercel env cleaned 2026-07-08 — all `SUPABASE_*`/`NEXT_PUBLIC_SUPABASE_*` keys, the `POSTGRES_*` integration aliases, and stale branch-scoped `DATABASE_URL*` entries were removed (Clerk vars were already gone). The dormant `src/lib/supabase/*` and `src/hooks/use-realtime-messages.ts` modules remain in the repo; they read the deleted vars lazily inside functions, so builds are unaffected and only the decommissioned chat pages would error at runtime. Note: `ESV_API_KEY` and `API_BIBLE_KEY` exist in Production + Development but NOT Preview.

## Vercel
- Project: `drew-godwins-projects/sheepdogsociety`
- Live: `acts2028sheepdogsociety.com` (apex 307→www) + `www.acts2028sheepdogsociety.com`
- Cron: `vercel.json` declares `/api/cron/purge` (daily 4am UTC, soft-delete sweeper), `/api/cron/publish-scheduled-letters` (every 15 min), `/api/cron/materialize-events` (daily 4:30am UTC, tops up 8-week series horizon), `/api/cron/autopilot-letters` (Mondays 13:00 UTC, `maxDuration: 300`, Bearer-only auth — generates a 4-letter theme block when autopilot is enabled and <2 scheduled letters remain; ships disabled, toggle on the Autopilot card at `/admin/encouragements`). AI routes get `maxDuration: 60` (Pro plan). (The `/api/cron/group-followup` entry was removed 2026-07-09 — the route file never existed, so it 404ed hourly in production.)
- Migrations: never `drizzle-kit push` to prod; use `scripts/apply-neon-migration.mjs` or a manual GH Action.

## GitHub
- Repo: `red11scout/sheepdogsociety`
- Migration branch: `migration/authjs-neon-brief` (active — contains the Auth.js + brand redesign + Phase D/E/F work)
