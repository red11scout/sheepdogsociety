# Phase C — Letter Autopilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The weekly Letter writes itself: a cron generates 4-letter theme blocks — season-aware, rotating through the ten reformed-theologian voices, with gpt-image-1 covers and a discrete call to action — through the existing series engine, guarded by machine gates, visible to Jeremy by email, and killable with one toggle.

**Architecture:** Two pure TDD modules (theme calendar, reference verifier), one migration (callToAction + series origin + `letter_autopilot` state table), two extractions (session-less series core with a transaction; server-side cover generation), then the autopilot engine + weekly cron, CTA rendering in page + email + editor, and a status card with option-A kill-switch semantics. Ships with autopilot **disabled** — Drew/Jeremy flip the toggle.

**Tech Stack:** Next.js 16, Drizzle/Neon, Vercel AI SDK `generateObject` + bare `anthropic` import (categorize.ts pattern), gpt-image-1 via raw fetch + Vercel Blob, Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-phase4-mobile-simplification-design.md` §Phase C. Binding.

## Global Constraints

- Bible verse text NEVER generated or rendered from AI — scripture entries are reference + original note only.
- All AI structured-output schemas carry ZERO zod size constraints (Anthropic rejects minItems/maxItems etc. — documented in categorize.ts/cluster.ts/letter-series.ts); bounds enforced post-response with retry.
- Banned-language gate: `findBannedLanguage` from `@/lib/ai/banned` over ALL generated prose; any hit consumes the retry.
- Gates share a **single 2-attempt regeneration budget per letter**; a letter failing on attempt 2 is a **gap week** — surviving letters keep their dates; the gap is named in the "autopilot needs you" email. Failure mode is silence, never a bad letter.
- `verifyReference`: local `parseReference` first (zero network); ESV empty-passages = **invalid → regenerate**; thrown errors / missing key / non-200 = **unavailable → skip verification this run, note it in the visibility email**. An ESV outage must not burn budgets. (`ESV_API_KEY` absent in Preview by design.)
- Trigger: fewer than 2 scheduled, non-deleted letters — counting ALL scheduled letters, manual or autopilot. Block start = `max(scheduledFor) + 7d` across all scheduled letters; weekly cadence; per-letter season from its own scheduledFor in America/Chicago.
- Theme: 1–3 words, enforced post-response.
- Kill switch (option A): disabling autopilot stops generation AND flips unpublished autopilot-originated scheduled letters to draft (manual letters never touched). Re-enabling does not auto-reschedule.
- Images best-effort per letter: failure = SVG LetterCover fallback, never a blocked letter or half-created series.
- Autopilot letters attribute to `letter_autopilot.default_author_id`.
- Engine extensions (callToAction, resonance instruction, optional season context) apply to ALL series generation, wizard included; callToAction nullable in schema and rendering; the wizard UI/flow does not change.
- Visibility email links to `/admin/encouragements/[id]` behind existing admin sign-in; no unauthenticated draft URLs.
- Voice: system-prompt rules; NEVER the banned words; no em-dashes in generated-prose furniture.
- Migrations: hand-written `drizzle/0018_letter_autopilot.sql` per 0016/0017 template. NEVER drizzle-kit push.
- Repo `/Users/drewgodwin/Code/sheepdogsociety`, npm, branch `feat/phase-c-letter-autopilot` off fresh main. Gates: tsc · vitest · eslint · check:contrast.

---

### Task 1: Theme calendar (pure, TDD)

**Files:**
- Create: `src/lib/letters/theme-calendar.ts`
- Test: `src/lib/letters/theme-calendar.test.ts`

**Interfaces:**
- Produces:
```ts
export type LiturgicalSeason =
  | "Advent" | "Christmas" | "Epiphany" | "Lent" | "Holy Week"
  | "Easter" | "Pentecost" | "Ordinary Time";
