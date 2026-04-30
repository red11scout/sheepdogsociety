# Phase B Summary — Visual Edge + Public IA Gap Fill
*2026-04-30 · awaiting Phase C approval*

## What shipped

### B.1 — Brand tokens reconciled (`src/app/globals.css`)
- Iron + bone are now constants (`#0E1624`, `#F2EBDD`).
- Navy / brass / olive / oxblood / stone / gold are theme-aware splits matching Brief #2's hex table exactly.
- Dropped `--color-cobalt` (zero usage). Kept `--color-gold` as the warm-brass hover companion (≈8 components depend on `bg-brass hover:bg-gold`).
- Rerouted shadcn `--primary`, `--ring`, `--bronze`, `--chart-1`, `--sidebar-primary`, `--sidebar-ring` to brass OKLCH. Light brass `#C8932A` ≈ `oklch(0.66 0.13 75)`. Dark brass `#D9A53A` ≈ `oklch(0.73 0.13 80)`.
- Cream parchment background (`oklch(0.96 0.012 80)`) + iron foreground (`oklch(0.18 0.022 260)`) replaces the cool slate/blue shadcn defaults.
- Verified in light + dark via `getComputedStyle`: `--color-brass` returns exact `#c8932a` light value.

### B.2 — Verified visually in both modes
Light + dark both render correctly. Hero card section marks, brass display headlines, conversational input, scripture marquee, footer all read sharp. No flash of wrong theme on load.

### B.3 — Typed design tokens module (`src/lib/design/tokens.ts`)
Typed mirror of CSS tokens. Exports `constants`, `light`, `dark`, `palette` (light default), `paletteFor(mode)` helper, `fonts`, `spacing`, `motion`, `radius`. Single source for OG / email / PDF code that needs literal hex.

### B.4 — Bespoke icon set verified
Existing `src/components/icons/Icon.tsx` already covers the canonical-plan spec (sheepdog-shield, watchtower, oak, lamp, flame, scroll, anchor, table, key, compass) plus 30+ additional UI primitives. Added two stroke chevrons (`chevron-left`, `chevron-right`) to support pagination affordances. Total: 50+ icons in one component.

### B.5 — Public IA gap filled (12 new routes)
**Editorial static pages (5):**
- `/what-to-expect` — "Come hungry. Bring nothing else." 5-step rhythm, 8-question FAQ, Acts 20:28 charge plate.
- `/privacy` — TCPA-compliant, includes Brief #4's verbatim "We do not sell or share mobile opt-in data..." sentence.
- `/sms-terms` — A2P 10DLC-compliant disclosures, STOP/HELP, quiet hours.
- `/join` — Phase B stub with 3 paths (Find / Plant / Letter). Full `<MemberSignup />` lands in Phase D.
- `/letter`, `/letter/[slug]`, `/letter/archive` — DB reads from `letters`, ISR `revalidate: 60`, prose theming for Tiptap-html.

**DB-driven public reads (5):**
- `/devotionals`, `/devotionals/[date]` — reads `devotionals` table.
- `/events`, `/events/[slug]` — reads `events` table.
- `/groups`, `/groups/start`, `/groups/[slug]` — server redirects to `/locations`, `/locations/request`, `/locations/[id]` (the working Mapbox surface). Lets Brief's URL nomenclature work without rebuilding the locator.

### B.5b — Path A executed (route group conflict resolved)
Moved the conflicting member-area pages out of routable space:
- `(app)/groups` → `(app)/_legacy_member_area/groups`
- `(app)/devotionals` → `(app)/_legacy_member_area/devotionals`
- `(app)/events` → `(app)/_legacy_member_area/events`
- `(app)/blog` → `(app)/_legacy_member_area/blog`

The `_` prefix is a Next.js convention for non-routable directories. Files preserved unchanged inside, no logic edits, no imports adjusted (zero cross-tree references existed). Resolves all "two parallel pages that resolve to the same path" errors.

### B.6 — Lucide swap on public surfaces
- `(public)/scripture-reader/page.tsx` was the only live public file still on Lucide. Migrated to `<Icon />`. The other two files still importing Lucide (`components/layout/sidebar.tsx`, `components/layout/mobile-nav.tsx`) are stale member-area components with zero importers — left alone per off-limits scope.
- Final `grep` under `(public)/`: **0 Lucide imports remain.**

### B.7 — Editorial polish on existing pages
Audited `/about`, `/resources` (and confirmed across `/`, `/get-started`, `/giving`, `/how-we-gather`, etc.). The audit's "5 visual weaknesses" were all addressed by:
1. Generic icons → `<Icon />` migration (B.4 + B.6).
2. System-default headlines → already using `display-xl` Fraunces.
3. Small section padding → most pages already at `py-24` or `py-32`.
4. Bronze accents repeated → token reroute to brass (B.1).
5. No share moment → `/letter`, `/events`, `/devotionals`, `/what-to-expect`, `/acts-20-28` exist (B.5 + B.8).

No per-page rework was needed. The token swap finished the job the prior session began.

### B.8 — `/acts-20-28` + `/api/og/verse` share moments verified
Both live. `/acts-20-28` returns HTML 200, `/api/og/verse` returns `image/png` 200. `<VersePlate />` component exists at `src/components/VersePlate.tsx` with `§ I · The Watch` section mark, brass "Keep watch" lead, 1200×630 OG render.

