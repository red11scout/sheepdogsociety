# Design — Legacy sweep, plant-request approval, subscribed column, announcements

Date: 2026-07-22. Requested by Drew. Autonomous session: design decisions recorded here, defaults chosen where the brief was open.

## Scope

Two PRs:

1. **PR 1 — `chore/legacy-sweep`**: delete verified-dead code (zero importers confirmed by sweep).
2. **PR 2 — `feat/plant-subscribe-announce`**: migration 0025 + three features + subscribe/newsletter cleanup wiring.

## PR 1 — Legacy sweep (deletions only, no behavior change)

Delete (all verified zero live importers):

- `src/lib/bible/index.ts`, `src/lib/bible/api-bible.ts` (dormant since member bible pages removed; `books.ts`/`chapter.ts`/`esv.ts` stay — live)
- `src/emails/newsletter.tsx`, `src/emails/magic-link.tsx` (auth is password-based; letter email uses `encouragement.tsx`)
- Decommissioned member area: `src/app/(app)/{accountability,prayer,testimonies,members,dashboard}/` + their private APIs `src/app/api/{accountability,prayer,testimonies}/**`. The two `redirect("/dashboard")` calls in `/admin/location-requests` + `/admin/location-interests` pages repoint to `/admin/dashboard`.
- Orphaned member REST APIs: `src/app/api/groups/**`, `src/app/api/events/**` (public pages read the DB directly)
- Dead blog stack: `src/components/blog/tiptap-editor.tsx`, `src/app/api/admin/blog/**`, "blog" breadcrumb label; drop all `@tiptap/*` deps
- `src/components/AskTheWatch.tsx` + `src/app/api/public/ai/ask/route.ts`
- `src/components/ui/scroll-area.tsx`
- `src/components/public/newsletter-form.tsx` (orphaned since the duplicate-signup removal; `/join` is the canonical subscribe surface; `/api/public/newsletter` endpoint stays)
- `src/app/api/webhooks/clerk/route.ts` (Clerk retired long ago; 410 tombstone no longer earning its keep)
- `src/app/(auth)/admin/check-email/` + `verifyRequest` entry in `auth.config.ts` + its middleware allowlist line (no magic-link provider exists)
- `scripts/apply-supabase-cutover.mjs` (keep `drizzle/0001_supabase_cutover.sql` — migration history)
- Unused deps: `@tiptap/*` ×7, `@dnd-kit/core`, `@dnd-kit/sortable`, `@auth/drizzle-adapter`, `@vercel/og`

Kept deliberately: `src/lib/auth-compat.ts` (80 importers — refactor is churn, not cleanup), `/sign-in`+`/sign-up` redirect stubs (old-bookmark UX, 8 lines), `/setup` bootstrap tool, `/admin/newsletter` + `/api/public/newsletter` (live management of the Resend-audience pool). Stale comments fixed in passing (letter page footer note, `encouragements.ts` reference to deleted `letters.ts`, AdminHelp signup note).

## PR 2 — Features

### Migration `drizzle/0025_plant_group_subscribed_announcements.sql` (hand-written; never drizzle-kit generate)

- `location_requests` + columns: `proposed_group_name`, `address`, `zip_code`, `meeting_day`, `meeting_time`, `meeting_place`, `location_type` (default `in_person`), `latitude`, `longitude` (text, geocoded best-effort at submit), `created_group_id` uuid, `created_location_id` uuid (idempotency: set on approval)
- `members` + `subscribed boolean NOT NULL DEFAULT true`
- New `announcements` table: `id, subject, body, cta_label, cta_url, audience, sent_by, recipient_count, sent_at, created_at`

### 1. Plant-a-group request → approved group on the map

- **Public form** (`plant-request-form.tsx`) collects what the admin add-a-group form holds: group name*, city*, state*, street address*, ZIP, meeting place, meeting day (select), meeting time, plus the existing name*/email*/phone and "why you want to lead". Requester contact becomes the location's admin-only contact fields.
- **Submit route** stores the new fields and geocodes best-effort (non-blocking) so the admin sees coordinates before approving.
- **Approve** (`PATCH /api/admin/location-requests`): if `created_group_id` set → already created (no dup). Else resolve coordinates: request row's stored lat/lng → geocode full address → geocode city/state. If all fail → 422, request stays pending, admin told to fix the address. On success calls the existing `upsertGroupLocation({ approvalStatus: "approved", ... })` (creates group + location, slug, `displayedOnMap=true`, revalidates public pages), stores created ids back on the request, then sends the existing decision email with the live group URL added.
- **Admin request cards** show the new fields + geocode state.

### 2. `subscribed` checkbox in /admin/members (default yes → weekly letter)

- Column on `members` (single source of truth; `member_notification_prefs.wants_newsletter` remains the signup-form input that seeds it).
- `/admin/members` gets a Letter column with a checkbox (toggle patterned on ActiveToggle), included in add-member form and bulk actions.
- **Resend Audience sync** (`src/lib/resend-audience.ts`): checked + email → upsert contact `unsubscribed:false` into `RESEND_AUDIENCE_ID`; unchecked → `unsubscribed:true`. Best-effort, never blocks DB writes. Wired into: member toggle, createMember, `/api/members` join route (seeded from `wantsNewsletter`). The weekly letter continues to broadcast to the audience — the checkbox now controls membership in it. One-time backfill script `scripts/sync-members-to-audience.mjs` for existing members.
- Resend webhook `contact.unsubscribed`/`subscribed` additionally flips `members.subscribed` by email so the checkbox stays honest.

### 3. /admin/announcements — branded email blasts from shepherd@

- New sidebar entry (The Letter group) + page: audience radio (**All subscribed members** = active, subscribed, has email / **Leaders only** = + role leader|asst_leader / **Men in groups** = + group assigned), live recipient counts, subject, message, optional CTA label+URL, **Send test to me**, then Send with confirm. History list of past sends below.
- `src/server/announcements.ts`: `requireAdmin`; recipient query + email dedupe; per-recipient render of new `src/emails/announcement.tsx` (branded like the weekly letter: cream/ink/brass, "§ From the Shepherd" kicker, serif body, footer + per-recipient unsubscribe); sent via `resend().batch.send` in chunks of 100 with a delay between chunks, `from: FROM_SHEPHERD`, `replyTo: SHEPHERD_EMAIL`; `announcements` row recorded.
- **Unsubscribe**: stateless HMAC token (`AUTH_SECRET`-keyed) per member id — `/api/public/unsubscribe?m=<id>&t=<token>` sets `subscribed=false` + best-effort audience unsubscribe, renders a small branded confirmation. No new columns, works for every member.

### 4. Subscribe/newsletter cleanup

Dead pieces removed in PR 1; the pool split healed by the audience sync above; `/admin/newsletter` hint copy + CommandPalette "send broadcast" action repointed to Announcements.

## Testing

- Vitest: HMAC token roundtrip/tamper, recipient dedupe + chunking, announcement template renders with brand markers.
- `npx tsc --noEmit`, `npm test`, `npm run build` green before each PR.
- Post-merge: prod join form verified in browser; migration action + Vercel deploy watched; test announcement send verified live where env access allows.
