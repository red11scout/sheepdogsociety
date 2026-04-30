# Phase D Summary — Member Signup + Share Moment + Block Schema
*2026-04-30 · awaiting Phase E approval*

## What shipped — end-to-end Member Signup

### D.0 — Three new dependencies
- `@vercel/og@^0.6.8` — covenant share-card render.
- `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0` — for the deferred BlockEditor reorder UI (foundation only).

### D.1 + D.2 — Additive schemas (`src/db/schema-members.ts` + `schema-pages.ts`)
Five new tables, all behind feature-flag-able usage:

| Table | Purpose |
| :-- | :-- |
| `members` | The man who signed up. Soft-deletable, status workflow (`new → reviewed → contacted → connected → needs_followup / not_a_fit / archived`), intent (`join` / `start` / `just_keep_posted`), optional groupId, location fields for "start a group" intent, source page. |
| `member_notification_prefs` | Per-member toggles: `wantsNewsletter`, `wantsEvents`, `wantsSms`. Plus full TCPA / A2P 10DLC consent record (IP, UA, verbatim disclosure shown, timestamp, double-opt-in marker). One-click email unsubscribe token. Recipient timezone for quiet-hour gating. |
| `admin_prefs` | Per-admin UI state. Tour progress, sidebar collapsed, last-seen changelog. |
| `pages` | Block-based page content. `slug` (unique among non-deleted), `status` (`draft` / `published`), `blocks` jsonb, `seo` jsonb, `publishedAt`, `updatedBy`, soft-delete. |
| `page_versions` | Snapshot of `pages.blocks` per save for revert. |

Three new enums: `member_intent`, `member_status`, `member_timeline`, plus a `page_status_v2` (the `_v2` suffix avoids clashing with the legacy `page_status` enum still in `schema.ts`).

`schema.ts` got two re-export lines at the very bottom — added new exports without changing any existing ones (off-limits rule honored).

### D.3 — Migration generated + applied
- `drizzle-kit generate` produced `drizzle/0004_phase_d_members_pages.sql` (20 statements: 4 enums, 5 tables, 6 FKs, 5 indexes).
- Renamed from `0001_*` to `0004_*` to avoid lexical collision with the existing `0001_supabase_cutover.sql`. Drizzle journal updated to match.
- Applied via `node -r dotenv/config scripts/apply-neon-migration.mjs dotenv_config_path=.env.local` — every statement returned OK; older migrations correctly hit "already exists" tolerations.

### D.4 — SMS provider abstraction (`src/lib/sms/index.ts`)
- Single `sendSms({ to, message, category, memberId?, eventId? })` seam.
- Phase D returns `{ status: "not_configured", reason: "missing_provider_credentials" }` until Phase E wires Twilio.
- Five categories: `welcome`, `double_opt_in`, `event_reminder`, `newsletter`, `transactional`.
- Five result statuses: `sent` / `queued` / `blocked` / `not_configured`.
- `isSmsEnabled()` checks `SMS_ENABLED === "true"` AND all three Twilio env vars are present.
- Exports the verbatim `SMS_OPT_IN_DISCLOSURE` string — A2P 10DLC requires we snapshot what was shown at consent; the form uses this constant on the disclosure card AND the `/api/members` route writes it into `sms_consent_text_shown`.

### D.5 — `<MemberSignup />` form + `/api/members` POST
**Form** (`src/components/MemberSignup.tsx`, ~350 LOC):
- Single-screen, no multi-step.
- Fields: name, email, phone (optional), 3-segment intent (`Join` / `Start` / `Just keep posted`), conditional group picker (when intent=join) or city/state/zip + 3-segment timeline (when intent=start), optional note, three notification toggles, terms checkbox.
- Honeypot field (positioned off-screen via `left: -9999px` not `display: none` — bots check that).
- SMS opt-in checkbox only appears if a phone number was entered. The verbatim TCPA disclosure renders inline as soon as SMS is checked.
- Submit → swaps form for `<CovenantSuccess />` showing the OG card + "Save image" + "Text a brother" buttons.

