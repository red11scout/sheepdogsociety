# SheepDog Society — Lessons Learned

## TypeScript
- When using `useState` with an object that has union type fields (like `status: "active" | "pending" | "inactive"`), explicitly type the state variable. Using `as const` on the initial value narrows the type too much and causes errors when the setter receives a wider type.

## Vercel + Next.js
- Database connections must be lazy-initialized when deploying to Vercel. The DB connection string may not be available at build time. Use a Proxy pattern to defer initialization until first access.
- Supabase Realtime works on Vercel without changes since it connects from the browser directly to Supabase, not through the server.
- `(public)` and `(app)` route groups can coexist — use middleware to protect `(app)` routes while allowing `(public)` routes through.

## Architecture
- Moving the authenticated home page from `/` to `/dashboard` when adding a public landing page avoids route conflicts between route groups.
- Admin pages should always verify the user's role server-side, not just rely on middleware.

## Design
- Per client notes: use "protect" not "defend" in copy. Stay away from military references. Keep it Christ-centered. Simple enough for older men to use. Confidentiality is important.

## Phase A audit — 2026-04-30
- Brand tokens in `src/app/globals.css` had drifted to a logo-sourced cobalt + gold + ivory set; the brief's "Pasture & Iron" table is not what is rendering. Phase B's first move must be the token reconciliation, not iconography. Do not author SVGs against a palette that is about to change.
- Public IA gap: `/groups`, `/letter`, `/events`, `/devotionals`, `/blog`, `/subscribe` are middleware-whitelisted and named in the brief but do not exist under `(public)/`. Surface this as an explicit Phase B approval question before doing visual work; restyling pages that aren't there wastes the phase.
- When a user references "the markdown file" on a project with a locked architecture, read the in-repo `tasks/CLAUDE_PROMPT.md` and `CLAUDE.md` first before acting on any brief that arrives by other paths. The wrong-file path nearly produced a Supabase rewrite that would have repeated the 2026-04-29 burn.

## Phase B.1 — globals.css reconciliation — 2026-04-30
- Iron + bone now constants (`#0E1624`, `#F2EBDD`); navy/brass/olive/oxblood/stone/gold are theme-aware splits per brief #2. Dropped `--color-cobalt` (zero usage). Kept `--color-gold` as the warm-brass hover companion (~8 components depend on `bg-brass hover:bg-gold`). Rerouted shadcn `--primary`/`--ring`/`--bronze`/`--chart-1`/`--sidebar-primary` to brass OKLCH. Verified in light + dark with computed-style introspection: `--color-brass` returns exact `#c8932a` light value.
- All shipped utility classes (`.aurora`, `.spotlight`, `.lift`, `.reveal`, `.section-mark`, `.hairline`, `.display-xl`, `.glass-card`, `.breathe`, `.marquee`, `.dotted-grid`) auto-pick up the new token values via `var(--color-*)` references. No CSS rewrites required for them.

## Phase B.5 — public IA gap — 2026-04-30 — RESOLVED via Path A
- Conflict: `(public)/groups|devotionals|events|blog` collide with `(app)/groups|devotionals|events|blog` (Next.js refuses two route groups at the same URL). Dynamic-segment names also have to match across groups (`[slug]` vs `[groupId]`).
- Path A approved by Drew: moved the four `(app)/` member-area trees to `(app)/_legacy_member_area/` (underscore prefix = non-routable). Files preserved unchanged. Zero cross-tree imports needed updating.
- Lesson for next time: check parallel route group conflicts BEFORE writing new pages under `(public)/`. Run `find src/app -type d -name "[name]"` on every name you intend to create. Catches the conflict in seconds; otherwise you waste a write+rollback cycle.

## Phase B.5 — `next/navigation` redirect for stub routes
- `redirect()` from `next/navigation` is the cleanest pattern for "I want this URL to exist but route to a working surface elsewhere." Used for `/groups → /locations`, `/groups/start → /locations/request`, `/groups/[slug] → /locations/[id]`. Server-side, SEO-safe (returns 308 by default).

## Phase B.6 — Lucide footprint smaller than the audit said
- Audit estimated ~17 public-facing files needed Lucide swap; actually only ONE (`scripture-reader/page.tsx`). The rest had been migrated to `<Icon />` in prior sessions. Audit count was based on a stale grep including admin-only files. Lesson: when an audit reports a count, sample 2-3 files to confirm the count maps to the work actually needed.

## Phase B.7 — Existing pages were already polished
- Audit's "5 visual weaknesses" turned out to be self-resolving once tokens reconciled (B.1). The site shipped good editorial structure (display-xl Fraunces, section-mark mono, hairlines, generous padding) but rendered them through a wrong palette. Fix the palette, the editorial polish appears.

## Phase C — 2026-04-30
- **Cover-image generator was already 90% built.** `ImageField.tsx` had the exact 6 style chips Brief #2 named, brand-safety suffix, 3 aspect ratios, generate + upload paths to existing endpoints. The whole "build the cover-image flow" task collapsed to wiring the existing component into `letter-editor.tsx` and adding `coverImageUrl` to autosave. Lesson: before authoring net-new admin scaffolding, grep for the obvious filename (`*Image*`, `*Cover*`, `*Drawer*`) — prior sessions left this kind of work in the codebase often.
- **`withBrandVoice()` is the right shape.** Wrapping every AI prompt with a closing instruction ("reply with ONLY the requested output — no preamble") + relying on the system prompt for voice rules cleaned up duplicate copies of the no-preamble suffix that had drifted across `improve/route.ts` and elsewhere. Centralizing in `src/lib/ai/prompts.ts` lets one PR change the voice across the whole product.
- **Persistent `?` shortcut + bottom-right anchor beats a coachmark tour.** Coachmark tours are first-login only; new admins forget what they saw. A persistent button + global `?` shortcut means the help is two keystrokes away forever. Ship the durable artifact first, the tour later if at all.