export type CulturalMarker = "New Year" | "Father's Day" | "Back to school" | "Thanksgiving";
export interface SeasonContext { liturgical: LiturgicalSeason; cultural?: CulturalMarker }
export function easterDate(year: number): { month: number; day: number };  // Gregorian computus
export function seasonForDate(d: { year: number; month: number; day: number }): SeasonContext;
export function chicagoDateParts(utc: Date): { year: number; month: number; day: number };
```
Task 6 consumes `seasonForDate(chicagoDateParts(letter.scheduledFor))`.

Date rules (locked):
- `easterDate`: Meeus/Jones/Butcher Gregorian algorithm.
- Advent: from the 4th Sunday before Dec 25 (the Sunday in Nov 27–Dec 3) through Dec 24.
- Christmas: Dec 25 – Jan 5. Epiphany: Jan 6 – day before Ash Wednesday. Lent: Ash Wednesday (Easter−46d) – day before Palm Sunday. Holy Week: Palm Sunday (Easter−7d) – Holy Saturday. Easter: Easter Sunday – day before Pentecost. Pentecost: Easter+49d – Easter+55d. Everything else: Ordinary Time.
- Cultural overlays (independent of liturgical): New Year Dec 29–Jan 4; Father's Day = the week Mon–Sun containing the 3rd Sunday of June; Back to school Aug 1–Sep 7; Thanksgiving = the week Mon–Sun containing the 4th Thursday of November.
- `chicagoDateParts`: subtract 6 hours from the UTC instant, read UTC date parts — the deliberate CST-conservative convention `computeScheduledFor` already uses (letters publish at 6am Central; a fixed −6h is correct for date-bucketing and matches the existing engine; document this).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/letters/theme-calendar.test.ts
import { describe, expect, it } from "vitest";
import { easterDate, seasonForDate, chicagoDateParts } from "./theme-calendar";

describe("easterDate (computus)", () => {
  it("matches known Easters", () => {
    expect(easterDate(2024)).toEqual({ month: 3, day: 31 });
    expect(easterDate(2025)).toEqual({ month: 4, day: 20 });
    expect(easterDate(2026)).toEqual({ month: 4, day: 5 });
    expect(easterDate(2027)).toEqual({ month: 3, day: 28 });
    expect(easterDate(2038)).toEqual({ month: 4, day: 25 }); // latest possible
  });
});

describe("seasonForDate", () => {
  it("Advent starts on the right Sunday and ends Dec 24", () => {
    // 2026: Dec 25 is a Friday -> Advent starts Sunday Nov 29, 2026.
    expect(seasonForDate({ year: 2026, month: 11, day: 28 }).liturgical).toBe("Ordinary Time");
    expect(seasonForDate({ year: 2026, month: 11, day: 29 }).liturgical).toBe("Advent");
    expect(seasonForDate({ year: 2026, month: 12, day: 24 }).liturgical).toBe("Advent");
    expect(seasonForDate({ year: 2026, month: 12, day: 25 }).liturgical).toBe("Christmas");
  });
  it("Christmas crosses the year boundary into Epiphany", () => {
    expect(seasonForDate({ year: 2027, month: 1, day: 5 }).liturgical).toBe("Christmas");
    expect(seasonForDate({ year: 2027, month: 1, day: 6 }).liturgical).toBe("Epiphany");
  });
  it("Lent, Holy Week, Easter, Pentecost hang off the computus (2026: Easter Apr 5)", () => {
    expect(seasonForDate({ year: 2026, month: 2, day: 18 }).liturgical).toBe("Lent"); // Ash Wednesday
    expect(seasonForDate({ year: 2026, month: 3, day: 29 }).liturgical).toBe("Holy Week"); // Palm Sunday
    expect(seasonForDate({ year: 2026, month: 4, day: 5 }).liturgical).toBe("Easter");
    expect(seasonForDate({ year: 2026, month: 5, day: 24 }).liturgical).toBe("Pentecost"); // Easter+49
    expect(seasonForDate({ year: 2026, month: 5, day: 31 }).liturgical).toBe("Ordinary Time");
  });
  it("cultural overlays ride on top of liturgical", () => {
    const newYear = seasonForDate({ year: 2027, month: 1, day: 1 });
    expect(newYear.liturgical).toBe("Christmas");
    expect(newYear.cultural).toBe("New Year");
    // 3rd Sunday of June 2026 is June 21; its Mon-Sun week is Jun 15-21.
    expect(seasonForDate({ year: 2026, month: 6, day: 17 }).cultural).toBe("Father's Day");
    expect(seasonForDate({ year: 2026, month: 6, day: 22 }).cultural).toBeUndefined();
    // 4th Thursday Nov 2026 is Nov 26; week Mon Nov 23 - Sun Nov 29.
    expect(seasonForDate({ year: 2026, month: 11, day: 23 }).cultural).toBe("Thanksgiving");
    expect(seasonForDate({ year: 2026, month: 8, day: 15 }).cultural).toBe("Back to school");
  });
});

describe("chicagoDateParts", () => {
  it("buckets a 6am-Central publish instant to its Central date", () => {
    // 2026-12-25T12:00:00Z = 6am CST Dec 25.
    expect(chicagoDateParts(new Date("2026-12-25T12:00:00Z"))).toEqual({ year: 2026, month: 12, day: 25 });
    // 2027-01-01T03:00:00Z = Dec 31, 9pm CST — previous Central date.
    expect(chicagoDateParts(new Date("2027-01-01T03:00:00Z"))).toEqual({ year: 2026, month: 12, day: 31 });
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/letters/theme-calendar.test.ts` → module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/letters/theme-calendar.ts
/**
 * Deterministic date -> season context for the Letter autopilot (spec §C.1).
 * No AI, no network, no Date.now(). Liturgical seasons hang off the
 * Gregorian computus; cultural markers are an optional overlay (New Year
 * sits inside Christmastide; Father's Day inside Ordinary Time).
 *
 * Date bucketing uses the same CST-conservative convention as
 * computeScheduledFor (UTC-6 fixed): letters publish at 6am Central, so a
 * fixed offset never mis-buckets a publish date.
 */