**API** (`src/app/api/members/route.ts`, ~250 LOC):
- zod validates every field.
- Honeypot accepted silently (returns 200 with sentinel id, bot never knows).
- Upsert by lowercased email — re-signups update the existing row, not create dupes.
- Notification prefs upsert separately. SMS consent IP / UA / verbatim disclosure snapshot recorded only if `wantsSms && phone`.
- Resend welcome email (plain text, brand voice, includes Acts 20:28).
- Admin alert email to every address in `ADMIN_EMAILS` env.
- SMS double-opt-in queued through `sendSms()` — returns `not_configured` cleanly under Phase D, no error surfaced to the user.
- Returns `{ memberId, covenantUrl, smsStatus, welcomeWarning? }`.

### D.6 — Covenant share card (`src/app/api/og/covenant/[id]/route.tsx`)
- `next/og` `ImageResponse` at 1080×1920 (vertical, iMessage + Instagram Story friendly).
- Brass on iron. First name in 230px Fraunces. City + state in mono small-caps under the name. Acts 20:28 verse + reference. Brand mark + "Stand watch" footer.
- Cache header `public, immutable, max-age=31536000` — once a card is generated, it's stable.
- Hardcoded brand hex (`#0E1624`, `#F2EBDD`, `#C8932A`, `#8A8275`) since `next/og` runs in an isolated edge-style context that can't read CSS variables.
- Uses `/join` flow's success state to render the card inline before the user shares it. The PNG URL also goes into the welcome email and any future text reminders.

### D.7 — `/admin/members` list (`src/app/(app)/admin/members/page.tsx`)
- Server-rendered list of every non-deleted member, joined to `member_notification_prefs`.
- Six columns (desktop): Name + city · Email + phone · Intent · Source + date · Notification pills (Letter / Events / SMS) · Status pill.
- Status pills color-coded by lifecycle: brass (new), stone (reviewed/contacted), olive (connected), oxblood (needs followup), grey (not_a_fit / archived).
- Empty state with brand-voice copy and a "see the public form" link.
- Free-text note rendered below the row when present, scoped with brass `Note:` prefix.
- Sidebar gets a new `Members` nav item under Modules with a "users-group" icon.

### D.8 — Block zod schema (`src/lib/blocks.ts`)
- Discriminated union of 8 block types: `hero`, `feature_grid`, `testimonial`, `cta`, `rich_text`, `faq`, `stat_row`, `verse_callout`.
- Each has tight zod constraints (max lengths, enum values, sensible defaults).
- Exports `BlockArray` (`z.array(Block)`), `BLOCK_TYPES` (admin picker metadata with display labels + icons), and a `parseBlocks(unknown)` helper for server-side validation.
- This is the **contract** for the deferred BlockRenderer + BlockEditor work.

## What's deferred (reasoned, not abandoned)

Per CANONICAL_PLAN §5, Phase D's full Site Builder track was scoped at ~16 components. Shipping a half-finished editor would defeat the "make this the last run" framing — block-based authoring is admin-power, not the user-share moment that makes the success test pass.

**Deferred to a Phase E follow-up:**
- D.9 — `<BlockRenderer />` + 8 component renderers (one per block type).
- D.10 — `<BlockEditor />` admin UI with `dnd-kit` drag handles + Notion-style picker.
- D.11 — Migration of `/`, `/about`, `/what-to-expect` to block-sourced content.

The `pages` and `page_versions` tables exist + the zod contract is locked, so the deferred work is purely UI + render code. None of it is on the launch critical path; the Member Signup + Covenant Card share moment is.

**Other deferrals:**
- Inline status editing on `/admin/members` — current page is read-only with a hint to update via SQL until Phase E ships the workflow editor.
- CSV export on `/admin/members`.
- One-click email unsubscribe `/api/unsubscribe/[token]/route.ts` — token is generated and stored, but the consumer route lands in Phase E.
- Granular preferences center at `/preferences/[token]/route.ts` — same.

## Verification

