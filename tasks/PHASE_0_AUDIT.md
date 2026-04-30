# Phase 0 Audit — 2026-04-29

Read-only audit run before Phase 1. Saved so the next Claude Code session can skim instead of re-running.

## Architecture decision (locked 2026-04-29 by Drew)
- Site is fully public. Only admins log in.
- Members sign up via one form to join (or start) a group. They live in the DB so admins can assign them to groups and send opt-in email/SMS updates.
- Groups gather in person and communicate outside the site.
- The `(app)` member-only community area is OUT OF SCOPE for Phases 1-3 and will be decommissioned in a later cleanup phase.

## CLAUDE.md voice rules (verbatim)
- Pastoral, warm, direct, masculine without macho. Short Anglo-Saxon sentences. Imperative + invitation, never command. Tender and tough.
- NEVER: delve, leverage, navigate, robust, tapestry, journey (n.), rise, reclaim, fight back, real men, alpha, based, toxic masculinity.
- NEVER clichés: "walk with God," "do life together," "in today's fast-paced world," "level up," "unpack," "the journey of faith."
- NEVER em-dashes when commas work. NEVER political/culture-war framing.
- NEVER generate Bible verse text. Use `{{VERSE: ref}}` placeholders only.

## Stack confirmed
Next.js 16, React 19, TS strict, Tailwind v4. shadcn + radix-ui + lucide-react `^0.564.0`. Auth.js v5 Credentials (email + password) live per commit `6832583`. Drizzle 0.45 + postgres-js, Neon DB. Tiptap v3 admin editor live per commit `95a0f72`. AI via Vercel AI SDK + `@ai-sdk/anthropic`, model `claude-sonnet-4-5`. Resend transactional + Broadcasts. Mapbox GL. Vercel Blob (`@vercel/blob` available). OpenAI key wired for `gpt-image-1`. Clerk + Supabase auth still installed but legacy.

## Public route inventory (12 actual pages under `(public)/`)
`/`, `/about`, `/contact`, `/daily-scripture`, `/faq`, `/get-started`, `/giving`, `/how-we-gather`, `/locations`, `/locations/[id]`, `/locations/request`, `/partnerships`, `/scripture-reader`, `/stories`.

Homepage section order (post-revert): Hero "Stand Guard. Protect the Flock. Live with Purpose." → Mission → Foundation (Acts 20:28 quote) → Why We Exist (Protect / Fellowship / Serve) → How We Gather (Weekly Studies / Monthly Meals / Quarterly Gatherings / Annual Camping) → CTA. Lucide icons used: Shield, Users, Heart, BookOpen, MapPin, Calendar, Utensils, Mountain.

## Routes the middleware allows as public but that 404 today
Middleware whitelists `/letter`, `/devotionals`, `/groups`, `/events`, `/resources`, `/subscribe`, `/merch`, `/statement-of-faith`, `/blog` as public. None exist under `(public)/`. The `(app)/` versions of devotionals/groups/events/resources/blog redirect logged-out visitors to `/sign-in` via `(app)/layout.tsx`. **Phase 1 scope:** move readable versions of these to `(public)/`.

## Admin route inventory (18 pages under `(app)/admin`)
`/admin/blog`, `/admin/contacts`, `/admin/dashboard`, `/admin/devotionals`, `/admin/events`, `/admin/groups`, `/admin/letters`, `/admin/letters/new`, `/admin/letters/[id]`, `/admin/location-requests`, `/admin/locations`, `/admin/newsletter`, `/admin/prayer`, `/admin/reading-plans`, `/admin/resources`, `/admin/scripture`, `/admin/testimonies`, `/admin/users`. Sign-in at `/admin/sign-in`.

## API route inventory
- AI: `/api/ai/draft`, `/improve`, `/blog-draft`, `/devotional`, `/scripture-of-day`, `/reading-plan` (all server-only, `claude-sonnet-4-5`).
- Public: `/api/public/{locations,locations/[id],locations/interest,locations/request,newsletter,contact,bible}`.
- Admin: full CRUD set for blog/contacts/dashboard/events/location-requests/locations/newsletter/prayer/resources/scripture/testimonies/users.
- Auth: `/api/auth/[...nextauth]`. Webhooks: `clerk` (legacy), `resend`. Cron: `generate-daily`.