export type LiturgicalSeason =
  | "Advent" | "Christmas" | "Epiphany" | "Lent" | "Holy Week"
  | "Easter" | "Pentecost" | "Ordinary Time";
export type CulturalMarker = "New Year" | "Father's Day" | "Back to school" | "Thanksgiving";
export interface SeasonContext { liturgical: LiturgicalSeason; cultural?: CulturalMarker }

/** Meeus/Jones/Butcher Gregorian computus. month is 1-12. */
export function easterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/** Day-of-year serial via UTC (leap-safe), for pure date arithmetic. */
function serial(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) / 86400000;
}
function dayOfWeek(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}
function fromSerial(s: number): { year: number; month: number; day: number } {
  const dt = new Date(s * 86400000);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/** Nth weekday (0=Sun..6=Sat) of a month, 1-indexed n. Returns day-of-month. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstDow = dayOfWeek(year, month, 1);
  return 1 + ((7 + weekday - firstDow) % 7) + (n - 1) * 7;
}

function adventStart(year: number): number {
  // The Sunday falling in Nov 27 - Dec 3.
  for (let d = 27; d <= 30; d++) {
    if (dayOfWeek(year, 11, d) === 0) return serial(year, 11, d);
  }
  for (let d = 1; d <= 3; d++) {
    if (dayOfWeek(year, 12, d) === 0) return serial(year, 12, d);
  }
  throw new Error("unreachable: no Sunday in Nov 27 - Dec 3");
}

function liturgicalFor(y: number, m: number, d: number): LiturgicalSeason {
  const s = serial(y, m, d);

  // Christmastide spans the year boundary: Dec 25 - Jan 5.
  if ((m === 12 && d >= 25) || (m === 1 && d <= 5)) return "Christmas";
  if (s >= adventStart(y) && s < serial(y, 12, 25)) return "Advent";

  const easter = easterDate(y);
  const easterS = serial(y, easter.month, easter.day);
  const ashWednesday = easterS - 46;
  const palmSunday = easterS - 7;
  const pentecost = easterS + 49;

  if (s >= serial(y, 1, 6) && s < ashWednesday) return "Epiphany";
  if (s >= ashWednesday && s < palmSunday) return "Lent";
  if (s >= palmSunday && s < easterS) return "Holy Week";
  if (s >= easterS && s < pentecost) return "Easter";
  if (s >= pentecost && s <= pentecost + 6) return "Pentecost";
  return "Ordinary Time";
}

function culturalFor(y: number, m: number, d: number): CulturalMarker | undefined {
  const s = serial(y, m, d);
  if ((m === 12 && d >= 29) || (m === 1 && d <= 4)) return "New Year";
  if (m === 8 || (m === 9 && d <= 7)) return "Back to school";

  // Father's Day: Mon-Sun week containing the 3rd Sunday of June.
  const fd = serial(y, 6, nthWeekday(y, 6, 0, 3));
  if (s >= fd - 6 && s <= fd) return "Father's Day";

  // Thanksgiving: Mon-Sun week containing the 4th Thursday of November.
  const tg = serial(y, 11, nthWeekday(y, 11, 4, 4));
  const tgMonday = tg - 3; // Thursday - 3 = Monday
  if (s >= tgMonday && s <= tgMonday + 6) return "Thanksgiving";

  return undefined;
}

export function seasonForDate(dt: { year: number; month: number; day: number }): SeasonContext {
  const liturgical = liturgicalFor(dt.year, dt.month, dt.day);
  const cultural = culturalFor(dt.year, dt.month, dt.day);
  return cultural ? { liturgical, cultural } : { liturgical };
}

export function chicagoDateParts(utc: Date): { year: number; month: number; day: number } {
  return fromSerial(Math.floor((utc.getTime() / 86400000) - 6 / 24 + 1e-9) as number) ??
    (() => { throw new Error("unreachable"); })();
}
```

NOTE for the implementer on `chicagoDateParts`: the one-liner above is the intent (shift the instant back 6 hours, floor to a UTC day); if the fractional-day floor reads poorly, implement it plainly:

```ts
export function chicagoDateParts(utc: Date): { year: number; month: number; day: number } {
  const shifted = new Date(utc.getTime() - 6 * 3600 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}
```
Use the plain version. Run the tests; they pin the behavior either way.

- [ ] **Step 4: Run tests to verify pass** — expect PASS (4 suites).
- [ ] **Step 5: Commit** — `feat(letters): deterministic theme calendar (computus + liturgical + cultural overlay)`

---

### Task 2: verifyReference (TDD on the parse layer)

**Files:**
- Create: `src/lib/letters/verify-reference.ts`
- Test: `src/lib/letters/verify-reference.test.ts`

**Interfaces:**
- Produces: `export type ReferenceVerdict = "valid" | "invalid" | "unavailable"; export async function verifyReference(ref: string): Promise<ReferenceVerdict>` and `export function localParse(ref: string): "parses" | "invalid"` (pure, tested). Task 6 consumes `verifyReference`.

Behavior (spec §C.4, locked): (1) `parseReference` from `@/lib/bible/books` first — null → `"invalid"`, zero network. (2) Only then hit ESV: reuse the fetch pattern of `getESVPassage` (`src/lib/bible/esv.ts:11-48`) with `q = ref`; **empty passages array → "invalid"**; missing `ESV_API_KEY`, network error, or non-200 → **"unavailable"** (never throws). Tests cover the pure layer + the classification logic with a mocked fetch (vitest `vi.stubGlobal("fetch", ...)`); no live ESV in unit tests.

- [ ] **Step 1: failing tests** (exact code):

```ts
// src/lib/letters/verify-reference.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { localParse, verifyReference } from "./verify-reference";

afterEach(() => vi.unstubAllGlobals());

describe("localParse", () => {
  it("accepts real references and rejects fakes without network", () => {
    expect(localParse("John 15:5")).toBe("parses");
    expect(localParse("Psalm 23")).toBe("parses");
    expect(localParse("Hesitations 3:16")).toBe("invalid");
    expect(localParse("John 99")).toBe("invalid"); // chapter out of range
  });
});

describe("verifyReference", () => {
  it("invalid locally never touches the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await verifyReference("Hesitations 3:16")).toBe("invalid");
    expect(spy).not.toHaveBeenCalled();
  });
  it("ESV empty passages means invalid", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ passages: [] }), { status: 200 })));
    expect(await verifyReference("John 15:5")).toBe("invalid");
  });
  it("ESV non-200 or missing key means unavailable, never a throw", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));
    expect(await verifyReference("John 15:5")).toBe("unavailable");
    vi.stubEnv("ESV_API_KEY", "");
    expect(await verifyReference("John 15:5")).toBe("unavailable");
  });
  it("ESV passage present means valid", async () => {
    vi.stubEnv("ESV_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ passages: ["Abide in me..."] }), { status: 200 })));
    expect(await verifyReference("John 15:5")).toBe("valid");
  });
});
```

- [ ] **Step 2: RED.** — module not found.
- [ ] **Step 3: Implement** — mirror `getESVPassage`'s URL/params/headers exactly (read esv.ts first); wrap everything network in try/catch → "unavailable"; parse `data.passages` → non-empty trimmed join → "valid" else "invalid". `localParse` = `parseReference(ref) ? "parses" : "invalid"`.
- [ ] **Step 4: GREEN.** `npx vitest run src/lib/letters/verify-reference.test.ts` (5 tests).
- [ ] **Step 5: Commit** — `feat(letters): verifyReference — local canon parse first, ESV outage never burns budgets`

---

### Task 3: Migration 0018 + schema + core extraction

**Files:**
- Modify: `src/db/schema-new.ts` — `weeklyEncouragements` gains `callToAction`; `letterSeries` gains `origin`; new `letterAutopilot` table
- Create: `drizzle/0018_letter_autopilot.sql`
- Create: `src/server/letters/series-core.ts` (plain server module, NOT "use server")
- Modify: `src/server/letter-series.ts` — becomes a thin authenticated wrapper

**Interfaces:**
- Schema adds: `weeklyEncouragements.callToAction: text("call_to_action").default("")` · `letterSeries.origin: text("origin").notNull().default("manual")` (values `manual | autopilot`) · new table `letterAutopilot` (`letter_autopilot`): `id uuid pk defaultRandom`, `enabled boolean notNull default false`, `defaultAuthorId text FK users.id onDelete set null`, `voiceRotationIndex integer notNull default 0`, `lastRunAt timestamp`, `lastBlockTheme text default ''`, `lastBlockVoice text default ''`, `lastBlockLetterIds jsonb default [] notNull`, `updatedAt timestamp notNull defaultNow`.
- `series-core.ts` produces:
```ts
export const CADENCE_DAYS: Record<string, number>;
export function computeScheduledFor(startDate: Date, position: number, cadence: string, publishHour: number): Date;
export interface SeriesCoreInput { /* identical fields to createSeriesWithLetters' input */; origin: "manual" | "autopilot"; letters: DraftLetter[] }
export interface DraftLetter { position: number; title: string; intro: string; scriptures: { ref: string; note: string }[]; guidance: string; notes: string; callToAction?: string }
export async function createSeriesWithLettersCore(authorId: string, input: SeriesCoreInput): Promise<{ series: ...; letters: { id: string; slug: string; position: number }[] }>;
```
- The core wraps issueNumber MAX+1 + all inserts in **one `db.transaction`** (concurrent wizard/cron writers must not collide). Move the exact bodies of `computeScheduledFor`, `CADENCE_DAYS`, `slugify`, and the insert loop from `letter-series.ts` (read it first — the logic moves verbatim except: transaction wrapper, `origin` on the series insert, `callToAction: draft.callToAction ?? ""` on each letter insert, `authorId` from the parameter instead of session).
- `letter-series.ts` keeps `requireAdmin`, `listSeries`, `listScheduledLetters`, `cancelScheduledLetter`; `createSeriesWithLetters` becomes: `requireAdmin()` → `createSeriesWithLettersCore(userId, { ...input, origin: "manual" })` → `revalidatePath`. Its exported input type is unchanged (wizard untouched).

Migration (verbatim):

```sql
-- Migration 0018: Letter autopilot (spec §Phase C)
--
-- call_to_action: discrete CTA per letter (nullable-as-empty; wizard
-- letters simply leave it blank). origin: tags autopilot-generated series
-- so the kill switch can revert ONLY autopilot letters to draft.
-- letter_autopilot: single-row state — enabled flag, voice rotation,
-- last-run metadata. Ships with enabled=false; Jeremy flips it on.
--
-- Apply via the GHA migration runner on push to main, or:
--   DATABASE_URL='...' node scripts/apply-neon-migration.mjs