- All 5 new tables live in Postgres, foreign keys + unique indexes active.
- `/`, `/join`, `/admin/dashboard`, `/admin/members`, `/admin/settings` all resolve correctly (admin routes redirect to sign-in for unauthenticated requests — correct gating).
- `/api/og/covenant/{id}` returns `image/png` 200.
- `/api/members` POST: zod-validated end-to-end. Honeypot tested. Re-submission updates instead of duplicating.
- No new TS errors. No new build errors. Pre-existing `MissingSecret` env warning persists (environmental).
- No off-limits files touched: `auth.ts`, `auth.config.ts`, `middleware.ts`, `api/auth/**`, `next.config.ts`, `vercel.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, `.env*`, and existing `schema.ts` exports all unchanged.

## Files changed

**Created:**
- `src/db/schema-members.ts`
- `src/db/schema-pages.ts`
- `src/lib/sms/index.ts`
- `src/lib/blocks.ts`
- `src/components/MemberSignup.tsx`
- `src/app/api/members/route.ts`
- `src/app/api/og/covenant/[id]/route.tsx`
- `src/app/(app)/admin/members/page.tsx`
- `drizzle/0004_phase_d_members_pages.sql` (renamed from auto-generated 0001)
- `drizzle/meta/0004_snapshot.json` (renamed)
- `tasks/PHASE_D_SUMMARY.md`

**Modified:**
- `src/db/schema.ts` — appended two re-export lines (no existing exports touched).
- `src/app/(public)/join/page.tsx` — replaced stub with `<MemberSignup />` form + group-options server fetch.
- `src/components/admin/AdminSidebar.tsx` — added `/admin/members` nav row.
- `drizzle/meta/_journal.json` — updated entry idx + tag for the renamed migration.
- `package.json` + `package-lock.json` — three new deps.

**Off-limits files touched:** zero.

## Share-with-a-brother test

Mental walkthrough — a man lands on `/join` from a friend's text:
- Reads "There is a chair. Sit in it." in brass-on-bone Fraunces.
- Fills name + email in 5 seconds.
- Picks "Join a group" (default), opens the group picker, sees real city names.
- Chooses to skip phone (or adds it; SMS opt-in disclosure renders inline so he sees what he's agreeing to).
- Hits "There is a chair" submit button.
- Form swaps to the covenant card preview: his first name in 230px brass type on iron, "Pay careful attention to yourselves and to all the flock", Acts 20:28 attribution.
- Two buttons: "Save image" (downloads PNG) and "Text a brother" (opens iMessage with prefilled body).
- He hits "Text a brother", picks a name from his contacts, hits send.
- His brother gets an iMessage that opens to the same covenant card the man just saw — the verse plate, brass-on-iron, in the iMessage preview thumbnail.

This is the share moment the brief test was written for.

---

**AWAITING APPROVAL — reply `PROCEED` to begin Phase E (Hardening + A2P 10DLC + Launch).**

Phase E will:
1. Twilio install + Messaging Service config + A2P 10DLC Charity registration kickoff (`docs/A2P_10DLC_CHECKLIST.md` from CANONICAL_PLAN).
2. Wire `lib/sms/index.ts` to Twilio. STOP/HELP/YES inbound + delivery-status webhooks. Quiet hours.
3. Audit log surface at `/admin/audit/page.tsx`.
4. `scripts/seed-admin.ts` + `scripts/seed-demo-content.mjs` (5 GA groups, 6 resources, 4 events, 3 letters).
5. `ADMIN_GUIDE.md` at repo root.
6. Lighthouse + axe-core pass on `/`, `/groups`, `/letter`, `/resources`, `/admin/dashboard`. Targets: Perf 95, A11y 98.
7. Sentry + production env-var verification.
8. Pre-launch share test on five pages with three real brothers; ship `tasks/SHARE_TEST_NOTES.md`.

Optional Phase E.5 (Site Builder finish): the deferred D.9–D.11 work — `<BlockRenderer />`, `<BlockEditor />`, `/`, `/about`, `/what-to-expect` migration. Recommend treating it as its own phase rather than bolted onto launch hardening.

Or reply with redlines on Phase D before we move on.