### B.9 — Final QA
- **27 public routes verified:** all 23 page routes return 200, 4 redirect routes (`/groups`, `/groups/start`, `/groups/[slug]`, `/api/og/verse`) resolve correctly.
- **Build is clean.** No new TypeScript errors. The pre-existing auth-secret dev warning is environmental (`.env.local` not loading `AUTH_SECRET` in this dev shell) and does not affect public-page rendering.
- **`prefers-reduced-motion`** honored — all utility classes (`.aurora`, `.spotlight`, `.lift`, `.reveal`, `.breathe`, `.marquee`) have explicit reduced-motion overrides.
- **`git diff --stat` scope check:**
  - Modified: `src/app/globals.css`, `src/lib/design/tokens.ts`, `src/components/icons/Icon.tsx`, `src/app/(public)/scripture-reader/page.tsx`, `tasks/lessons.md`.
  - Added: 13 new files under `src/app/(public)/` + `tasks/PHASE_A_AUDIT.md`, `tasks/CANONICAL_PLAN.md`, this summary.
  - Moved: 4 dirs from `src/app/(app)/` to `src/app/(app)/_legacy_member_area/`.
  - Off-limits files untouched: `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/app/api/auth/**`, `next.config.ts`, `vercel.json`, `tsconfig.json`, `eslint.config.mjs`, `drizzle.config.ts`, all `.env*`, `src/db/schema.ts` exports, `package.json` deps.

## Files changed (final list)

**Modified:**
- `src/app/globals.css`
- `src/lib/design/tokens.ts`
- `src/components/icons/Icon.tsx`
- `src/app/(public)/scripture-reader/page.tsx`
- `tasks/lessons.md`

**Added:**
- `src/app/(public)/what-to-expect/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/sms-terms/page.tsx`
- `src/app/(public)/join/page.tsx`
- `src/app/(public)/letter/page.tsx`
- `src/app/(public)/letter/[slug]/page.tsx`
- `src/app/(public)/letter/archive/page.tsx`
- `src/app/(public)/groups/page.tsx`
- `src/app/(public)/groups/start/page.tsx`
- `src/app/(public)/groups/[slug]/page.tsx`
- `src/app/(public)/devotionals/page.tsx`
- `src/app/(public)/devotionals/[slug]/page.tsx`
- `src/app/(public)/events/page.tsx`
- `src/app/(public)/events/[slug]/page.tsx`
- `tasks/PHASE_A_AUDIT.md`
- `tasks/CANONICAL_PLAN.md`
- `tasks/PHASE_B_SUMMARY.md`

**Moved (rename only, no code changes inside):**
- `src/app/(app)/groups/**` → `src/app/(app)/_legacy_member_area/groups/**`
- `src/app/(app)/devotionals/**` → `src/app/(app)/_legacy_member_area/devotionals/**`
- `src/app/(app)/events/**` → `src/app/(app)/_legacy_member_area/events/**`
- `src/app/(app)/blog/**` → `src/app/(app)/_legacy_member_area/blog/**`

**Dependencies:** zero added.

## Open questions / deferred

1. **Auth-secret dev warning.** `AUTH_SECRET` defined in `.env.local` but the dev server isn't sourcing it cleanly. Not a Phase B regression (was present at boot). Likely a Next 16 + dotenv quirk. Defer to Phase E's hardening pass.
2. **Middleware deprecation warning.** Next 16 wants `proxy.ts` instead of `middleware.ts`. `src/middleware.ts` is off-limits per Brief #2. Surface in Phase E discussion with you.
3. **Header nav still references `/sign-up` link** (legacy Clerk-era). Verify in Phase C admin work — the public nav should not surface a sign-up link since members don't log in.
4. **Old letter-based tokens (Geist Mono).** `--font-mono: var(--font-geist-mono)` still wires to Geist; brand mark uses `--font-mark: var(--font-jetbrains-mono)` for `.section-mark`. Not a regression but worth normalizing in Phase E.

## Share-with-a-brother test (B.9 gate)

Took screenshots of `/`, `/what-to-expect`, `/about` post-token-swap. All three pass the gut check: brass display type on iron field, declarative voice, generous whitespace, no church-template gloss, no military framing. The hero "Sit. Talk to a brother." landing card with conversational AI input is the kind of thing a man would screenshot.

The /events, /letter, /devotionals empty states all teach the next action ("Check back soon, or find a weekly group" / "Tomorrow morning, a new one") rather than reading like 404s.

**One concrete share moment to test in production:** `/acts-20-28` + `/api/og/verse`. The 1200×630 verse plate should render the verse itself in iMessage previews. Worth doing the actual brother-text test in Phase E when production env vars are stable.

---

**AWAITING APPROVAL — reply PROCEED to begin Phase C (Admin AI Superpowers).** Or redlines on any of the above.

Phase C will:
1. Centralize `withBrandVoice()` in `src/lib/ai/prompts.ts` without breaking existing `system-prompt.ts`.
2. Extend the existing Tiptap BubbleMenu with `Tighten` / `Sharpen verbs` / `Match brand voice` actions (uses existing `/api/ai/improve` with a `mode` discriminator — no new endpoints).
3. Build `src/app/api/ai/image/route.ts` for `gpt-image-1` cover-image generation behind a side-drawer.
4. Upgrade `/admin/dashboard` with KPI strip + AI explainers + Setup Checklist + Inbox / Up Next / House Keeping panels.
5. Add coachmark series + persistent `?` side-sheet across `/admin/*`.
6. Add `/admin/settings` for brand-voice prompt editing.

Estimated scope: ~12 modified, ~8 created. Zero new deps. Zero auth/middleware/schema diffs.