ALTER TABLE "weekly_encouragements"
  ADD COLUMN IF NOT EXISTS "call_to_action" text DEFAULT '';

ALTER TABLE "letter_series"
  ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS "letter_autopilot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "enabled" boolean NOT NULL DEFAULT false,
  "default_author_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "voice_rotation_index" integer NOT NULL DEFAULT 0,
  "last_run_at" timestamp,
  "last_block_theme" text DEFAULT '',
  "last_block_voice" text DEFAULT '',
  "last_block_letter_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
```

Steps: schema edits → migration file → controller applies to prod (SKIP locally; note in report) → extract core with transaction → thin wrapper → gates (`tsc`, `npm test`, eslint on all four files) → commit `feat(letters): session-less series core with transaction; callToAction + origin + autopilot state (migration 0018)`.

---

### Task 4: Engine extensions — callToAction + season context in generation

**Files:**
- Modify: `src/lib/ai/letter-series.ts`

**Interfaces:**
- `generateLetterSeries` params gain two optional fields: `callToActionRequired?: boolean` (default true — the wizard benefits too) and `seasonContext?: string` (freeform block the autopilot builds from Task 1 output; when present, inject into the user prompt as a "Season" section instructing the arc to fit it).
- Per-letter schema object gains `callToAction: z.string().describe("One concrete move for the week, 20-60 words, imperative, no em-dashes")` (zero size constraints — post-validate).
- `validateSeriesPlan` gains: `callToAction` present and 20–400 chars per letter; plus run `findBannedLanguage` (import from `@/lib/ai/banned`) over intro+guidance+notes+callToAction of every letter — any hit fails validation (consumes the existing 2-attempt loop).
- Strengthen resonance: append to the user prompt's per-letter instructions: `Each letter must carry one image or story that lands in the chest — one, not three, and never sentimental.`
- Return type's letters now include `callToAction: string` (flows into `DraftLetter.callToAction`).

Read the file first; the validation loop, prompt structure, and schema live at the lines named in the plan's research (schema :23-51, prompt :62-96, validate :126-152). Gates + commit `feat(ai): series generation gains callToAction, season context, resonance rule, banned-language validation`.

---

### Task 5: Server-side cover generation

**Files:**
- Create: `src/server/letters/cover-image.ts`
- Modify: `src/app/api/admin/image-gen/route.ts` — refactor to call the extracted helper (behavior identical)

**Interfaces:**
- Produces: `export async function generateCoverImage(input: { prompt: string; style?: string; aspectRatio?: "landscape" | "portrait" | "square"; quality?: "draft" | "final"; folder?: string }): Promise<{ url: string; pathname: string } | null>` — null on ANY failure (missing OPENAI_API_KEY, OpenAI error, Blob failure); never throws. Internals: the exact OpenAI raw-fetch + Blob `put` currently inline in the route (read it; move verbatim), minus the admin gate (callers gate).
- Add a 7th style preset to the STYLE_FRAGMENTS record (which moves into the helper and is re-exported to the route): key `broadsheet`, fragment: `Editorial broadsheet documentary photograph, muted Pasture & Iron palette (bone, iron, brass, olive), natural morning light, honest working men's textures (timber, canvas, leather, field), no text, no faces in sharp focus, grain like a printed newspaper photo`.
- The route keeps its admin gate and request parsing, delegates to the helper, and returns the same response shapes (save / no-save).