## Phase D — 2026-04-30
- **Migration files numbered manually** (`0001_supabase_cutover.sql`, `0002_*`, `0003_*`) collide with `drizzle-kit generate`'s automatic numbering. drizzle-kit doesn't read the existing files — it bumps from its own `_journal.json`. After generating, manually rename the file AND update `_journal.json` AND rename `meta/<n>_snapshot.json` to match. This will keep happening on every future `drizzle-kit generate` until someone normalizes the legacy files. Lesson worth a future cleanup PR.
- **OG / `next/og` requires `display: flex` on every multi-child div.** Satori (the rendering engine) errors with "Expected `<div>` to have explicit display: flex or display: none if it has more than one child node." `{firstName}.` counts as two children (variable + literal `.`). Either wrap in template literal `{`${firstName}.`}` (single string child) OR add `display: flex` to the container. Also: API route files containing JSX must be `.tsx`, not `.ts` — the parser rejects JSX in `.ts`.
- **TCPA / A2P 10DLC consent must be snapshotted at submit time.** Verbatim copy of the disclosure shown gets written to `member_notification_prefs.sms_consent_text_shown`, alongside IP, UA, and timestamp. If the disclosure copy ever drifts, you can prove what each member saw. The constant `SMS_OPT_IN_DISCLOSURE` is exported from `src/lib/sms/index.ts` so the form and the API route both reference the same string.
- **Honeypot beats Cloudflare Turnstile for ministry-scale forms.** A `position: absolute; left: -9999px` field that bots fill blocks ~99% of automated spam at zero dependency cost. Add Turnstile only if abuse is observed. Important: don't use `display: none` — bots check that and skip the field.
- **Schema re-export pattern works for additive tables.** `export * from "./schema-members"` at the end of `schema.ts` adds new exports without touching existing ones, satisfies the off-limits rule, and `drizzle-kit generate` picks up the new tables via the module graph. Cleaner than glob-configuring `drizzle.config.ts`.

## Phase E — 2026-04-30
- **Twilio SDK is Node-only.** It imports `fs`/`net`/`tls` and explodes when bundled into a browser. The fix is a two-step split: (1) put any client-readable constant (in our case `SMS_OPT_IN_DISCLOSURE`) into its own thin file (`src/lib/sms/disclosure.ts`); (2) add `import "server-only"` to the file that imports `twilio`. The client form imports the disclosure file; everything server-side imports the full module. This pattern applies to any Node-only SDK behind a client boundary (Stripe Node SDK, AWS SDK, etc.).
- **Always grep schema column names before querying them.** Wrote `eq(locations.isActive, true)` against the shipped `locations` table — column is `status` (an enum). The audit named the column abstractly; the build catches mismatches but only at TypeScript-compile time, which means dev server can run a stale `.next` cache and not surface it. Run `npm run build` before declaring a phase done.
- **JSONB column types come back as `unknown`** in Drizzle 0.45 unless you add a `.$type<T>()` annotation. Rendering them in JSX requires `Boolean(value) && (...)` instead of `value && (...)` — TypeScript treats `unknown && ReactNode` as `unknown`, which is not a valid `ReactNode`. Lesson: prefer typed jsonb on every new column (see `pages.blocks` and `member_notification_prefs.tour_progress` for examples).
- **Idempotent seed scripts beat one-shot bootstrap scripts.** Both `seed-admin.mjs` and `seed-demo-content.mjs` upsert by natural key (email, slug, title+date). Running twice is safe; running on staging vs prod is the same script. The "skipping" log lines are useful for verifying nothing accidentally created a dup.

## 2026-07-22 — Legacy sweep + plant approval + subscribed + announcements
- **URL-restricted Mapbox tokens 403 on server-side fetches.** The public token is Referer-gated; browser calls pass, `fetch()` from a route handler sends no Referer and gets `{"message":"Forbidden"}` — so the admin "Find on map" button had been silently broken in prod. Any server-side call with a URL-restricted token must send `Referer: <site origin>`. Symptom to remember: works on the map (client), 403 in the API route with the same token.
- **`vercel env pull` faithfully reproduces broken env.** The historic "local dev 500s" were the Vercel *Development* env's `DATABASE_URL` still holding the retired malformed Supabase string. Prod-vs-dev env drift survives an env cleanup that only checks Production. When prod works and local doesn't, diff `vercel env ls <env>` values before touching code.
- **Approval flows must be idempotent by record, not by status.** Storing `created_group_id` on the request row (checked before creating) is what makes double-approve safe; checking `status === "approved"` is not enough once an admin can re-approve after a decline.
- **Stateless HMAC unsubscribe beats token columns.** `HMAC(memberId, AUTH_SECRET)` needs no migration, no backfill, and covers admin-created members that never got a prefs row; the stored `email_unsubscribe_token` column was written for every /join signup and never consumed by anything.
