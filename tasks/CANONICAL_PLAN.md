# Sheepdog Society — Canonical Build Plan
*Last run. Source of truth. Approved scope only.*

Generated **2026-04-30** by synthesizing four briefs and the in-repo audit. This file supersedes any prior plan in `tasks/`. If a future brief contradicts it, that brief is feedback, not a new plan — push back rather than restart.

---

## 1. Provenance

| Source | Role |
| :-- | :-- |
| `tasks/PHASE_A_AUDIT.md` (2026-04-30) | Ground truth for what is shipped and what is missing. Binding. |
| `~/Downloads/Sheepdog Society — Claude Code Build Prompt.md` (Brief #2) | Hard constraints (auth/schema/config off-limits, additive-only). Binding. |
| `~/Downloads/sheepdog_society_claude_code_redesign_prompt.md` (Brief #3) | Block-based site builder, `/what-to-expect`, status workflows, setup checklist, SMS abstraction, `ADMIN_GUIDE.md`. Selectively folded in. |
| `~/Downloads/compass_artifact_wf-4a6a1146...md` (Brief #4) | Block schema (zod discriminated union), public-payload privacy rule, A2P 10DLC checklist, Definition-of-Done per phase. Selectively folded in. **Stack pivots rejected** (see §3). |
| `CLAUDE.md` + `tasks/lessons.md` + memory entry 2026-04-29 | Architectural context. Binding. |

The Desktop brief (Supabase/parchment) is **discarded**.

## 2. Locked decisions

1. **Stack stays exactly as shipped.** Next.js 16, Auth.js v5 Credentials, Drizzle on Neon, Tiptap v3, Mapbox, Resend, Vercel Blob, Anthropic via Vercel AI SDK pinned to `claude-sonnet-4-5`. No swap to Better Auth, Supabase, Inngest, or Upstash.
2. **`src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/app/api/auth/**`, `next.config.ts`, `vercel.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, all `.env*`, and existing exports in `src/db/schema.ts` are off-limits.** New tables go in additive files (`src/db/schema-members.ts`, `src/db/schema-pages.ts`).
3. **Brand: Pasture & Iron.** Reconcile `src/app/globals.css` literals to the brief #2 hex table (`bone #F2EBDD`, `iron #0E1624`, `navy #1A2438`, `brass #C8932A`, `olive #5A6B3E`, `oxblood #7A1E1E`, `stone #8A8275`, `cream #F8F2E2`). Drop `--color-cobalt`, `--color-gold` from public surface. Reroute shadcn `--primary` to brass. Default theme remains LIGHT public, polished dark mode reachable from header toggle on every device.
4. **Public IA: keep current names.** `/about`, `/letter`, `/events`, `/resources` (not poetic renames). Add the missing public surfaces named in every brief: `/groups`, `/groups/[slug]`, `/groups/start`, `/letter` reader, `/letter/[slug]`, `/letter/archive`, `/events`, `/events/[slug]`, `/devotionals`, `/devotionals/[slug]`, `/what-to-expect`, `/sms-terms`, `/privacy`, `/join`. Sourced from existing tables; no schema changes for the migration itself.
5. **Members live in DB rows, never log in.** New `members` + `member_notification_prefs` tables in `src/db/schema-members.ts` (overrides the 2026-04-29 "additive columns" preference; brief is explicit and the join-key shape demands a centralized table).
6. **Block-based pages on a tight scope.** Apply to `/`, `/about`, `/what-to-expect` first. Eight block types: `hero`, `feature_grid`, `testimonial`, `cta`, `rich_text`, `faq`, `stat_row`, `verse_callout`. zod-discriminated-union, jsonb storage, `dnd-kit` reorder. Other pages stay hardcoded until a real authoring need surfaces.
7. **SMS: provider abstraction in Phase D, install Twilio in Phase E.** `lib/sms/index.ts` exports `sendSms({ to, message, category })`. Phase D returns `{ status: 'not_configured' }`. A2P 10DLC registration kickoff is the first task of Phase E since carrier approval takes ~2 weeks.
8. **Share-with-a-brother test is binding** at the end of every phase. Screenshot the most representative new surface and gut-check it before claiming done.

## 3. Stack pivots rejected (and why)

| Brief #4 proposal | Decision | Reason |
| :-- | :-- | :-- |
| Better Auth v1 (replace Auth.js) | **Reject** | Auth.js v5 Credentials is shipping and working (commit `82fa363`). Memory entry 2026-04-29 was created precisely to stop auth churn. Brief #4's "Auth.js is in security-patch-only mode" claim is unverified and not a launch blocker. |
| Drizzle schema rewrite (`subscribers`, `newsletters`, `pages` etc.) | **Reject** | Brief #2 forbids changes to existing `schema.ts` exports. Shipped schema works. We add tables; we don't rename the world. |
| Inngest for newsletter fan-out | **Reject (defer)** | Resend Broadcasts already implemented. Inngest worth revisiting if subscriber list crosses 5k. Not a launch blocker. |
| Upstash Ratelimit | **Reject (defer)** | Honeypot + Vercel firewall + zod cover the public surface. Add Upstash if abuse appears. |
| Tremor charts | **Reject** | Plain shadcn cards + raw inline SVG sparklines for KPIs. One fewer dep. |
| Motion (replace Framer Motion) | **Reject** | No existing Framer Motion usage to replace. Use CSS + a thin `IntersectionObserver` for reveals. Reduced-motion honored everywhere. |
| Cloudflare Turnstile | **Reject** | Honeypot + email validation + Resend bounce filter cover the spam surface for a ministry-scale form. Revisit if abuse appears. |

## 4. New dependencies (justified)

Per brief #2: every dep needs a one-line `tasks/lessons.md` note. Locked list:

- `@vercel/og` — covenant card OG render at `/api/og/covenant/[id]` (1080×1920). No native Next 16 alternative without bundling chromium.
- `twilio` — SMS send + STOP/HELP webhook handlers in Phase E. Behind `SMS_ENABLED` flag with the abstraction. Adds at Phase E start.
- `@dnd-kit/core` + `@dnd-kit/sortable` — block reorder in the Site Builder (Phase D). Lightest battle-tested option.

That is the entire net-new dep list. No exceptions without `tasks/lessons.md` justification.

## 5. Five-phase plan

Each phase ends with: `tasks/lessons.md` entry + `git status` check + share-with-a-brother test + STOP for approval.

### Phase B — Visual Edge + Public IA Gap Fill
*~25 modified, ~12 created. No package.json change.*

1. Reconcile `src/app/globals.css` token literals to Pasture & Iron table; reroute `--primary` to brass; drop unused cobalt/gold tokens from public surface. One contrast pass through admin chrome to catch regressions.
2. `src/lib/design/tokens.ts` — typed mirror of CSS tokens for component code.
3. Bespoke icon set replacing Lucide on the **17 public-facing files**. Single `src/components/icons/Icon.tsx` over hand-authored SVGs in `public/icons/`. Admin chrome stays on Lucide. Icon set scope: 24 icons (sheepdog-shield mark, watchtower, oak, lamp, fire, scroll, anchor, table, stone, key, shield, compass, plus, check, x, arrow-right, arrow-up-right, chevron-down, search, menu, close, calendar, map-pin, download, mail, phone) — narrower than the prior 32-icon list, expand only on demand.
4. Add missing public routes as RSC reads sourced from existing tables:
   - `(public)/groups/page.tsx` (Mapbox locator, list + map split, filters: day/format/language/tags), `(public)/groups/[slug]/page.tsx` (group detail, **public payload only — no `leaderEmail`, `leaderPhone`, exact address; use Drizzle `select({...})` allow-list, never `.*` then strip**), `(public)/groups/start/page.tsx` (writes to `locationRequests` via existing Server Action).
   - `(public)/letter/page.tsx` (latest issue + archive grid), `(public)/letter/[slug]/page.tsx`, `(public)/letter/archive/page.tsx`.
   - `(public)/events/page.tsx` (list + group filter), `(public)/events/[slug]/page.tsx` (with `.ics` export at `/events/[slug]/calendar.ics`).
   - `(public)/devotionals/page.tsx`, `(public)/devotionals/[slug]/page.tsx` (read-only, hardcoded layout for now — block-based comes Phase D).
   - `(public)/what-to-expect/page.tsx` (hardcoded layout for now; converted to block-based in Phase D).
   - `(public)/sms-terms/page.tsx`, `(public)/privacy/page.tsx` (TCPA-compliant boilerplate; brief #4's verbatim "We do not sell or share mobile opt-in data..." sentence on privacy).
5. Editorial polish across existing public pages: 96–160px section padding, mono small-caps section markers (`§ I · MISSION` style), 1px hairline rules at 8% opacity, asymmetric 30/70 splits where copy carries it. Display sizes via `clamp()` with `-0.02em` tracking on Fraunces.
6. Hero `<VersePlate />` already exists at `src/components/VersePlate.tsx` — verify it ships at `/acts-20-28` and renders cleanly to a 1200×630 OG via `/api/og/verse/route.ts` (also new).
7. Motion: `IntersectionObserver` reveal (one fire, opacity + 8px translate, 320ms), CSS-variable cursor spotlight on dark cards, magnetic CTAs at 4–6px lift only on the brass primary CTA. Wrap all motion in a `useReducedMotion` boundary.
8. Lighthouse pass on `/`, `/groups`, `/letter`, `/resources`. Target Perf 90+, A11y 95+, BP 95+, SEO 95+ on mobile.

**Phase B Definition of Done:** all `(public)/**` routes render in light + dark, no horizontal scroll at 375px, `npm run build` clean, no diff outside the modified-files list, audit log unaffected.

### Phase C — Admin AI Superpowers
*~12 modified, ~8 created.*

1. `src/lib/ai/prompts.ts` exports `BRAND_VOICE` constant + `withBrandVoice(prompt)` that prepends the banned-words list and Hemingway rule. Existing `src/lib/ai/system-prompt.ts` becomes the seed source; do not break its export.
2. Existing `/api/ai/improve` gains a `mode` discriminator (`tighten` | `sharpen` | `match-voice`) so the three BubbleMenu actions ship without three new endpoints.
3. Tiptap BubbleMenu in `src/components/admin/letter-editor.tsx` extended with `Tighten / Sharpen verbs / Match brand voice`. Streaming via Vercel AI SDK; output replaces selection with an inline accept/reject overlay (existing dimmed, new bold, deletions strike). Bind `⌘J` to invoke the last-used action.
4. New `src/app/api/ai/image/route.ts` — `gpt-image-1`, n=4, 2×2 candidate grid in a side-drawer launched from the cover-image slot. Hard suffix on every prompt: *"reverent and dignified, suitable for a Christian audience, no crosses or religious iconography unless explicitly requested, no stereotypical imagery, no text or lettering in image."* Six style chips append fragments. Quality toggle Draft/Final. Selected candidate uploads to Vercel Blob, others discarded. Every generation logs to `aiGenerations`.
5. Dashboard upgrade at `/admin/dashboard`: KPI strip (cities / groups / men / signups this week / last newsletter open rate / pending location requests). Each KPI carries a server-rendered one-sentence AI explainer (small `claude-haiku-4-5` prompt over the recent numbers). Three expandable panels: Inbox, Up Next, House Keeping. Plus a `<SetupChecklist />` component (Add first group / Upload first resource / Publish homepage / Connect newsletter audience / Add contact email / Preview mobile site / Send test newsletter) — auto-dismisses when complete, persists per-admin.
6. Coachmark series + persistent `?` button (bottom-right, opens a side-sheet with searchable MDX docs from `content/admin-help/*.md`). Coachmark first-run only, dismissible, resumable, persisted to a `tour_progress` jsonb column on a thin `admin_prefs` table (additive, in `src/db/schema-members.ts`).
7. New `/admin/settings/page.tsx`: brand-voice prompt editor (Server Action writes to a row in a new `site_settings` table or, for v1, a single `prompts.ts` constant editable via PR — pick the simpler).
8. Admin module hygiene: every list view gets search + filter + sort + CSV export; every destructive action gets type-the-name-to-confirm; every form field gets either a `<HelpHint>` or is self-evident.

**Phase C Definition of Done:** existing letter autosave + `letter_versions` flow unchanged, admin chrome contrast verified, every BubbleMenu action streams, cover image upload round-trips to Blob, `git diff --stat` shows no auth/middleware/schema diffs.

### Phase D — Site Builder + Member Signup + Covenant Share
*~10 modified, ~22 created. Adds `@vercel/og` + `@dnd-kit/core` + `@dnd-kit/sortable`.*

1. `src/db/schema-pages.ts` — `pages` table (`id, slug, title, status, blocks jsonb, seo jsonb, publishedAt, updatedBy, updatedAt`) + version history pattern. Run migration via `scripts/apply-neon-migration.mjs`.
2. `src/lib/blocks.ts` — zod discriminated union: `hero`, `feature_grid`, `testimonial`, `cta`, `rich_text`, `faq`, `stat_row`, `verse_callout`. Validated on save.
3. Public renderer: `src/components/blocks/BlockRenderer.tsx` + one component per block in `src/components/blocks/`.
4. Admin editor: `src/components/admin/BlockEditor.tsx` (vertical stack, drag handles via `dnd-kit`, "+ Add block" Notion-style picker between blocks, per-block form generated from the block's zod schema via `react-hook-form` + `zodResolver`). Rich-text blocks use the existing Tiptap setup.
5. Migrate `/`, `/about`, `/what-to-expect` to block-based. Other public pages stay hardcoded.
6. `src/db/schema-members.ts` — `members` + `member_notification_prefs` + `admin_prefs` (for tour progress).
7. `<MemberSignup />` form at `(public)/join/page.tsx`, also embedded as a modal on group cards and the home final-CTA. Single screen: name, email, phone (optional), intent radio (`Join a group` / `Start a group` / `Just keep me posted`), conditional group picker or city/timeline chips, three notification toggles (`weekly newsletter` / `event reminders` / `text reminders` — last one shown only if phone given). Honeypot + zod validation.
8. `src/app/api/members/route.ts` POST: zod parse → upsert by lowercased email → write notification prefs → fire Resend welcome email (extend `src/emails/`) → fire admin notification email → if SMS opted, queue via `lib/sms.sendSms()` (returns `not_configured` until Phase E).
9. `lib/sms/index.ts` — provider abstraction. Returns typed status. Phase D never throws on missing config.
10. `/api/og/covenant/[id]/route.ts` — `next/og` `ImageResponse` at 1080×1920, member's first name + city + Acts 20:28 + brass-stamped seal. Success page after submit shows the card inline with `Save image` (PNG download) + `Text this to a friend` (`sms:` link with prefilled body) buttons.
11. `/admin/members/page.tsx` — read-only list (TanStack-Table not yet shipped; use existing admin table pattern). Status workflow column (`new / reviewed / contacted / connected / needs-follow-up / not-a-fit / archived`). Inline keyboard actions: `A` approve, `R` reply, `S` snooze, `X` decline.
12. Status column on `groupInquiries` and `locationRequests` for the start-group workflow (`new / contacted / vetting / approved / launched / declined / archived`) — additive column on existing tables (allowed; the brief's "no schema.ts edit" rule is about exports, not column adds via migration).

**Phase D Definition of Done:** anonymous user fills `/join` on a phone in <60s, sees covenant card, can save + text it; admin sees the new row in `/admin/members`; covenant card renders correctly in iMessage previews; site builder lets the admin reorder homepage blocks and publish in <2 minutes from a cold start.

### Phase E — Hardening, A2P 10DLC, Launch
*~6 modified, ~10 created. Adds `twilio`.*

1. Twilio install + Messaging Service config + A2P 10DLC Charity registration kickoff (paste-in checklist at `docs/A2P_10DLC_CHECKLIST.md` from brief #4 §Phase 6). Brand registration $46 + campaign $15 + ~10 business-day approval window — start now, regardless of code progress.
2. Wire `lib/sms/index.ts` to Twilio. Webhooks at `/api/webhooks/twilio/inbound` (STOP/HELP/YES) + `/api/webhooks/twilio/status` (delivery status → `smsMessages` log table, additive). Quiet hours 9am–8pm Mon–Sat / noon–6pm Sun, recipient-local. Double-opt-in flow.
3. Audit log surfaced at `/admin/audit/page.tsx` — read-only, filterable by actor / entity / date / action, expandable JSON diff per row. Wrap every admin Server Action in a thin `withAudit()` helper.
4. `scripts/seed-admin.ts` (one-time setup token + URL) + `scripts/seed-demo-content.mjs` (5 GA groups: Ball Ground / Canton / Woodstock / Cumming / Alpharetta, 6 resources, 4 events, 3 letters, anonymous testimonies). Document both in `README.md` under "Running the admin."
5. `ADMIN_GUIDE.md` at repo root: written in Jeremy's voice, covers login → onboarding → adding a group → uploading a resource → composing a letter → publishing the homepage → managing signups → exporting a CSV. Screenshots from a real run.
6. Lighthouse + axe-core pass on `/`, `/groups`, `/letter`, `/resources`, `/admin/dashboard`. Targets: Perf 95, A11y 98, BP 95, SEO 95+ on mobile. Block launch on any axe violation.
7. Sentry wired with source maps + Auth.js user context (email only, no PII beyond admin id).
8. Pre-launch share-with-a-brother test on five pages (`/`, `/groups`, `/letter`, `/resources`, `/what-to-expect`). Send screenshots to three real brothers. Ship `tasks/SHARE_TEST_NOTES.md` with their unprompted reactions.

**Phase E Definition of Done:** A2P 10DLC submitted (approval pending is acceptable, code path returns `not_configured` gracefully), seed scripts produce a fully-populated dev environment in <60s, `ADMIN_GUIDE.md` walks a non-technical reader from cold to publishing in <30 minutes, Lighthouse + axe targets met, Sentry ingesting prod errors.

## 6. Out of scope (this run)

- Member-area decommission (channels/messages/prayer/accountability/bible-bookmarks/etc. cleanup). Memory note 2026-04-29 calls this a separate phase.
- Auth.js → Better Auth migration. Not happening this year.
- Inngest fan-out, Upstash rate-limit, Tremor charts, Motion swap, Cloudflare Turnstile.
- Roles beyond `super_admin` / `admin`. Brief #3 enumerates Owner/Admin/Editor/Viewer; ship Owner/Admin only with clean extension points.
- Block-based migration of every public page. Start with three (`/`, `/about`, `/what-to-expect`); expand if real authoring need surfaces.
- PWA service worker (defer to v1.1 per brief #4).
- RSS feed at `/letter/feed.xml` (defer; existing `/feed.xml` stays).
- Internal RSVP system for events (use external links until launch demand justifies).

## 7. Definition of Done — applied to every phase

- TypeScript clean (`npm run build` zero errors, no new `any`).
- ESLint clean (`npm run lint` zero warnings).
- Light + dark verified on the most-affected route at 375 / 768 / 1280 px.
- `prefers-reduced-motion: reduce` swaps animations to instant, verified.
- WCAG 2.2 AA contrast on type, controls, focus rings.
- No secret in client bundle (`grep` build output for `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN`, etc.).
- Every admin write writes a row to `auditLog`.
- Every destructive action requires either Undo (soft) or type-the-name (hard).
- `git diff --stat` touches only files in the phase's stated scope. Anything outside reverts immediately.
- One-line `tasks/lessons.md` entry on any correction or surprise.
- **Share-with-a-brother test on the most representative new surface.**

## 8. Vercel deployment hygiene

The repo is already linked to `drew-godwins-projects/sheepdogsociety` (`.vercel/` present). Standard pipeline:

- `git push` to `main` → production deploy.
- Every PR → preview deploy.
- **Do not run `vercel deploy` from CLI.** Brief #2 forbids `vercel.json` edits; `vercel.json` already declares cron + `maxDuration`. Verify env-var presence with `vercel env ls --environment=production` before each phase merge. Pull with `vercel env pull .env.local` if local needs sync.
- New env vars introduced this run (Phase E): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_WEBHOOK_SIGNING_SECRET`, `SMS_ENABLED` (boolean flag). Ship them in `.env.example`.

## 9. The success test

Posted at the bottom of every phase summary, applied honestly: **Would a man text this link to his brother because of how it made him feel?** If no, fix it before claiming done.

---

**AWAITING APPROVAL.** Reply `PROCEED` to begin Phase B (Visual Edge + Public IA Gap Fill). Reply with redlines if any of §2 (locked decisions), §3 (rejections), §4 (deps), or §6 (out of scope) needs adjustment. No code touched until approval.