## Schema (38 tables) — relevance map
**Stays + load-bearing:** `users`, `accounts`, `sessions`, `verificationTokens`, `groups`, `groupMembers`, `groupLeaders`, `locations`, `locationRequests`, `locationInterests`, `groupInquiries`, `newsletterSubscribers` (+ planned new cols `wants_events`, `wants_sms`, `phone`), `contactSubmissions`, `letters`, `letterVersions`, `aiGenerations`, `events`, `eventRsvps`, `devotionals`, `scriptureOfDay`, `blogPosts`, `resources`, `testimonies`, `attendanceRecords`.
**Decommission later:** `channels`, `channelMembers`, `messages`, `reactions`, `prayerRequests`, `prayerRequestPrayers`, `accountabilityPairs`, `accountabilityCheckins`, `notes`, `bibleBookmarks`, `bibleHighlights`, `readingProgress`. Member-area only. Do not migrate or rewrite. Cleanup phase removes them.
**Already covers signup:** `locationInterests` (join-this-location: name+email+phone+message), `locationRequests` (start-a-group: name+email+phone+city+state+reason). `newsletterSubscribers` covers email-only opt-in. Member signup form will write to whichever applies + add prefs columns to `newsletterSubscribers`.

## Pasture & Iron tokens — present in `globals.css`
`--color-iron #1F2A2E`, `--color-bone #F2EBDD`, `--color-navy #1B3A4B`, `--color-brass #7E5F2C`, `--color-olive #5C6646`, `--color-oxblood #6B2C2C`, `--color-stone #C7B79A`, plus legacy `--color-bronze`. Fonts: Fraunces, Cormorant Garamond, Inter, Merriweather (Geist Mono is loaded but no `--font-mono` brand token uses it). Phase 1 sharpens by USING these tokens that the post-revert homepage doesn't yet apply (homepage uses `bronze` only).

## Lucide imports — 65 total
Public-facing scope: 13 of 14 public pages + `components/public/public-nav.tsx`, `components/layout/{mobile-nav,sidebar}.tsx`, `components/map/{location-card,location-map}.tsx`. Approx 19 files for the Phase 1 icon swap.

## Top 5 visual weaknesses vs. design direction
1. Generic icon language (Shield/Users/Heart/BookOpen/MapPin etc. — exactly the off-the-shelf set the brief calls out).
2. Headline typography is system-default-ish. `text-4xl font-bold` on `<h1>`, no Fraunces on hero, no display-size handling.
3. Section padding too small (`py-20` hero, `py-16` everywhere else). Brief targets 96-160px.
4. Accent treatment is bronze pill + bronze icon, repeated. No scripture-mark hairlines, no mono small-caps section labels, no asymmetric editorial layout.
5. No share moment. No Acts 20:28 verse plate, no `/acts-20-28` page, no map screenshot moment, no covenant card.

## Phase 1 file lists
**MODIFY (~22 files):** all 14 public pages + `components/public/public-nav.tsx`, `public-footer.tsx`, `layout/mobile-nav.tsx`, `sidebar.tsx`, `map/location-card.tsx`, `location-map.tsx`, plus `globals.css` and `tailwind.config.*` (additions only).
**CREATE (~46 files):** `lib/design/tokens.ts`, `components/icons/Icon.tsx`, 32 SVGs in `public/icons/`, 6 ceremonial illustrations in `public/icons/ceremonial/`, `components/VersePlate.tsx`, `app/(public)/acts-20-28/page.tsx`, `app/api/og/verse/route.ts`.
**Plus migrations:** move `(app)/{groups,devotionals,events,resources,blog}` to `(public)/`, add public `/letter` archive read.
**Files deleted:** zero in Phase 1. Member-area cleanup is a separate phase.