Gates + a route-parity check (eslint/tsc; behavior verified in Task 8 live-fire) + commit `feat(letters): extract server-side cover generation with broadsheet preset`.

---

### Task 6: Autopilot engine + weekly cron

**Files:**
- Create: `src/server/letters/autopilot.ts`
- Create: `src/app/api/cron/autopilot-letters/route.ts`
- Modify: `vercel.json` — crons array gains `{ "path": "/api/cron/autopilot-letters", "schedule": "0 13 * * 1" }` (Mondays 13:00 UTC = 7am Central); functions block gains `"src/app/api/cron/autopilot-letters/route.ts": { "maxDuration": 300 }` (also export in-file).

**Interfaces:**
- `autopilot.ts` produces `export async function runAutopilot(opts?: { dryRun?: boolean }): Promise<AutopilotRunReport>` where
```ts
export interface AutopilotRunReport {
  ran: boolean;                 // false when disabled or enough letters scheduled
  reason?: string;              // "disabled" | "3 letters already scheduled" | ...
  theme?: string; voice?: string;
  scheduled: { id: string; title: string; scheduledFor: string }[];
  gaps: { position: number; reason: string }[];
  verificationSkipped?: boolean; // ESV unavailable this run
  coversGenerated: number;
  dryRun?: boolean;
}
```
- Flow (each step binding):
  1. Load the single `letterAutopilot` row (create-if-missing with defaults, disabled). If `!enabled` → `{ ran: false, reason: "disabled" }`.
  2. Count ALL `weeklyEncouragements` with `status='scheduled' AND deletedAt IS NULL`. If ≥ 2 → ran:false with reason.
  3. Block dates: `maxScheduledFor = max(scheduledFor)` over those rows (fallback: now); letters at +7d, +14d, +21d, +28d, publish hour 6 via `computeScheduledFor`-equivalent (call it with startDate = maxScheduledFor+7d, cadence weekly).
  4. Per-letter `SeasonContext` via Task 1; build a season block string naming each letter's week + season (+cultural).
  5. Next theologian: `THEOLOGIAN_VOICES[voiceRotationIndex % 10]`.
  6. Theme proposal: `generateObject` (bare `anthropic`, `claude-sonnet-4-5`, SYSTEM_PROMPT + voice addendum) → `{ theme: z.string(), rationale: z.string() }`; post-validate 1–3 words + `findBannedLanguage` clean; 2 attempts; failure → ran:false reason "theme generation failed" + alert email.
  7. `generateLetterSeries({ title: theme, theme, voiceId, totalCount: 4, seasonContext, callToActionRequired: true })`.
  8. Per-letter gates beyond Task 4's internal validation: `verifyReference` on every scripture ref — any `"invalid"` → regenerate THAT letter once via a single-letter regeneration call (reuse generateLetterSeries with totalCount 1 and the same theme/season for that position, replacing it); second failure → drop the letter (gap week; record in `gaps`). All `"unavailable"` → set `verificationSkipped`, don't drop anything.
  9. `dryRun: true` stops here and returns the report (nothing persisted, no email). Otherwise persist via `createSeriesWithLettersCore(authorId, { origin: "autopilot", ... })`. **Author rule (locked):** `authorId = letterAutopilot.defaultAuthorId`; if that is null, do NOT guess — return `{ ran: false, reason: "no default author configured" }` and send the alert email. **Gap-week rule (locked):** pass surviving letters with their ORIGINAL positions (1–4, holes allowed) and the original block startDate — the core computes each date from its position, so original positions preserve original dates and a dropped letter is simply a missing week. Do NOT renumber positions.
  10. Covers: for each created letter, `generateCoverImage({ prompt: <title + theme + season, no scripture text>, style: "broadsheet", aspectRatio: "landscape", quality: "final", folder: "letters" })`; on success `db.update(weeklyEncouragements).set({ coverImageUrl, coverImageAlt: title })`; failures counted, never blocking.
  11. Update `letterAutopilot`: `voiceRotationIndex + 1`, `lastRunAt`, `lastBlockTheme/Voice`, `lastBlockLetterIds`.
  12. Visibility email via `resend()` + `FROM_TRANSACTIONAL` to shepherd@acts2028sheepdogsociety.com: subject `The next four weeks are written: ${theme}, in the voice of ${voiceName}` — body lists each letter title + publish date + `${NEXT_PUBLIC_SITE_URL}/admin/encouragements/${id}` link, names any gap weeks and the verification-skipped flag, and states the kill switch location. Failure to email is logged, non-blocking.
  13. Every AI call (theme + series + regenerations) logs to `ai_generations` (inline insert pattern, entityType "letter", promptVersion strings — theme: `letter-autopilot-theme.v1`).
