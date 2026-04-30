# Phase A Audit — 2026-04-30

Read-only inventory of `red11scout/sheepdogsociety` (`main` @ `82fa363`) measured against the new brief at `~/Downloads/Sheepdog Society — Claude Code Build Prompt.md`. No code changed. Supersedes `tasks/PHASE_0_AUDIT.md` (2026-04-29) where they disagree.

## 1. Brief acknowledgement

The brief locks the stack to what is shipped (Next.js 16, Auth.js v5 Credentials, Drizzle/Neon, Tiptap v3, Mapbox, Resend, Vercel Blob, `claude-sonnet-4-5`) and treats this repo as a finished frame. Hard off-limits: `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/app/api/auth/**`, `next.config.ts`, `vercel.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, all `.env*`, and existing exports in `src/db/schema.ts`. New tables go in additive files (`src/db/schema-members.ts`). No new npm deps without justification in `tasks/lessons.md`. Model stays pinned. Editor extends, never replaces.

Banned voice (verbatim from `src/lib/ai/system-prompt.ts`): *delve, leverage, navigate, robust, tapestry, journey (n.), rise, reclaim, fight back, real men, alpha, based, toxic masculinity*. Banned clichés: *walk with God, do life together, in today's fast-paced world, level up, unpack, the journey of faith*. No em-dashes when commas work. No Bible verse generation — always `{{VERSE: ref}}` placeholders.

## 2. Stack reality (from `package.json`)

Next.js `16.1.6`, React `19.2.3`, TS strict, Tailwind `^4`, shadcn `^3.8.4`, Radix `^1.4.3`, Lucide `^0.564.0`, Auth.js `^5.0.0-beta.31` + Drizzle adapter, `drizzle-orm@^0.45.1` + `postgres@^3.4.8`, `@ai-sdk/anthropic@^3.0.44` + `ai@^6.0.86`, Tiptap `^3.19.0` (StarterKit, Underline, Link, Image, Placeholder, pm), Mapbox `^3.20.0`, `@vercel/blob@^2.3.3`, Resend `^6.12.2`, `next-auth@^5.0.0-beta.31`, `next-themes@^0.4.6`, `bcryptjs@^3.0.3`, `zod@^4.3.6`. Legacy still installed: `@clerk/nextjs@^6.37.4`, `@supabase/ssr@^0.8.0`, `@supabase/supabase-js@^2.95.3`, `svix@^1.85.0`. **Not installed: Twilio, `@vercel/og` (will need to add for the covenant card under Phase D), Turnstile.**

## 3. Public route inventory (`src/app/(public)/`)

Actual directories on disk (16 routes + `layout.tsx` + `page.tsx`):

`/`, `/about`, `/acts-20-28`, `/contact`, `/daily-scripture`, `/encouragements`, `/faq`, `/get-started`, `/giving`, `/how-we-gather`, `/locations`, `/locations/[id]`, `/locations/request`, `/partnerships`, `/resources`, `/scripture-reader`, `/stories`.

**Missing public routes that the brief treats as load-bearing:**

| Brief calls for | Status |
| :-- | :-- |
| `/groups`, `/groups/[slug]`, `/groups/start` | **Missing.** Live only under `(app)/groups/[groupId]/group-detail.tsx` behind auth. The brief calls Groups "the conversion engine." Today there is no public conversion surface; `/locations` is the closest analog. |
| `/letter`, `/letter/[slug]`, `/letter/archive` | **Missing.** `/admin/letters` exists for editing, but no public reader. The brief promises "elegant typography and per-issue OG images." |
| `/events`, `/events/[slug]` | **Missing as public.** Admin CRUD at `/admin/events`. Member-area list at `(app)/events/events-list.tsx`. |
| `/devotionals`, `/devotionals/[slug]` | **Missing as public.** Admin CRUD at `/admin/devotionals`. Member-area list at `(app)/devotionals/page.tsx`. |
| `/blog` | **Missing as public.** Admin CRUD at `/admin/blog`. |
| `/subscribe`, `/merch`, `/statement-of-faith` | **Missing.** `next.config.ts` middleware whitelists them but no page exists. |
| `/join` | **Missing.** Phase D adds. |
| `/sms-terms`, `/privacy` | **Missing.** Brief requires both for the SMS opt-in consent line. |

**Implication:** the brief's "Preserve the existing public route map. Do not reorder or remove pages without approval" is still safe to obey, **but** Phases B/C will not deliver the conversion engine, the Letter share moments, or the home-page CTAs the brief expects unless we treat the missing-public routes as additions that need approval before Phase B begins. **This is the single biggest open question — see §10.**

## 4. Admin route inventory (`src/app/(app)/admin/`)

19 routes, all gated server-side: `attendance`, `blog`, `contacts`, `dashboard`, `devotionals`, `encouragements`, `events`, `groups`, `letters` (`/`, `/new`, `/[id]`), `location-requests`, `locations`, `newsletter`, `prayer`, `reading-plans`, `resources`, `scripture`, `testimonies`, `users`. Sign-in at `/admin/sign-in`.

**Missing per brief:** `/admin/members` (read-only list of member signup rows; brief: "member records live in their own list under 'Members'"), `/admin/settings` (brief calls for editing the brand-voice helper from there). Coachmark system + persistent `?` side-sheet are also unbuilt; `src/components/admin/HintTooltip.tsx` exists but only as a single-element tooltip, not a touring system.

**Already shipped that the brief assumes:** `AdminShell.tsx`, `AdminSidebar.tsx`, `AdminTopbar.tsx`, `CommandPalette.tsx`, `AIAssistant.tsx`, `EmptyState.tsx`, `letter-editor.tsx` (Tiptap with autosave + `letter_versions`).

## 5. AI surface (`src/app/api/ai/`)

Six routes, all server-only, all model-pinned: `blog-draft`, `devotional`, `draft`, `improve`, `reading-plan`, `scripture-of-day`. **Missing per brief:** `/api/ai/image` (gpt-image-1 cover generator — Phase C). The brief's three BubbleMenu actions (`Tighten`, `Sharpen verbs`, `Match brand voice`) can be served by the existing `/api/ai/improve` endpoint with a discriminated `mode` param — confirm before assuming it. `src/lib/ai/system-prompt.ts` exports `SYSTEM_PROMPT` only; no `withBrandVoice(prompt)` helper yet — Phase C must add that without breaking the existing export.

## 6. Schema relevance map (`src/db/schema.ts`, 38 tables)

**Stays + load-bearing:** `users`, `accounts`, `sessions`, `verificationTokens`, `groups`, `groupMembers`, `groupLeaders`, `groupInquiries`, `locations`, `locationRequests`, `locationInterests`, `newsletterSubscribers`, `contactSubmissions`, `letters`, `letterVersions`, `aiGenerations`, `auditLog`, `events`, `eventRsvps`, `devotionals`, `scriptureOfDay`, `blogPosts`, `resources`, `testimonies`, `attendanceRecords`.

**Decommission later (member community area, out of scope here):** `channels`, `channelMembers`, `messages`, `reactions`, `prayerRequests`, `prayerRequestPrayers`, `accountabilityPairs`, `accountabilityCheckins`, `notes`, `bibleBookmarks`, `bibleHighlights`, `readingProgress`.

**Member signup gap.** No table covers the brief's full `MemberSignup` payload. Closest existing options:

| Brief field | Closest current home | Gap |
| :-- | :-- | :-- |
| name, email, phone, intent, prefs | none consolidated | needs `members` table |
| join intent + groupId | `locationInterests` (location-only), `groupInquiries` (groupId, but no prefs) | partial |
| start intent + city | `locationRequests` (city/state, no prefs, no intent enum) | partial |
| newsletter opt-in | `newsletterSubscribers` (email + active flag, no `wants_events`/`wants_sms`/`phone`) | partial |
| `member_notification_prefs` row per member | none | new table |

The brief is explicit: write to a new `members` table in `src/db/schema-members.ts` and a paired `member_notification_prefs`. The prior audit hedged toward "additive columns on existing tables" but the brief overrides that. **This audit recommends the brief's path** because three existing tables would otherwise need new columns plus a join-key per intent, and the brief specifies a single email-keyed upsert.

## 7. Brand-token drift (HIGH-IMPORTANCE FINDING)

`src/app/globals.css` carries the wrong palette versus the brief. The shipped tokens come from a "logo-sourced cobalt + saturated gold + ivory" set; the brief specifies "Pasture & Iron." Side-by-side:

| Token | Brief (light) | Brief (dark) | Currently in `globals.css` |
| :-- | :-- | :-- | :-- |
| `--bone` | `#F2EBDD` | — | light: `#F4F0E6`, dark unset (theme-aware) |
| `--iron` | `#0E1624` | `#0E1624` | light: `#0B1426`, dark: `#0B1426` |
| `--navy` | `#1A2438` | `#0B111C` | `#1E3A8A` (royal blue) |
| `--brass` | `#C8932A` | `#D9A53A` | `#D4A02A` (single value) |
| `--olive` | `#5A6B3E` | `#7A8C56` | `#5C6646` |
| `--oxblood` | `#7A1E1E` | `#A33333` | `#7C1818` |
| `--stone` | `#8A8275` | `#C7BFAE` | light `#5C503D`, dark `#C7B79A` |
| `--cream` | `#F8F2E2` | `#F8F2E2` | absent |
| extra | — | — | `--color-cobalt: #2563EB`, `--color-gold: #F0B12C` (not in brief) |

