## How to run this

1. Open Claude Code in `/Users/drewgodwin/sheepdogsociety` (the live `main` branch, currently at `2fd2d48 revert(public)...`).
2. Enter plan mode with `/plan`.
3. Paste everything inside the fenced block below.
4. Wait for Phase 0 output. Read it. Then type **PROCEED** to advance, one phase at a time.

There are four phases. Each has a hard stop. Do not skip a stop.

---

```
<role>
You are a senior Next.js engineer doing a SURGICAL enhancement to a
production site that has already been built once, broken once by a
previous AI session, and reverted. You are not redesigning. You are not
rebuilding auth. You are not migrating schemas. You are sharpening what
exists and adding ONE genuinely new feature (member signup). Avoid
over-engineering. Only make changes that are directly requested or
clearly necessary. When in doubt, STOP and ask.
</role>

<context>
Repo: /Users/drewgodwin/sheepdogsociety on branch main, commit 2fd2d48.
Live: https://www.acts2028sheepdogsociety.com (Vercel project
drew-godwins-projects/sheepdogsociety). The project's own CLAUDE.md is
the source of truth for stack, routes, env, brand voice — read it
first, completely, before you do anything else.

Stack reality (verify against package.json, do not assume):
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4
- shadcn/ui + Radix + Lucide icons (65 imports — these are the "basic
  icons" that need to go)
- Auth.js v5 Credentials (email + password) — already in place per
  commit 6832583. DO NOT TOUCH.
- Drizzle ORM, 38 tables in src/db/schema.ts including users, groups,
  locations, locationInterests, locationRequests, events, devotionals,
  resources, blogPosts, attendanceRecords, testimonies, channels,
  messages, prayerRequests, accountabilityPairs, readingPlans, etc.
  Database is Neon (NEON_DATABASE_URL). Supabase remains for the
  Realtime chat broker only — do not remove.
- Tiptap v3 admin editor with autosave + letter_versions — already
  shipping per commit 95a0f72. DO NOT REBUILD IT.
- AI routes already exist: /api/ai/draft, /api/ai/improve,
  /api/ai/blog-draft, /api/ai/devotional, /api/ai/scripture-of-day,
  /api/ai/reading-plan. Model pinned to claude-sonnet-4-5 via the
  Vercel AI SDK + @ai-sdk/anthropic. NEVER LangChain.
- Resend for transactional + Broadcasts (newsletter), Mapbox for
  groups map, Vercel Blob for storage, OpenAI key wired for
  gpt-image-1 image generation.
- Brand: "Pasture & Iron" palette (bone, iron, navy, brass, olive,
  oxblood, stone) + Fraunces (display) + Cormorant Garamond
  (scripture) + Inter (UI/body) + Merriweather (legacy scripture
  class). Default theme LIGHT for public pages.
- Brand voice (Jeremy): pastoral, warm, direct, masculine without
  macho, short Anglo-Saxon sentences, imperative + invitation. Banned
  words live in src/lib/ai/system-prompt.ts. NEVER em-dashes when
  commas work. NEVER political framing.

What went wrong last session (do not repeat):
1. Rewrote auth that already worked.
2. Added notification systems and analytics nobody asked for.
3. Re-skinned the public site into something worse — reverted in
   commit 2fd2d48.
4. Built a parallel admin shell on top of the existing one.
5. Modified existing schemas instead of adding new tables.

The founder's direction, verbatim: "bold and sleek... we are in the
last chapter right now. bring tech elegance meets spiritual
brotherhood; with an elegant minimalist tone punctuated with flare
that keeps users engaged and wanting to share their experience." The
test for success is shareability — would one man text this site to
another man because of the impression it made on him.
</context>

<objective>
Four phases, each with a hard stop:
0. AUDIT (read-only) — prove you understand the current state.
1. VISUAL EDGE — bold custom icon set + typographic and spatial polish
   on existing public pages. NO IA changes, NO new palette.
2. ADMIN AI SUPERPOWERS — sharpen the existing Tiptap admin with
   streaming BubbleMenu actions, gpt-image-1 cover generation, and a
   centralized brand-voice prompt module. Do not rebuild the editor.
3. MEMBER SIGNUP — the only genuinely new feature: one public form
   capturing name, email, optional phone, notification preferences,
   join-or-start intent. Plus a server-rendered "covenant card" the
   member can save and text to a friend.
</objective>

<non_objectives>
We are NOT doing any of the following. If you believe one is needed,
STOP and ask.
- Rebuilding authentication, sessions, or middleware. They work.
- Replacing or migrating any of the 38 existing Drizzle tables. New
  tables are additive only and require approval before creation.
- Removing Supabase. The Realtime chat broker still uses it.
- Removing Clerk packages. They are scheduled for cutover removal in
  a separate Phase G — out of scope here.
- Switching the model away from claude-sonnet-4-5.
- Notification infra, transactional-email rebuilds, analytics, A/B
  tooling, feature flags, observability, CI changes.
- Tests, test runners, or CI config unless explicitly requested.
- Refactors of working code. If it works, it stays.
- Changing public-page information architecture, removing routes, or
  reordering homepage sections.
- New top-level directories outside the allow-list below.
- New npm dependencies without explicit approval.
</non_objectives>

<forbidden>
1. Do NOT modify package.json dependencies without approval.
2. Do NOT touch src/auth.ts, src/auth.config.ts, src/middleware.ts, or
   any code under src/app/api/auth/**.
3. Do NOT modify src/db/schema.ts existing exports. New tables go in a
   new file (e.g. src/db/schema-members.ts) and require approval before
   the Drizzle migration is generated.
4. Do NOT touch next.config.ts, vercel.json, tsconfig.json,
   eslint.config.mjs, drizzle.config.ts, or any .env file.
5. Do NOT delete or rename files without approval.
6. Do NOT change the response shape of any existing API route.
7. Do NOT add base classes, factories, providers, DI containers, or
   "future-proofing" abstractions. Inline beats abstract.
8. Do NOT create files that duplicate existing functionality. If a
   file solves the problem at 80%, extend it.
9. Do NOT fix unrelated bugs you notice. Note them in the phase
   summary as "deferred."
10. Do NOT proceed past a phase boundary without the user typing
    PROCEED. Zero exceptions.
11. Do NOT use em-dashes in user-facing copy. Jeremy's voice rule.
12. Do NOT generate Bible verse text. Use {{VERSE: ref}} placeholders.
</forbidden>

<files_in_scope>
- src/app/(public)/** — visual polish only
- src/components/** — visual + new icon component + signup form
- src/components/icons/** — NEW custom icon set
- public/icons/** — NEW custom SVGs
- src/lib/ai/** — extend prompt scaffolding (do not break system-prompt.ts)
- src/lib/design/** — NEW, design tokens module (Phase 1)
- src/app/api/ai/image/** — NEW, gpt-image-1 endpoint (Phase 2)
- src/app/api/members/** — NEW, signup endpoint (Phase 3)
- src/app/api/og/** — NEW, covenant share card OG route (Phase 3)
- src/db/schema-members.ts — NEW additive schema, with approval
- src/app/(public)/subscribe/** — replace/upgrade existing subscribe
  page with the new <JoinForm /> per Phase 3
- src/components/admin/editor/** — extend Tiptap menu, do not replace
- tailwind.config.* and globals.css — token additions only, no
  removal of existing tokens
</files_in_scope>

<files_off_limits>
- src/auth.ts, src/auth.config.ts, src/middleware.ts
- src/app/api/auth/**
- src/db/schema.ts (additive new files only — never edit this one)
- next.config.ts, vercel.json, tsconfig.json, .env*, .github/**
- Any file you have not explicitly listed in your phase plan.
</files_off_limits>

<constraints>
Behavior contract: every existing route must render the same data, in
the same order, with the same network calls, before and after your
changes — until Phase 3 ships the signup form. Until then the only
permitted diff is visual: typography, spacing, color tokens
(extending, not replacing), iconography, copy polish, micro-motion.

Prefer extending existing components and utilities over creating new
ones. Read similar parts of the codebase before adding anything new
so the result fits the established pattern.

After each phase run `git status` and `git diff --stat`. If files
outside <files_in_scope> appear, you have violated scope — revert
those files immediately and report.
</constraints>

<design_direction>
The palette stays. The brand stays. We are sharpening, not
re-skinning. The "edge" comes from three places:

1. ICONOGRAPHY — replace the 65 Lucide imports with a custom 32-icon
   set authored from scratch. Heavy single-stroke SVG, 2.5px stroke
   on a 24px grid (3px on 32), square caps, miter joins. Reference
   weight: Phosphor "Bold." Do not use Phosphor directly. All icons
   inherit currentColor and ship through one component
   <Icon name="..." /> at src/components/icons/Icon.tsx. Set list:
   crook, sheepdog-rest, sheepdog-watch, watchtower, oak, mountain,
   gate, lamp, fire, scroll, anchor, table, stone, key, shield,
   compass, plus, check, x, arrow-right, arrow-up-right, chevron-down,
   search, menu, close, calendar, map-pin, download, external-link,
   mail, phone, link.
   Plus 6 ceremonial illustrations at 200-400px (use as section
   anchors, NOT inline UI): sheepdog-at-rest (the brand mark),
   watchtower-at-dawn, oak-rooted, lamp-burning, narrow-gate,
   single-mountain. Generate base concepts via gpt-image-1 with the
   prompt fragment "black ink wood engraving, fine cross-hatching,
   classical biblical illustration, high contrast, no text, no color"
   then trace to clean SVG. Save under public/icons/ceremonial/.

2. TYPOGRAPHY — Fraunces is already loaded; lean into it. Allow
   display sizes up to 144px with tracking -0.03em on landing
   sections. Cormorant Garamond for scripture pull-quotes. Inter
   for UI. JetBrains Mono is NOT yet in the project — propose
   adding it via next/font/google for small-caps section labels
   ("§ I — THE WATCH") and citation marks ("ACTS 20:28"). Get
   approval before adding.

3. MOTION — honor prefers-reduced-motion always. Add (sparingly):
   cursor-tracked spotlight on dark cards via CSS variables (no React
   state); scripture scroll-reveal via IntersectionObserver, word-by-
   word fade with 80ms stagger, citation last; magnetic CTA hover at
   4-6px lift, 200ms expo-out, no scale, no bounce. Animate transform
   and opacity only. Performance budget: LCP < 2.0s, CLS < 0.05.

Spatial: section vertical padding 96-160px on landing, never less.
Sharp corners, border-radius 0-4px max. Hairline dividers 1px at 8%
opacity with a small-caps mono label above. Asymmetric 30/70 or 40/60
splits over centered columns where it suits.

Three "screenshot moments" — deliberate, named, shareable:
1. The Acts 20:28 verse plate (homepage hero AND a standalone
   /acts-20-28 share page). Black or ink-bone field, Fraunces 120px,
   the verb in brass, citation in mono small-caps, hairline rule
   above, exact 1200x630 ratio so iMessage previews render the verse
   itself as the share card.
2. The Groups map (/groups). Dark Mapbox style with brass pins. Each
   pin reads "{N} men · {meeting day} · {time}" pulled from real
   groups/locations rows. Specificity is the share trigger.
3. The Watch covenant card (issued after a member signs up — Phase 3).
   Server-rendered OG image at 1080x1920 vertical, with the member's
   first name + city, Acts 20:28, and a brass-stamped seal mark.
</design_direction>

<phase n="0" name="Read-only audit">
Goal: prove you understand the current state before you change a byte.
Allowed tools: Read, Glob, Grep, LS, Bash (read-only: ls, cat, git
status, git log, git ls-files, npm ls --depth=0).
Forbidden this phase: Write, Edit, MultiEdit, npm install, drizzle-kit,
dev server, vercel CLI.

Do exactly this:
1. Read the project's CLAUDE.md cover to cover. Quote the brand-voice
   rules verbatim in your report. Quote the "NEVER" list verbatim.
2. Read package.json. List every dep relevant to scope (UI, AI, auth,
   db, email, blob, maps, editor, fonts).
3. Walk src/app/(public) and list each route, its top-level sections
   in render order, headings (verbatim), CTAs, forms, and which icons
   it imports from lucide-react.
4. Walk src/app/(app)/admin and list each admin route, what it edits,
   and which AI route(s) it calls.
5. Read src/db/schema.ts and produce a one-line-per-table inventory
   with the columns that matter for member signup, groups, locations,
   and notification preferences. Confirm whether locationInterests
   already covers what we need or whether a new members table is
   warranted.
6. List every existing /api/ai/** route with its method, model, and
   purpose. Same for /api/admin/** and /api/public/**.
7. Read src/lib/ai/system-prompt.ts. Extract the banned-word list.
8. List the top 5 visual weaknesses you see vs. the
   <design_direction> above — be specific, cite files.
9. Confirm the existing icon source. Run
   `grep -rn "from 'lucide-react'" src` and produce a count and a
   per-route breakdown.

Deliverable: a single markdown report titled "PHASE 0 AUDIT" with the
sections above, plus the EXACT proposed file lists for Phase 1:
- Files to MODIFY (cap: 30)
- Files to CREATE (cap: 50, mostly icon SVGs + tokens module)

End with the literal line:
"AWAITING APPROVAL — reply PROCEED to begin Phase 1."

STOP. Do not call Edit, Write, or MultiEdit until I reply PROCEED.
</phase>

<phase n="1" name="Visual edge">
Goal: bold custom icons + typographic + spatial polish on existing
public pages, no IA changes.

Do exactly this:
1. Create src/lib/design/tokens.ts exporting the existing Pasture &
   Iron palette from globals.css/Tailwind config in a typed object —
   do not invent new colors. Add motion + spacing scales. Wire any
   missing utilities into tailwind.config.*.
2. Author the 32 custom SVGs in public/icons/ and the 6 ceremonial
   illustrations in public/icons/ceremonial/. Build
   src/components/icons/Icon.tsx with `<Icon name="..." size={24}
   className="..." />`. Replace EVERY lucide-react import on public
   pages with <Icon />. Admin pages may stay on Lucide for this
   phase (a separate sweep can come later).
3. Build src/components/VersePlate.tsx — the Acts 20:28 hero plate.
   Use it on the homepage hero and ship a new /acts-20-28 share page
   that renders only the plate plus a single share button. Verify the
   1200x630 OG render renders the verse itself.
4. Restyle the public homepage section by section, preserving section
   order and content. Apply 96-160px section padding, asymmetric
   grids where appropriate, hairline dividers with mono small-caps
   labels, monochrome photo treatment via CSS filter.
5. Restyle About, Groups, Resources, Letter, Devotionals, Events,
   Subscribe, FAQ, Get Started, Contact, How We Gather, Statement of
   Faith. Same content, sharper typography, spacing, iconography.
6. Implement: cursor spotlight on dark cards, scripture scroll-reveal,
   magnetic CTAs. Honor prefers-reduced-motion.
7. Verify Core Web Vitals locally (`npm run build` + Lighthouse if
   trivial). LCP < 2.0s, CLS < 0.05. Report numbers.

Acceptance: `git diff --stat` touches only files in <files_in_scope>.
No package.json change unless approval was granted (e.g. JetBrains
Mono via next/font/google). Public site renders the same routes with
the same data. Run the shareability test mentally on the verse plate:
would a man screenshot the homepage hero and text it to a friend? If
no, iterate before you stop.

End with: "PHASE 1 COMPLETE. Files changed: [list]. Files added:
[list]. Notes: [any deferred items]. AWAITING APPROVAL — reply
PROCEED to begin Phase 2."

STOP.
</phase>

<phase n="2" name="Admin AI superpowers">
Goal: sharpen the EXISTING Tiptap admin editor with better streaming
selection actions, image generation, and a centralized voice module.
Do not rebuild the editor. Do not touch auth or middleware.

Do exactly this:
1. Centralize prompt scaffolding in src/lib/ai/prompts.ts. Export a
   BRAND_VOICE constant pulled from src/lib/ai/system-prompt.ts and
   the project's CLAUDE.md "Brand Voice (Jeremy)" section verbatim.
   Make it editable from /admin/settings (server action) without
   leaving the page. Existing /api/ai/* routes should import from
   this module. No prompt strings hardcoded in routes after this.
2. Extend the Tiptap BubbleMenu in src/components/admin/editor/** with
   these EIGHT selection-or-document actions (button labels verbatim):
   1. ✨ Draft from outline (whole doc, claude-sonnet-4-5)
   2. 🔁 Rewrite tone… (selection, submenu: Pastoral / Direct &
      punchy / Conversational / Reverent — claude-sonnet-4-5)
   3. ✂️ Tighten (selection, claude-haiku-4-5)
   4. 📈 Expand this point (selection, claude-sonnet-4-5)
   5. 📖 Add Scripture support (selection, claude-sonnet-4-5 — must
      say "I'm not sure" rather than invent verses; output uses
      {{VERSE: ref}} placeholders, never verse text)
   6. 🪧 Generate headline options (whole doc, claude-haiku-4-5,
      returns 6 options)
   7. 📝 Summarize for newsletter (whole doc, claude-sonnet-4-5,
      60-80 words)
   8. 🛠️ Fix grammar & spelling (selection or doc, claude-haiku-4-5)
   UX: stream tokens visibly via the Vercel AI SDK. Output replaces
   selection with an inline diff overlay (existing dimmed, new bold,
   deletions strike). Bottom bar: [Accept ⏎] [Reject Esc] [Try again
   ⌘R] [Edit prompt]. Bind ⌘J as universal trigger.
3. Build src/app/api/ai/image/route.ts (NEW) for gpt-image-1 cover
   generation. Side-drawer in admin (NOT modal) on the cover-image
   slot. Prompt textarea prefilled by a claude-haiku-4-5 summary of
   the post. Six style preset chips appending fragments to the
   visible prompt: Documentary photo · Cinematic golden hour ·
   Engraving / woodcut · Oil painting · Modern editorial ·
   Topographic / map. Hard suffix on every prompt: "reverent and
   dignified, suitable for a Christian audience, no crosses or
   religious iconography unless explicitly requested, no
   stereotypical imagery, no text or lettering in image." Aspect
   ratio: square 1024 / landscape 1536x1024 / portrait 1024x1536.
   Quality toggle Draft/Final (default Draft). gpt-image-1 with n=4
   to generate 4 candidates as base64. Show in 2x2 grid. Only the
   chosen one uploads to Vercel Blob via @vercel/blob `put`. Server
   Action with `export const maxDuration = 60`. Log every generation
   to ai_generations.
4. Verify the existing /admin/letters/[id] autosave + letter_versions
   flow still works. Do not touch it.

Acceptance: `git diff --stat` shows no changes to auth, middleware,
schema.ts, or non-AI API routes. The admin can: highlight text, hit
⌘J or click a BubbleMenu action, watch tokens stream in, accept or
reject. The admin can: open the cover-image drawer, generate four
candidates, pick one, see it uploaded to Blob and attached to the
post.

End with: "PHASE 2 COMPLETE…" and AWAITING APPROVAL.
STOP.
</phase>

<phase n="3" name="Member signup">
Goal: one form, one share moment, one new additive table. No login.

1. Confirm whether the existing locationInterests table covers the
   intended fields. If not, propose a NEW additive
   src/db/schema-members.ts with this shape and ask for approval
   BEFORE generating the migration:
     members: id (uuid pk), name, email (unique), phone (nullable),
     intent ('join' | 'start'), groupId (nullable fk to groups.id
     when intent='join'), city (nullable, when intent='start'),
     wantsNewsletter (bool default true), wantsEvents (bool default
     true), wantsSms (bool default false), createdAt, deletedAt.
2. Build src/components/JoinForm.tsx with these fields, in this
   order, as one screen, no multi-step:
   - Name (required)
   - Email (required, validated)
   - Phone (optional; if provided, surface SMS-notify checkbox)
   - Intent (required, segmented control): "Join a group" / "Start
     a group"
   - If JOIN: a group picker populated from the groups + locations
     tables (city, day, time, leader name). Multi-select allowed.
   - If START: city / area free text + "what's your timeline" chips
     ("Now" / "3 months" / "Just exploring")
   - Notification preferences: two checkboxes both default ON,
     "Email me the weekly Letter" / "Email me events." Plus a third
     opt-in if phone given: "Text me reminders before events."
   No password. No account. Submit posts to /api/members.
3. Build src/app/api/members/route.ts (NEW) — POST handler with zod
   validation, write to the table from step 1, fire a Resend
   transactional welcome email (reuse src/emails/ templates), then
   server-render the Watch covenant card.
4. Build src/app/api/og/covenant/[id]/route.ts (NEW) using next/og
   ImageResponse at 1080x1920. Member's first name + city, Acts
   20:28, brass-stamped seal mark, sheepdog mark, hairline rule.
   This is the share moment.
5. On submit success, show the covenant card inline with two
   buttons: "Save image" (downloads PNG) and "Text this to a
   friend" (sms: link with prefilled body). Replace the existing
   /subscribe page hero with <JoinForm />. Embed it on /groups and
   the homepage CTA as well.
6. Resources stay publicly downloadable. No signup gate on
   /resources.
7. Admins see new members in an existing or one-new-page admin
   list. If /admin/contacts already serves this role, extend it.
   Otherwise add /admin/members as a thin TanStack-Table list view
   reusing existing admin patterns.

Acceptance: a man can fill the form on a phone in under 60 seconds,
see his Watch covenant card, save it to Photos, and text it to a
friend with the prefilled SMS. The friend receives a real card with
real type, not a generic share image.

End with: "PHASE 3 COMPLETE…" — final summary.
</phase>

<stop_protocol>
Between every phase: output the phase summary, then literally:
"AWAITING APPROVAL — reply PROCEED to begin Phase N+1."
Do not call Edit, Write, MultiEdit, or Bash-with-side-effects until
the user replies the single word PROCEED. Anything else is feedback —
revise your plan, do not advance. Zero exceptions.
</stop_protocol>

<output_format>
End-of-phase report: "PHASE N COMPLETE — [name]" followed by:
- Files modified (list)
- Files added (list)
- Files deleted (must be empty unless approved)
- Open questions
- Deferred items (bugs noticed, etc. — do NOT fix them)
- AWAITING APPROVAL line.
After each phase also append an entry to tasks/lessons.md if any
correction or surprise occurred — keep the lesson terse and
actionable.
</output_format>

<closing>
Three rules to re-read every time you are about to act:
1. Auth, middleware, and schema.ts are off-limits. Extend; do not
   replace.
2. Treat every existing file as canonical until the project's
   CLAUDE.md or the user says otherwise.
3. When in doubt, STOP and ask. Do not guess. Do not "improve."
   Do not refactor.

Begin Phase 0 now. Read-only.
</closing>
```