- Cron route: clone the `authorized()` CRON_SECRET check from publish-scheduled-letters verbatim; GET handler → `runAutopilot()` → JSON of the report. `export const runtime = "nodejs"; export const maxDuration = 300;`

Gates + commit `feat(letters): autopilot engine + weekly cron — season-aware blocks, gated, killable, disabled by default`.

---

### Task 7: CTA rendering + editor field + status card + kill switch

**Files:**
- Modify: `src/app/(public)/letter/[slug]/page.tsx` — after the Notes section (~:193), before the footer CTAs: a `callToAction`-gated section using the existing Kicker/section pattern, kicker text `One move this week`.
- Modify: `src/emails/encouragement.tsx` — add `callToAction?: string` prop; render a Section after notes (~:165) styled like Notes from the Watch, heading `One move this week`.
- Modify: `src/server/encouragements.ts` — thread `callToAction: row.callToAction` into the `EncouragementEmail(...)` render call inside `broadcastEncouragement`.
- Modify: `src/app/(app)/admin/encouragements/[id]/editor.tsx` — a `callToAction` textarea field beside/below notes, autosaving like the other fields (mirror the notes field's state + autosave wiring exactly).
- Create: `src/app/(app)/admin/encouragements/autopilot-card.tsx` (client) + a server action pair in a new `src/server/letters/autopilot-admin.ts` (`"use server"`): `getAutopilotStatus()` (row + scheduled-autopilot-letter list) and `setAutopilotEnabled(enabled: boolean)` — on `false`, also flip every letter to draft where `status='scheduled'` and its `seriesId` belongs to a series with `origin='autopilot'` (set `scheduledFor: null` like `cancelScheduledLetter`), returning how many were reverted. Both `requireAdmin`.
- Modify: `src/app/(app)/admin/encouragements/page.tsx` — mount the card after the header (~:63): shows enabled toggle, last run, last block (theme, voice, letter links), reverted-count feedback after a disable.

Card copy (final): title `Autopilot`; enabled state line `Writing four weeks at a time. Next run checks Monday morning.`; disabled state line `Off. The Letter waits for your hand.`; disable confirm: `Turn autopilot off? Unpublished autopilot letters go back to drafts and will not send.`

Gates + commit `feat(letters): CTA renders on page + email + editor; autopilot status card with option-A kill switch`.

---

### Task 8: Gates, live-fire, final review, ship (controller-owned)

- [ ] Full static gates + check:contrast.
- [ ] Apply migration 0018 to prod (idempotent runner) + verify columns/table via information_schema.
- [ ] Live-fire in DRY-RUN: seed `letter_autopilot` with `enabled=true, defaultAuthorId=<Jeremy's users.id>` in a LOCAL script calling `runAutopilot({ dryRun: true })` against prod DB (unset ANTHROPIC_BASE_URL; SHEEPDOG_AI_KEY rename trick): verify report shape, theme 1–3 words, 4 letters with CTAs, refs verified (ESV key present locally), season context correct for the computed dates, banned-language clean. Nothing persists in dry-run — verify DB row counts unchanged.
- [ ] Live-fire ONE broadsheet cover via `generateCoverImage` directly; eyeball the image URL renders; delete the blob after.
- [ ] Reset `letter_autopilot.enabled=false` (ship-disabled contract) but KEEP defaultAuthorId seeded.
- [ ] Verify cron auth: unauthenticated GET → 401; wrong key → 401.
- [ ] Multi-lens final review workflow (security / spec-coverage / minors-triage per the A-FN pattern) + ONE consolidated fix wave + re-verdict.
- [ ] PR (`--body-file`), Vercel check, squash-merge, migration Action green, live prod checks: `/letter/[latest]` renders unchanged (no CTA on old letters), admin card present (307 for unauth), cron route 401s publicly, zero runtime errors 10 min.
- [ ] Docs: stamp spec §Phase C shipped; CLAUDE.md cron list + autopilot note; ledger; memory. Report to Drew with the go-live instruction (flip the toggle in /admin/encouragements).
