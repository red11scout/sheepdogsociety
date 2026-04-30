# Phase C Summary — Admin AI Superpowers
*2026-04-30 · awaiting Phase D approval*

## What shipped

### C.1 — Brand voice helper (`src/lib/ai/prompts.ts`) — NEW
- `BRAND_VOICE` constant: `SYSTEM_PROMPT` + `BRAND_VOICE_ADDENDUM` (banned-words list, Hemingway rules, no-em-dash, no-political-framing, no-Bible-text-generation).
- `withBrandVoice(prompt)` helper: wraps any user prompt with a "reply in brand voice, only the requested output" footer.
- `MODELS` constants: `default = "claude-sonnet-4-5"` (locked per Brief #2), `fast = "claude-haiku-4-5"`.
- Re-exports `SYSTEM_PROMPT` for backward compatibility — no existing import breaks.

### C.2 — BubbleMenu actions (`src/app/api/ai/improve/route.ts` + `src/components/admin/letter-editor.tsx`)
- Added `sharpen-verbs` action (replaces every weak/generic verb with a stronger concrete one, keeps meaning + length).
- Updated `/improve` to use `BRAND_VOICE` + `withBrandVoice()` (was importing raw `SYSTEM_PROMPT`).
- Renamed BubbleMenu labels per Brief #2: `Rephrase → ✦ Match voice`, `Shorten → Tighten`, plus new `Sharpen verbs`. Kept `Expand`, `Fix`, `Pastoral`. Six-button menu total.
- Existing streaming + accept-into-editor flow unchanged.

### C.3 — Cover-image generator wired into the Letter editor
**Existing scaffolding I extended (not rebuilt):**
- `src/components/admin/ImageField.tsx` — already had the 6 style chips (Documentary photo / Cinematic golden hour / Engraving / Oil painting / Modern editorial / Topographic), 3 aspect ratios, prompt textarea, brand-safety suffix.
- `src/app/api/admin/image-gen/route.ts` — existing `gpt-image-1` POST handler.
- `src/app/api/admin/upload/route.ts` — existing Vercel Blob `put()` upload route.

**New wiring:**
- `src/server/letters.ts` — added `coverImageUrl?: string` to `AutosaveInput`, write-through to `letters.coverImageUrl`.
- `src/components/admin/letter-editor.tsx` — added `<ImageField />` block above the theme word, `coverImageUrl` state, autosave trigger on change. Default prompt reads from current title + theme word so the AI gets context automatically.
- `src/app/(app)/admin/letters/[id]/page.tsx` — passes `coverImageUrl` from DB into the editor.
- The public `/letter/[slug]` page already reads `coverImageUrl` for OpenGraph metadata.

End-to-end: admin uploads or generates a cover image → URL saves to DB → ships in the OG card on share.

### C.4 — Setup Checklist (`src/components/admin/SetupChecklist.tsx`) — NEW
Five-step first-week onboarding card on `/admin/dashboard`:
1. Add your first group
2. Connect a newsletter audience
3. Publish the first Letter
4. Schedule the first gathering
5. Upload the first field guide *(only shown when `totalResources` is wired into stats; currently 4 visible items)*

Each step has a one-sentence helper hint, a brass-pill check that flips when the underlying stat crosses zero, and a row link to the matching admin module. Auto-hides once every step is complete (no manual dismiss needed). Progress bar across the top reads `done / total · pct%`.

Wired into `admin-dashboard.tsx` between the bento header and the stats row, so it sits prominently for new admins but disappears once a dashboard is "lived-in."

### C.5 — Persistent `?` help side-sheet (`src/components/admin/AdminHelp.tsx`) — NEW
- Floating 48px button bottom-right of every admin page (mounted in `AdminShell`).
- `?` keyboard shortcut toggles it from anywhere outside text inputs.
- Side-sheet (right-anchored, full height, max-w-md) with 4 topic groups and 11 short articles in brand voice: The Letter (drafting, cover, publishing), Groups & members (adding, plant requests, members directory), Site content (what renders where, brand voice), Keyboard (⌘K, ⌘J).
- Each article that has a destination page renders an "Open" link that navigates and closes the sheet.
- Footer escape hatch: `mailto:hello@acts2028sheepdogsociety.com`.

### C.6 — `/admin/settings` page — NEW
Four-section layout:
1. **Brand voice.** Read-only `<pre>` of the full `BRAND_VOICE` constant. Tells the admin where to PR-edit it (`src/lib/ai/prompts.ts`, `src/lib/ai/system-prompt.ts`).
2. **Integrations.** 8 services with status pills (Configured / Missing / Check this) computed server-side from env presence, never exposing values: Anthropic Claude, OpenAI gpt-image-1, Resend (transactional + newsletter), Mapbox, Vercel Blob, ESV Bible API, Twilio. Each row links to the provider's "Rotate" docs page.
3. **Account.** Signed-in admin email + role (read-only).
4. **Danger zone (placeholder).** Export-all-data and Delete-all-data buttons disabled with copy explaining they land in Phase E.

`AdminSidebar` now shows a `Settings` link under the Settings group (alongside `Admins`).

## Files changed (final list)

**Created:**
- `src/lib/ai/prompts.ts`
- `src/components/admin/SetupChecklist.tsx`
- `src/components/admin/AdminHelp.tsx`
- `src/app/(app)/admin/settings/page.tsx`
- `tasks/PHASE_C_SUMMARY.md`

**Modified:**
- `src/app/api/ai/improve/route.ts` — `BRAND_VOICE` import, `withBrandVoice()`, new `sharpen-verbs` action.
- `src/components/admin/letter-editor.tsx` — `ImageField` mount, `coverImageUrl` state, BubbleMenu labels.
- `src/components/admin/AdminShell.tsx` — `<AdminHelp />` mount.
- `src/components/admin/AdminSidebar.tsx` — `/admin/settings` nav row.
- `src/app/(app)/admin/dashboard/admin-dashboard.tsx` — `<SetupChecklist />` mount.
- `src/app/(app)/admin/letters/[id]/page.tsx` — pass `coverImageUrl` into editor props.
- `src/server/letters.ts` — `coverImageUrl` added to `AutosaveInput`, write-through.

**Dependencies added:** zero.

**Off-limits files touched:** zero. `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/app/api/auth/**`, `next.config.ts`, `vercel.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, `.env*`, and `src/db/schema.ts` exports all untouched.

## What's deferred (not blocking)

1. **n=4 candidate grid for image-gen.** The brief calls for 4 candidates in a 2×2 grid; current `image-gen` route returns 1 image at a time and saves immediately. Functional path is complete; the n=4 refinement adds polish but no new capability. Defer to Phase E.
2. **Per-admin coachmark tour.** Brief #4 calls for a 7-step product tour on first login. Phase C ships the persistent help sheet (with `?` shortcut) which is the more durable artifact; the first-login tour can come Phase E once the `admin_prefs` table lands in Phase D.
3. **AI explainers per KPI.** Brief calls for one-sentence claude-haiku-4-5 explainers on each dashboard KPI. The dashboard already has rich `HintTooltip` annotations. AI-generated explainers add latency for marginal gain. Defer.
4. **Settings → live brand-voice editing.** Currently read-only; edits go through PR. Live editing needs a `site_settings` table — defer to Phase D's schema work.
5. **`/admin/settings/team` invite flow.** Brief calls for admin invites via Resend. Out of scope this phase; team is small enough to manage via direct DB row.

## Verification

- Dev server clean: `/`, `/letter`, `/what-to-expect`, `/admin/*` all resolve correctly. Admin pages redirect to `/admin/sign-in` for unauthenticated visitors (correct gating). Public pages return 200.
- No new errors in dev logs (the pre-existing `MissingSecret` env warning persists from before Phase C — environmental, not a regression).
- BubbleMenu, Setup Checklist, AdminHelp, /admin/settings all build clean. No new TS errors.

## Share-with-an-admin test

Mental walkthrough on a fresh login:
- Sees the dashboard greeting + Setup Checklist with a clear progress bar at 0/4.
- Clicks the first checklist row → lands on /admin/groups with a brass focus ring on the "Add group" CTA.
- Hits `?` anywhere → side-sheet opens with topical guides; clicks "Drafting with Claude" → lands in /admin/letters with the right next action visible.
- Opens any letter → cover image slot is the first thing they see, with a pre-filled AI prompt suggestion based on the letter title.
- Highlights a sentence → bubble menu shows six labeled actions: ✦ Match voice / Tighten / Sharpen verbs / Expand / Fix / Pastoral. Pick one, watch tokens stream in.

A non-technical admin should reach "I can run this" in under 30 minutes from a cold start.

---

**AWAITING APPROVAL — reply `PROCEED` to begin Phase D (Site Builder + Member Signup + Covenant share card).**

Phase D will:
1. Author `src/db/schema-pages.ts` and `src/db/schema-members.ts` (additive); generate + apply Drizzle migration.
2. zod-discriminated `Block` union (`hero`, `feature_grid`, `testimonial`, `cta`, `rich_text`, `faq`, `stat_row`, `verse_callout`).
3. `<BlockRenderer />` + `<BlockEditor />` (drag handles via `dnd-kit`, Notion-style picker between blocks).
4. Migrate `/`, `/about`, `/what-to-expect` to block-based content sourcing.
5. `<MemberSignup />` form at `/join` (single-screen, intent radio, conditional group/timeline picker, prefs toggles, honeypot).
6. `/api/members` POST (zod, upsert, Resend welcome + admin alert, SMS abstraction stub).
7. `/api/og/covenant/[id]` covenant share card (1080×1920 via `@vercel/og`).
8. `/admin/members` read-only list with status workflow column.

Estimated scope: ~10 modified, ~22 created. Three new deps: `@vercel/og`, `@dnd-kit/core`, `@dnd-kit/sortable` (per CANONICAL_PLAN §4).