Plus a parallel OKLCH palette (slate/blue) is wired through shadcn variables (`--primary: oklch(0.55 0.2 260)`, etc.) so the actual rendered admin chrome is bluer than the brief's brass-on-iron intent. **Phase B must reconcile to the brief's table without breaking shadcn semantic tokens.** Recommend: update the literal `--color-*` values to match the brief, drop `cobalt`/`gold` from the public surface, and reroute shadcn `--primary` to brass.

Fonts in `globals.css` are already correct: `--font-display: var(--font-fraunces)`, `--font-pullquote: var(--font-cormorant)`, `--font-sans: var(--font-inter)`, `--font-scripture: var(--font-merriweather)`, **and** `--font-mark: var(--font-jetbrains-mono)` is already wired (overrides the prior audit's "needs approval" note).

## 8. Lucide footprint

46 files import `lucide-react` (re-grep with `grep -rn "from 'lucide-react'\|from \"lucide-react\"" src -l`). Of those, customer-facing surfaces are the ~17 public-page files plus `components/public/*`, `components/layout/{mobile-nav,sidebar}.tsx`, `components/map/{location-card,location-map}.tsx`. Admin chrome can stay on Lucide per brief ("Lucide may remain in admin-only chrome"). Phase B target: replace all public-surface Lucide imports with a single `<Icon />` component. The brief's icon set is described qualitatively ("custom and minimal: stylized sheepdog shield as the primary mark, plus a small set of hand-drawn line icons"); the prior session named a 32-icon list. **Confirm before authoring SVGs.**

## 9. Conflicts between the brief and the shipped repo

1. **Public IA gap.** Brief expects `/groups`, `/letter`, `/events`, `/devotionals`, `/subscribe`, `/blog` as live public surfaces. None exist. Either Phase B is rescoped to *also migrate* `(app)/{groups,events,devotionals,blog}` reads into `(public)/`, or these stay deferred and the brief's "conversion engine" intent goes unmet. **Open question for approval.**
2. **Brand-token drift.** §7 above. Phase B's first move should be the token reconciliation, not iconography.
3. **`members` table vs additive columns.** Brief overrides the 2026-04-29 architecture note's preference for additive columns. Resolved: follow the brief.
4. **No `/admin/settings` exists** but the brief routes brand-voice editing there. Phase C adds a thin settings page.
5. **No `/admin/members` list.** Phase D adds it (the brief says "extend `/admin/contacts` if it serves" — `contacts` today is for `contactSubmissions`, a different shape; recommend a new `/admin/members` page).
6. **Three new dependencies will be needed.** Twilio (Phase D, behind `SMS_ENABLED`), `@vercel/og` (Phase D, covenant card OG render), Cloudflare Turnstile (Phase D, public form spam protection). Each requires a `tasks/lessons.md` justification before install per brief §2.
7. **AI route ambiguity.** Brief names three BubbleMenu actions (`Tighten`, `Sharpen verbs`, `Match brand voice`). Existing `/api/ai/improve` likely covers them via a `mode` discriminator — confirm by reading it before Phase C.
8. **Cron + maxDuration.** Brief is silent on cron changes; existing `/api/cron/{generate-daily,purge,group-followup}` plus per-route `maxDuration: 60` stay untouched.

## 10. Open questions before Phase B begins

1. **IA decision — public Groups + Letter:** do we add `/groups` (+ `/groups/[slug]`, `/groups/start`) and `/letter` (+ `/letter/[slug]`, `/letter/archive`) as additive public routes during Phase B, or defer? Brief implies they exist; reality is they do not. *Recommendation: add them during Phase B, sourcing data from the existing `groups`/`locations` and `letters` tables. Costs ~6 files but delivers the conversion engine the brief promises.*
2. **Token reconciliation strategy:** swap `globals.css` literals to the brief's table and reroute shadcn `--primary` to brass, accepting that admin chrome shifts from blue to brass-on-iron? *Recommendation: yes, with one screenshot pass through admin to catch contrast regressions.*
3. **Icon set scope:** the brief is qualitative; does the 32-icon list from the prior session still stand, or do we trim to a smaller set authored from the sheepdog-shield mark first?
4. **`/api/ai/improve` reuse vs new endpoints** for the BubbleMenu actions in Phase C.
5. **Twilio + Turnstile + `@vercel/og` install approval** before Phase D.

## 11. Phase plan and stop points

The brief mandates four phases with a hard stop after each and a `tasks/lessons.md` entry. Restating with this audit's findings folded in:

**Phase B — Visual Edge.** Reconcile `globals.css` tokens to the brief's Pasture & Iron table; route shadcn `--primary` to brass; restyle existing public pages to mono-small-caps section markers, gold rule, asymmetric editorial spacing, monochrome photo treatment; replace public-surface Lucide imports with one `<Icon />` component over a custom SVG set; ship `/acts-20-28` as a standalone share page (already a route stub); verify `prefers-reduced-motion`. **Conditional on Q1 above:** add `(public)/groups` + `(public)/letter` reads. No IA reorder.

**Phase C — Admin AI Superpowers.** Add `withBrandVoice()` helper in `src/lib/ai/prompts.ts` without breaking `system-prompt.ts`; extend Tiptap BubbleMenu with `Tighten`/`Sharpen verbs`/`Match brand voice` (streaming, accept/reject); ship `src/app/api/ai/image/route.ts` calling `gpt-image-1` for cover generation behind a side-drawer in the existing `letter-editor.tsx`; add coachmark series + persistent `?` side-sheet across `/admin/*`; sharpen the dashboard with KPI strip + AI explainers + Inbox/Up Next/House Keeping panels; add `/admin/settings` for brand-voice prompt editing. Do not touch `letter_versions` autosave.

**Phase D — Member Signup + Shareability.** Author `src/db/schema-members.ts` (`members` + `member_notification_prefs`), generate migration via `drizzle-kit generate`, apply via `scripts/apply-neon-migration.mjs`. Build `/join` + `<MemberSignup />` modal embed on home + group cards. POST handler at `/api/members` with zod, Resend welcome, optional Twilio queued behind `SMS_ENABLED`. Render covenant card via `@vercel/og` at `/api/og/covenant/[id]` (1080×1920). Add `/admin/members` list. Add `/sms-terms` + `/privacy` (or extend an existing privacy page) for the consent line. Honeypot + Turnstile on submit.

After each phase: short summary + `tasks/lessons.md` append, then stop.

## 12. Files to modify / create — Phase B (proposed, awaiting approval)

**Modify (~25):** `src/app/globals.css` (token reconciliation), all 16 `(public)/**/page.tsx` files, `src/components/public/*`, `src/components/layout/{mobile-nav,sidebar}.tsx`, `src/components/map/{location-card,location-map}.tsx`, `src/components/VersePlate.tsx`, `src/app/(public)/acts-20-28/page.tsx`, `src/app/layout.tsx` (font preload check). No `tailwind.config.*` change required (Tailwind v4 reads tokens from `@theme inline`).

**Create (~10 + SVGs):** `src/lib/design/tokens.ts` (typed mirror of CSS tokens), `src/components/icons/Icon.tsx`, `public/icons/*.svg` (count tbd in Q3), optional `src/app/(public)/groups/{page,layout}.tsx` + `[slug]/page.tsx` + `start/page.tsx` and `src/app/(public)/letter/{page,layout}.tsx` + `[slug]/page.tsx` + `archive/page.tsx` if Q1 is approved. `src/app/api/og/verse/route.ts` for the share-card OG render.

**Delete:** none in Phase B.

---

**AWAITING APPROVAL.** Reply with answers to the five questions in §10 (or a single "PROCEED with all recommendations") before Phase B begins. No code will be touched until then.
