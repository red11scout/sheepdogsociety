# Recurring Events (Series + Auto-Instances) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Weekly/biweekly/monthly gatherings defined once as a series auto-materialize into real, dated `events` rows 8 weeks ahead, so `/events` never silently drops a recurring gathering and gallery photos keep attaching to specific dates.

**Architecture:** New `event_series` table holds the pattern; pure, unit-tested recurrence math (`src/lib/events/series.ts`, DST-safe via `@date-fns/tz`) feeds a thin DB materializer (`src/server/event-series.ts`) that inserts instance rows with `ON CONFLICT DO NOTHING` on `(series_id, start_time)` plus day-level occupancy exclusion. Materialization runs on series create/edit and via a daily Vercel cron. Admin UIs (events page + gallery manager) gain a "Repeats" choice with a live next-5-dates preview; the public `/events` page groups instances by series.

**Tech Stack:** Next.js 16.1.6 (App Router), Drizzle ORM 0.45 + Neon Postgres, zod/v4, `@date-fns/tz` (new), Vitest (new, `src/lib` only), Tailwind v4 + shadcn (admin) / hand-built brand components (public).

**Verification round (2026-07-08):** this plan was adversarially reviewed by 4 independent agents against the live repo; fixes folded in. Two documented spec deviations: (1) the spec placed `ensureSeriesHorizon()` in `src/lib/events/` as a pure unit-tested function — DB orchestration cannot be pure, so the pure parts (occurrence generation, day-occupancy exclusion, instance-row shaping inputs) live and are tested in `src/lib/events/series.ts`, while `src/server/event-series.ts` stays a thin DB wrapper verified by smoke; (2) the "one-time vs recurring" question is a Repeats select placed first in both create forms rather than a two-step wizard.

## Global Constraints

- Repo root: `/Users/drewgodwin/sheepdogsociety`. Package manager is **npm** (project override; NOT pnpm).
- TypeScript strict. No `any` without a justifying comment.
- Zod imports from `"zod/v4"`; validate with `safeParse`; 400 body is `{ error: parsed.error.flatten() }`. (`.flatten()` and `z.string().url()` are deprecated-but-supported in zod 4.3.6; we keep them deliberately to match the repo's existing convention.)
- Next 16 route params are async: `{ params }: { params: Promise<{ id: string }> }` then `await params`.
- Admin auth pattern (copy exactly): `const { userId } = await auth()` from `"@/lib/auth-compat"` → 401; then `users.role === "admin"` check → 403.
- Migrations: hand-numbered SQL in `drizzle/` (next is `0014`), additive, `IF NOT EXISTS` everywhere, re-run safe. Apply with `node scripts/apply-neon-migration.mjs` (env from `.env.local`). **NEVER `drizzle-kit push`.** The GitHub Action re-applies on push to main; every statement must tolerate re-runs.
- All DB timestamps are UTC instants. Series wall-clock times live in `America/Chicago` unless the series says otherwise; conversion only via `TZDate.tz(...)` from `@date-fns/tz`. (Corrected in 16be56d: the ministry is in Rockmart GA, so the default is America/New_York.)
- Client → server datetime semantics (pre-existing, do not "fix" here): the gallery editor sends ISO strings (round-trip exact); the admin events dialog historically sent local `yyyy-MM-ddTHH:mm` strings that the server parses in its own timezone. Task 7 makes the dialog diff-send so unchanged datetimes are never re-parsed.
- Public-facing copy in Jeremy voice: short, plain, warm. Banned: delve, leverage, navigate, robust, tapestry, journey (noun), rise, reclaim, "real men", alpha, based, "toxic masculinity". No em-dashes where commas work.
- Server Components by default; `"use client"` only where interactive.
- Commits: conventional style matching history, e.g. `feat(events): …`, one commit per task.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/events/series.ts` (create) | Pure recurrence math: `generateOccurrences`, `previewOccurrences`, `cadenceLabel`, `localDateKey`, `excludeOccupiedDays`. No DB, no I/O. |
| `src/lib/events/series.test.ts` (create) | Vitest unit tests (DST, cadences, boundaries, occupancy exclusion, monthly guard). |
| `vitest.config.ts` (create) | Minimal Vitest config. |
| `src/db/schema.ts` (modify) | `eventSeries` table + `seriesId`/`isCancelled`/`isDetached` on `events` + deprecation comments. |
| `drizzle/0014_event_series.sql` (create) | The matching additive migration. |
| `src/server/event-series.ts` (create) | Thin DB layer: `ensureSeriesHorizon`, `regenerateFutureInstances`, `propagateCosmetics`, `removeCleanFutureInstances`, `softDeleteSeries`, `patternFrom`. |
| `src/app/api/admin/event-series/route.ts` (create) | Admin GET list (with previews) + POST create. |
| `src/app/api/admin/event-series/[id]/route.ts` (create) | Admin GET/PATCH/DELETE one series. |
| `src/app/api/admin/events/route.ts` (modify) | GET list also returns `seriesId` + `isCancelled`. |
| `src/app/api/admin/events/[id]/route.ts` (modify) | Series-instance guard rails: `isCancelled`, detach on real change, reject real `startTime` moves. |
| `src/app/api/cron/materialize-events/route.ts` (create) | Daily horizon top-up. |
| `vercel.json` (modify) | Register the cron. |
| `src/components/admin/next-dates-preview.tsx` (create) | Shared live "Next: …" preview + `seriesPatternFromLocalStart` helper. |
| `src/app/(app)/admin/events/page.tsx` (modify) | Repeats-first create dialog with live preview, diff-send edits, cancel/restore date, mounts SeriesPanel. |
| `src/app/(app)/admin/events/series-panel.tsx` (create) | Series list: pause/resume, edit (with preview), retire. |
| `src/server/gallery.ts` (modify) | Admin gallery rows gain `seriesId`/`seriesTitle`. |
| `src/app/(app)/admin/gallery/page.tsx` (modify) | Pass the new fields through the `initial` mapping. |
| `src/app/(app)/admin/gallery/manager.tsx` (modify) | Repeats-first New Event form with preview; series badge; latest-gathering shortcuts. |
| `src/app/(public)/events/page.tsx` (modify) | Upcoming grouped by series; cancelled excluded. |
| `src/app/(public)/events/[slug]/page.tsx` (modify) | Cancelled-date notice. |
| `CLAUDE.md` (modify) | Commands + cron docs. |

**Model rules (referenced by several tasks):**
- An instance is **clean** when `is_detached = false` AND `photos` is empty AND `recap` is empty. Pattern edits and pause delete only clean **future** instances.
- **Detach happens server-side on real change only**: the instance PATCH compares each content field (`title`, `description`, `location`, `endTime`, `eventType`, `maxAttendees`, `registrationUrl`) against the stored row and sets `is_detached = true` only when a sent value actually differs. Photos, recap, `isPast`, and `isCancelled` edits never detach.
- **Moving a series instance's `startTime` is rejected** (400) when the parsed incoming instant differs from the stored one; identical instants (ISO round-trips) pass through.
- A **cancelled** instance row stays as a tombstone. The materializer never recreates its slot: exact instants are blocked by the unique index, and **any** existing future instance of a series blocks its whole local calendar day (`excludeOccupiedDays`), so shifted-time regeneration cannot double-book a day.
- **Pause** keeps cancelled tombstones (`keepCancelled: true`) so resume does not resurrect cancelled dates. **Pattern edits** clear future tombstones (the edit dialog says so). **Retire** removes all future instances without photos and without recaps, regardless of detach/cancel state, then detaches history.
- Monthly cadence **requires** `nthWeek`: the generator throws instead of guessing, and the PATCH route validates the merged (existing + incoming) record.
- **Deleting a future series instance is rejected** (400, "cancel the date instead"): a hard delete would vacate the day and the cron would recreate it, silently resurrecting a date the admin meant to remove. Past instances stay deletable. (Added after final review.)

---

### Task 1: Recurrence math (pure, TDD)

**Files:**
- Create: `src/lib/events/series.ts`
- Create: `src/lib/events/series.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script; deps)

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (later tasks import these exact names from `@/lib/events/series`):
  - `type SeriesCadence = "weekly" | "biweekly" | "monthly_nth_weekday"`
  - `interface SeriesPattern { cadence: SeriesCadence; dayOfWeek: number; nthWeek: number | null; startTimeOfDay: string; durationMinutes: number | null; timezone: string; startDate: string }`
  - `interface Occurrence { start: Date; end: Date | null }`
  - `generateOccurrences(pattern, from, to): Occurrence[]` — `from` inclusive, `to` exclusive, never before `startDate`; throws on monthly with null `nthWeek`.
  - `previewOccurrences(pattern, from, count): Date[]`
  - `cadenceLabel(p): string` — "Every Tuesday" / "Every other Thursday" / "Monthly · 1st Saturday".
  - `localDateKey(instant: Date, timezone: string): number` — UTC-midnight ms key of the local calendar date.
  - `excludeOccupiedDays(occurrences: Occurrence[], existingStarts: Date[], timezone: string): Occurrence[]`

- [ ] **Step 1: Install dependencies and wire the test script**

```bash
cd /Users/drewgodwin/sheepdogsociety
npm install @date-fns/tz
npm install -D vitest
```

In `package.json`, change the scripts block from:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
```

to:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/events/series.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  cadenceLabel,
  excludeOccupiedDays,
  generateOccurrences,
  localDateKey,
  previewOccurrences,
  type SeriesPattern,
} from "./series";

// America/Chicago: CST is UTC-6; CDT (from 2026-03-08) is UTC-5.
const chicago = (over: Partial<SeriesPattern> = {}): SeriesPattern => ({
  cadence: "weekly",
  dayOfWeek: 2, // Tuesday
  nthWeek: null,
  startTimeOfDay: "06:00",
  durationMinutes: 90,
  timezone: "America/Chicago",
  startDate: "2026-02-01",
  ...over,
});

describe("generateOccurrences, weekly", () => {
  it("keeps 6:00 AM wall clock across the March 2026 spring-forward", () => {
    const out = generateOccurrences(
      chicago(),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-03-15T00:00:00Z")
    );
    expect(out.map((o) => o.start.toISOString())).toEqual([
      "2026-02-03T12:00:00.000Z",
      "2026-02-10T12:00:00.000Z",
      "2026-02-17T12:00:00.000Z",
      "2026-02-24T12:00:00.000Z",
      "2026-03-03T12:00:00.000Z",
      "2026-03-10T11:00:00.000Z", // CDT: still 6:00 AM in Chicago
    ]);
  });

  it("computes end from durationMinutes", () => {
    const [first] = generateOccurrences(
      chicago(),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-08T00:00:00Z")
    );
    expect(first.end?.toISOString()).toBe("2026-02-03T13:30:00.000Z");
  });

  it("returns null end when durationMinutes is null", () => {
    const [first] = generateOccurrences(
      chicago({ durationMinutes: null }),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-08T00:00:00Z")
    );
    expect(first.end).toBeNull();
  });

  it("never emits before startDate", () => {
    const out = generateOccurrences(
      chicago({ startDate: "2026-02-15" }),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-03-01T00:00:00Z")
    );
    expect(out[0].start.toISOString()).toBe("2026-02-17T12:00:00.000Z");
  });

  it("treats from as inclusive and to as exclusive", () => {
    const out = generateOccurrences(
      chicago(),
      new Date("2026-02-03T12:00:00Z"),
      new Date("2026-02-10T12:00:00Z")
    );
    expect(out).toHaveLength(1);
    expect(out[0].start.toISOString()).toBe("2026-02-03T12:00:00.000Z");
  });

  it("returns [] for an inverted window", () => {
    const out = generateOccurrences(
      chicago(),
      new Date("2026-03-01T00:00:00Z"),
      new Date("2026-02-01T00:00:00Z")
    );
    expect(out).toEqual([]);
  });
});

describe("generateOccurrences, biweekly", () => {
  it("anchors to the first matching weekday on/after startDate", () => {
    const out = generateOccurrences(
      chicago({ cadence: "biweekly" }),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-03-10T00:00:00Z")
    );
    expect(out.map((o) => o.start.toISOString())).toEqual([
      "2026-02-03T12:00:00.000Z",
      "2026-02-17T12:00:00.000Z",
      "2026-03-03T12:00:00.000Z",
    ]);
  });
});

describe("generateOccurrences, monthly_nth_weekday", () => {
  it("finds the 1st Saturday of each month", () => {
    const out = generateOccurrences(
      chicago({
        cadence: "monthly_nth_weekday",
        dayOfWeek: 6,
        nthWeek: 1,
        startTimeOfDay: "08:00",
        startDate: "2026-01-01",
      }),
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-04-01T00:00:00Z")
    );
    expect(out.map((o) => o.start.toISOString())).toEqual([
      "2026-01-03T14:00:00.000Z",
      "2026-02-07T14:00:00.000Z",
      "2026-03-07T14:00:00.000Z",
    ]);
  });

  it("skips months without a 5th occurrence", () => {
    const out = generateOccurrences(
      chicago({
        cadence: "monthly_nth_weekday",
        dayOfWeek: 5, // Friday
        nthWeek: 5,
        startDate: "2026-01-01",
      }),
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-04-01T00:00:00Z")
    );
    // Jan 2026 has five Fridays (Jan 30); Feb and Mar have four.
    expect(out.map((o) => o.start.toISOString())).toEqual([
      "2026-01-30T12:00:00.000Z",
    ]);
  });

  it("throws on monthly with null nthWeek instead of guessing", () => {
    expect(() =>
      generateOccurrences(
        chicago({ cadence: "monthly_nth_weekday", nthWeek: null }),
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-02-01T00:00:00Z")
      )
    ).toThrow(/nthWeek/);
  });
});

describe("previewOccurrences", () => {
  it("returns the next N start instants", () => {
    const dates = previewOccurrences(chicago(), new Date("2026-02-01T00:00:00Z"), 3);
    expect(dates.map((d) => d.toISOString())).toEqual([
      "2026-02-03T12:00:00.000Z",
      "2026-02-10T12:00:00.000Z",
      "2026-02-17T12:00:00.000Z",
    ]);
  });
});

describe("localDateKey / excludeOccupiedDays", () => {
  it("maps an instant to its Chicago calendar day", () => {
    // 2026-02-04T02:00Z is 8:00 PM Feb 3 in Chicago.
    expect(localDateKey(new Date("2026-02-04T02:00:00Z"), "America/Chicago")).toBe(
      Date.UTC(2026, 1, 3)
    );
  });

  it("drops occurrences whose local day already has an instance", () => {
    const occurrences = generateOccurrences(
      chicago(),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-18T00:00:00Z")
    ); // Feb 3, 10, 17
    // Existing instance at a shifted time, late evening Feb 10 Chicago:
    const kept = excludeOccupiedDays(
      occurrences,
      [new Date("2026-02-11T02:30:00Z")], // = Feb 10, 8:30 PM Chicago
      "America/Chicago"
    );
    expect(kept.map((o) => o.start.toISOString())).toEqual([
      "2026-02-03T12:00:00.000Z",
      "2026-02-17T12:00:00.000Z",
    ]);
  });

  it("returns everything when nothing is occupied", () => {
    const occurrences = generateOccurrences(
      chicago(),
      new Date("2026-02-01T00:00:00Z"),
      new Date("2026-02-11T00:00:00Z")
    );
    expect(excludeOccupiedDays(occurrences, [], "America/Chicago")).toEqual(
      occurrences
    );
  });
});

describe("cadenceLabel", () => {
  it("labels every cadence in plain words", () => {
    expect(cadenceLabel({ cadence: "weekly", dayOfWeek: 2, nthWeek: null })).toBe("Every Tuesday");
    expect(cadenceLabel({ cadence: "biweekly", dayOfWeek: 4, nthWeek: null })).toBe("Every other Thursday");
    expect(cadenceLabel({ cadence: "monthly_nth_weekday", dayOfWeek: 6, nthWeek: 1 })).toBe("Monthly · 1st Saturday");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './series'` (or equivalent resolve error) for every suite.

- [ ] **Step 4: Implement the module**

Create `src/lib/events/series.ts`:

```ts
/**
 * Pure recurrence math for gathering series. No DB, no I/O.
 *
 * All wall-clock fields (startTimeOfDay, startDate) are local to
 * `timezone`; every returned Date is a UTC instant. DST is handled by
 * TZDate: "6:00 AM in Chicago" resolves to the correct instant on both
 * sides of a transition.
 */
import { TZDate } from "@date-fns/tz";

export type SeriesCadence = "weekly" | "biweekly" | "monthly_nth_weekday";

export interface SeriesPattern {
  cadence: SeriesCadence;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** 1..5, monthly_nth_weekday only */
  nthWeek: number | null;
  /** "HH:mm", 24-hour, local to `timezone` */
  startTimeOfDay: string;
  durationMinutes: number | null;
  /** IANA zone, e.g. "America/Chicago" */
  timezone: string;
  /** "yyyy-MM-dd" — the series may not occur before this local date */
  startDate: string;
}

export interface Occurrence {
  start: Date;
  end: Date | null;
}

const DAY_MS = 86_400_000;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "yyyy-MM-dd" → UTC-midnight ms key. Pure calendar math, no zones. */
function parseDateKey(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid startDate: ${s}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** The calendar date (in tz) containing the instant, as a UTC-midnight ms key. */
export function localDateKey(instant: Date, timezone: string): number {
  const local = TZDate.tz(timezone, instant.getTime());
  return Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
}

/**
 * Every occurrence of the pattern with `from <= start < to`, never
 * before `startDate`. Scans calendar days; cheap for horizons of weeks.
 */
export function generateOccurrences(
  pattern: SeriesPattern,
  from: Date,
  to: Date
): Occurrence[] {
  if (to.getTime() <= from.getTime()) return [];
  if (pattern.cadence === "monthly_nth_weekday" && pattern.nthWeek == null) {
    throw new Error("monthly_nth_weekday requires nthWeek");
  }

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(pattern.startTimeOfDay);
  if (!timeMatch) throw new Error(`Invalid startTimeOfDay: ${pattern.startTimeOfDay}`);
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);

  const startKey = parseDateKey(pattern.startDate);
  // Scan one day either side: a UTC instant can land on the previous or
  // next calendar day in the series timezone.
  const scanStart = Math.max(startKey, localDateKey(from, pattern.timezone) - DAY_MS);
  const scanEnd = localDateKey(to, pattern.timezone) + DAY_MS;

  // Biweekly anchor: first matching weekday on/after startDate. Keys at
  // or past scanStart that match the weekday are always >= anchorKey.
  let anchorKey = startKey;
  while (new Date(anchorKey).getUTCDay() !== pattern.dayOfWeek) anchorKey += DAY_MS;

  const out: Occurrence[] = [];
  for (let key = scanStart; key <= scanEnd; key += DAY_MS) {
    const day = new Date(key);
    if (day.getUTCDay() !== pattern.dayOfWeek) continue;
    if (
      pattern.cadence === "biweekly" &&
      ((key - anchorKey) / DAY_MS) % 14 !== 0
    )
      continue;
    if (
      pattern.cadence === "monthly_nth_weekday" &&
      Math.ceil(day.getUTCDate() / 7) !== pattern.nthWeek
    )
      continue;

    const local = TZDate.tz(
      pattern.timezone,
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      hh,
      mm
    );
    const start = new Date(local.getTime());
    if (start.getTime() < from.getTime() || start.getTime() >= to.getTime()) continue;

    out.push({
      start,
      end: pattern.durationMinutes
        ? new Date(start.getTime() + pattern.durationMinutes * 60_000)
        : null,
    });
  }
  return out;
}

/** Next `count` start instants from `from` (400-day search window). */
export function previewOccurrences(
  pattern: SeriesPattern,
  from: Date,
  count: number
): Date[] {
  const to = new Date(from.getTime() + 400 * DAY_MS);
  return generateOccurrences(pattern, from, to)
    .slice(0, count)
    .map((o) => o.start);
}

/**
 * Drop generated occurrences whose local calendar day already holds an
 * existing instance. Keeps a shifted-time regeneration from
 * double-booking a day that has a detached, photographed, or cancelled
 * instance on it.
 */
export function excludeOccupiedDays(
  occurrences: Occurrence[],
  existingStarts: Date[],
  timezone: string
): Occurrence[] {
  if (existingStarts.length === 0) return occurrences;
  const occupied = new Set(existingStarts.map((d) => localDateKey(d, timezone)));
  return occurrences.filter((o) => !occupied.has(localDateKey(o.start, timezone)));
}

/** Plain-words label: "Every Tuesday", "Monthly · 1st Saturday". */
export function cadenceLabel(
  p: Pick<SeriesPattern, "cadence" | "dayOfWeek" | "nthWeek">
): string {
  const day = DAY_NAMES[p.dayOfWeek] ?? "";
  if (p.cadence === "weekly") return `Every ${day}`;
  if (p.cadence === "biweekly") return `Every other ${day}`;
  const nth = ["1st", "2nd", "3rd", "4th", "5th"][(p.nthWeek ?? 1) - 1];
  return `Monthly · ${nth} ${day}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites in `src/lib/events/series.test.ts` green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/events/series.ts src/lib/events/series.test.ts
git commit -m "feat(events): pure DST-safe recurrence math for gathering series"
```

---

### Task 2: Schema + migration 0014

**Files:**
- Modify: `src/db/schema.ts` (events block is at lines ~505–542)
- Create: `drizzle/0014_event_series.sql`

**Interfaces:**
- Consumes: existing `groups`, `users` tables (defined earlier in schema.ts).
- Produces: `eventSeries` table export; `events.seriesId`, `events.isCancelled`, `events.isDetached` columns; unique index `events_series_start_unique` on `(series_id, start_time)` (required by Task 3's `onConflictDoNothing` target).

- [ ] **Step 1: Add the `eventSeries` table to `src/db/schema.ts`**

Insert immediately after the `// Events` banner comment (the `// ====` block titled `Events`, before `export const events`):

```ts
/**
 * A recurring gathering pattern (migration 0014). The materializer in
 * src/server/event-series.ts turns each active series into real `events`
 * rows 8 weeks ahead, so photos and recaps attach to specific dates.
 * Wall-clock fields (startTimeOfDay, startDate) are local to `timezone`.
 */
export const eventSeries = pgTable(
  "event_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").default(""),
    location: text("location").default(""),
    /** weekly | biweekly | monthly_nth_weekday */
    cadence: text("cadence").notNull(),
    /** 0 = Sunday … 6 = Saturday */
    dayOfWeek: integer("day_of_week").notNull(),
    /** 1..5, monthly_nth_weekday only */
    nthWeek: integer("nth_week"),
    /** "HH:mm" 24-hour, local to `timezone` */
    startTimeOfDay: text("start_time_of_day").notNull(),
    durationMinutes: integer("duration_minutes"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    /** "yyyy-MM-dd" — no occurrences before this local date */
    startDate: text("start_date").notNull(),
    eventType: text("event_type").default("weekly"),
    imageUrl: text("image_url").default(""),
    registrationUrl: text("registration_url").default(""),
    groupId: uuid("group_id").references(() => groups.id),
    /** Paused series keep their history but stop materializing. */
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("event_series_active_idx").on(table.active)]
);
```

- [ ] **Step 2: Add instance columns to `events` and deprecate the dead ones**

In the `events` table (NOT prayerRequests/resources/attendanceRecords — several tables share similar lines; work inside `export const events = pgTable(` only), change:

```ts
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrenceRule: text("recurrence_rule"),
```

to:

```ts
    /** @deprecated Dead column from the pre-series model; nothing writes
     *  it. Recurrence lives in event_series (migration 0014). */
    isRecurring: boolean("is_recurring").notNull().default(false),
    /** @deprecated See isRecurring. */
    recurrenceRule: text("recurrence_rule"),
```

Then insert the three new columns immediately BEFORE the `isPast` comment block (`/** Admin-controlled "this event is over" flag. Migration 0011 ...`), which is unique to the events table:

```ts
    /** Series this instance was materialized from (migration 0014).
     *  Null = one-time event. */
    seriesId: uuid("series_id").references(() => eventSeries.id, {
      onDelete: "set null",
    }),
    /** Admin cancelled just this date; the series keeps going. The row
     *  stays as a tombstone so the materializer never recreates the slot. */
    isCancelled: boolean("is_cancelled").notNull().default(false),
    /** Admin hand-edited this instance; series edits leave it alone. */
    isDetached: boolean("is_detached").notNull().default(false),
```

In the same events table's index list, change:

```ts
  (table) => [
    index("events_start_time_idx").on(table.startTime),
    index("events_group_idx").on(table.groupId),
    index("events_is_past_idx").on(table.isPast),
  ]
```

to:

```ts
  (table) => [
    index("events_start_time_idx").on(table.startTime),
    index("events_group_idx").on(table.groupId),
    index("events_is_past_idx").on(table.isPast),
    index("events_series_idx").on(table.seriesId),
    // Idempotent materialization: one instance per series per instant.
    // NULL series_id rows (one-time events) never conflict in Postgres.
    uniqueIndex("events_series_start_unique").on(table.seriesId, table.startTime),
  ]
```

- [ ] **Step 3: Write the migration**

Create `drizzle/0014_event_series.sql`:

```sql
-- Migration 0014: Recurring gathering series
--
-- `event_series` stores the pattern (every Tuesday, 6:00 AM Chicago).
-- The materializer inserts real `events` rows 8 weeks ahead so photos
-- and recaps stay attached to specific dates. `is_cancelled` rows are
-- tombstones: ON CONFLICT (series_id, start_time) DO NOTHING keeps the
-- cron from resurrecting a cancelled date.
--
-- Additive and re-run safe (the GH Action re-applies every file).
-- Apply: DATABASE_URL='...' node scripts/apply-neon-migration.mjs

CREATE TABLE IF NOT EXISTS "event_series" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text DEFAULT '',
  "location" text DEFAULT '',
  "cadence" text NOT NULL,
  "day_of_week" integer NOT NULL,
  "nth_week" integer,
  "start_time_of_day" text NOT NULL,
  "duration_minutes" integer,
  "timezone" text NOT NULL DEFAULT 'America/Chicago',
  "start_date" text NOT NULL,
  "event_type" text DEFAULT 'weekly',
  "image_url" text DEFAULT '',
  "registration_url" text DEFAULT '',
  "group_id" uuid REFERENCES "groups"("id"),
  "active" boolean NOT NULL DEFAULT true,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "event_series_active_idx" ON "event_series" ("active");

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "series_id" uuid REFERENCES "event_series"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "is_cancelled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_detached" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "events_series_idx" ON "events" ("series_id");
CREATE UNIQUE INDEX IF NOT EXISTS "events_series_start_unique" ON "events" ("series_id", "start_time");
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Apply the migration**

Run (DATABASE_URL comes from `.env.local`; the script re-applies older files too — "already exists" failures on 0000–0013 are expected and tolerated by design):

```bash
set -a && source .env.local && set +a && node scripts/apply-neon-migration.mjs
```

Expected: `0014_event_series.sql` statements all print `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/0014_event_series.sql
git commit -m "feat(events): event_series table + series columns on events (migration 0014)"
```

---

### Task 3: Materializer (thin DB layer)

**Files:**
- Create: `src/server/event-series.ts`

**Interfaces:**
- Consumes: `generateOccurrences`, `excludeOccupiedDays`, `type SeriesPattern`, `type SeriesCadence` from `@/lib/events/series`; `eventSeries`, `events` from `@/db/schema`.
- Produces (imported by Task 4 routes and Task 6 cron):
  - `patternFrom(row): SeriesPattern`
  - `ensureSeriesHorizon(seriesId?: string): Promise<{ created: number }>`
  - `removeCleanFutureInstances(seriesId: string, opts?: { keepCancelled?: boolean }): Promise<void>`
  - `regenerateFutureInstances(seriesId: string): Promise<{ created: number }>`
  - `propagateCosmetics(seriesId: string): Promise<void>`
  - `softDeleteSeries(seriesId: string): Promise<void>`
  - (`HORIZON_DAYS` is exported for documentation/tuning; no other task imports it.)

- [ ] **Step 1: Implement**

Create `src/server/event-series.ts`:

```ts
/**
 * Series materialization. Turns event_series patterns into real events
 * rows so the public calendar, gallery, and recaps all work on plain
 * dated events. Idempotent by construction:
 *  - inserts use ON CONFLICT (series_id, start_time) DO NOTHING;
 *  - any existing future instance (detached, photographed, or a
 *    cancelled tombstone) blocks its whole local calendar day via
 *    excludeOccupiedDays, so shifted-time regeneration cannot
 *    double-book a day.
 * The pure math lives (and is unit-tested) in src/lib/events/series.ts;
 * this file is a thin DB wrapper.
 */
import { db } from "@/db";
import { events, eventSeries } from "@/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  excludeOccupiedDays,
  generateOccurrences,
  type SeriesCadence,
  type SeriesPattern,
} from "@/lib/events/series";

/** How far ahead instances exist. 8 weeks. */
export const HORIZON_DAYS = 56;

type SeriesRow = typeof eventSeries.$inferSelect;

export function patternFrom(row: SeriesRow): SeriesPattern {
  return {
    cadence: row.cadence as SeriesCadence,
    dayOfWeek: row.dayOfWeek,
    nthWeek: row.nthWeek,
    startTimeOfDay: row.startTimeOfDay,
    durationMinutes: row.durationMinutes,
    timezone: row.timezone,
    startDate: row.startDate,
  };
}

/**
 * Insert any missing future instances for one series (or every active
 * series when no id is given). Safe to call repeatedly.
 */
export async function ensureSeriesHorizon(
  seriesId?: string
): Promise<{ created: number }> {
  const now = new Date();
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const conditions = [isNull(eventSeries.deletedAt), eq(eventSeries.active, true)];
  if (seriesId) conditions.push(eq(eventSeries.id, seriesId));
  const rows = await db
    .select()
    .from(eventSeries)
    .where(and(...conditions));

  let created = 0;
  for (const s of rows) {
    const existingFuture = await db
      .select({ startTime: events.startTime })
      .from(events)
      .where(and(eq(events.seriesId, s.id), gt(events.startTime, now)));

    const occurrences = excludeOccupiedDays(
      generateOccurrences(patternFrom(s), now, to),
      existingFuture.map((r) => r.startTime),
      s.timezone
    );
    if (occurrences.length === 0) continue;

    const inserted = await db
      .insert(events)
      .values(
        occurrences.map((o) => ({
          title: s.title,
          description: s.description ?? "",
          location: s.location ?? "",
          startTime: o.start,
          endTime: o.end,
          eventType: s.eventType ?? "weekly",
          imageUrl: s.imageUrl ?? "",
          registrationUrl: s.registrationUrl ?? "",
          groupId: s.groupId,
          seriesId: s.id,
          createdBy: s.createdBy,
        }))
      )
      .onConflictDoNothing({ target: [events.seriesId, events.startTime] })
      .returning({ id: events.id });
    created += inserted.length;
  }
  return { created };
}

/**
 * Delete future instances the admin has not touched: not detached, no
 * photos, no recap. Pattern edits clear cancelled tombstones too (the
 * edit dialog says so); pause keeps them (`keepCancelled`) so resume
 * does not resurrect cancelled dates.
 */
export async function removeCleanFutureInstances(
  seriesId: string,
  opts: { keepCancelled?: boolean } = {}
): Promise<void> {
  const conditions = [
    eq(events.seriesId, seriesId),
    gt(events.startTime, new Date()),
    eq(events.isDetached, false),
    sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) = 0`,
    sql`length(coalesce(${events.recap}, '')) = 0`,
  ];
  if (opts.keepCancelled) conditions.push(eq(events.isCancelled, false));
  await db.delete(events).where(and(...conditions));
}

/** Pattern changed: reset clean future instances and refill the horizon. */
export async function regenerateFutureInstances(
  seriesId: string
): Promise<{ created: number }> {
  await removeCleanFutureInstances(seriesId);
  return ensureSeriesHorizon(seriesId);
}

/** Content-only change: push it to future, untouched instances. */
export async function propagateCosmetics(seriesId: string): Promise<void> {
  const [s] = await db
    .select()
    .from(eventSeries)
    .where(eq(eventSeries.id, seriesId));
  if (!s) return;
  await db
    .update(events)
    .set({
      title: s.title,
      description: s.description ?? "",
      location: s.location ?? "",
      eventType: s.eventType ?? "weekly",
      imageUrl: s.imageUrl ?? "",
      registrationUrl: s.registrationUrl ?? "",
    })
    .where(
      and(
        eq(events.seriesId, seriesId),
        gt(events.startTime, new Date()),
        eq(events.isDetached, false)
      )
    );
}

/**
 * Retire a series: remove every future instance without photos and
 * without a recap (detached or cancelled included, matching the retire
 * dialog copy), detach the history (past gatherings keep their photos),
 * soft-delete the pattern.
 */
export async function softDeleteSeries(seriesId: string): Promise<void> {
  await db
    .delete(events)
    .where(
      and(
        eq(events.seriesId, seriesId),
        gt(events.startTime, new Date()),
        sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) = 0`,
        sql`length(coalesce(${events.recap}, '')) = 0`
      )
    );
  await db
    .update(events)
    .set({ seriesId: null })
    .where(eq(events.seriesId, seriesId));
  await db
    .update(eventSeries)
    .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
    .where(eq(eventSeries.id, seriesId));
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/event-series.ts
git commit -m "feat(events): idempotent series materializer with day-occupancy exclusion"
```

---

### Task 4: Admin series API

**Files:**
- Create: `src/app/api/admin/event-series/route.ts`
- Create: `src/app/api/admin/event-series/[id]/route.ts`

**Interfaces:**
- Consumes: Task 3 exports; `cadenceLabel`, `previewOccurrences`, `type SeriesCadence` from `@/lib/events/series`.
- Produces:
  - `GET /api/admin/event-series` → `{ series: AdminSeries[] }` where each item has `id,title,description,location,cadence,dayOfWeek,nthWeek,startTimeOfDay,durationMinutes,timezone,startDate,eventType,active,label,nextDates(ISO strings),instanceCount`.
  - `POST /api/admin/event-series` → 201 `{ series, instances, created }`; `instances` are `{ id,title,startTime,location,eventType,description }` ascending by startTime.
  - `PATCH /api/admin/event-series/[id]` → `{ series }`. Cosmetic changes always propagate; pattern changes regenerate; `active:false` clears clean future instances keeping cancelled tombstones; `active:true` refills.
  - `DELETE /api/admin/event-series/[id]` → `{ success: true }` (soft delete).

- [ ] **Step 1: Collection route**

Create `src/app/api/admin/event-series/route.ts`:

```ts
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { events, eventSeries, users } from "@/db/schema";
import { asc, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { ensureSeriesHorizon, patternFrom } from "@/server/event-series";
import {
  cadenceLabel,
  previewOccurrences,
  type SeriesCadence,
} from "@/lib/events/series";

const createSeriesSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(300).optional(),
    cadence: z.enum(["weekly", "biweekly", "monthly_nth_weekday"]),
    dayOfWeek: z.number().int().min(0).max(6),
    nthWeek: z.number().int().min(1).max(5).nullable().optional(),
    startTimeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
    timezone: z.string().min(1).max(64).default("America/Chicago"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    eventType: z.string().max(50).optional(),
    imageUrl: z.string().max(2000).optional(),
    registrationUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine((v) => v.cadence !== "monthly_nth_weekday" || v.nthWeek != null, {
    message: "nthWeek is required for monthly series",
    path: ["nthWeek"],
  });

async function requireAdmin(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId)
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId };
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const rows = await db
    .select({
      series: eventSeries,
      instanceCount: sql<number>`(
        select count(*)::int from events where series_id = ${eventSeries.id}
      )`,
    })
    .from(eventSeries)
    .where(isNull(eventSeries.deletedAt))
    .orderBy(desc(eventSeries.createdAt));

  const now = new Date();
  const series = rows.map(({ series: s, instanceCount }) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    location: s.location ?? "",
    cadence: s.cadence as SeriesCadence,
    dayOfWeek: s.dayOfWeek,
    nthWeek: s.nthWeek,
    startTimeOfDay: s.startTimeOfDay,
    durationMinutes: s.durationMinutes,
    timezone: s.timezone,
    startDate: s.startDate,
    eventType: s.eventType ?? "weekly",
    active: s.active,
    label: cadenceLabel({
      cadence: s.cadence as SeriesCadence,
      dayOfWeek: s.dayOfWeek,
      nthWeek: s.nthWeek,
    }),
    nextDates: s.active
      ? previewOccurrences(patternFrom(s), now, 5).map((d) => d.toISOString())
      : [],
    instanceCount,
  }));

  return NextResponse.json({ series });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const body = await req.json();
  const parsed = createSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const [series] = await db
    .insert(eventSeries)
    .values({
      title: d.title,
      description: d.description ?? "",
      location: d.location ?? "",
      cadence: d.cadence,
      dayOfWeek: d.dayOfWeek,
      nthWeek: d.nthWeek ?? null,
      startTimeOfDay: d.startTimeOfDay,
      durationMinutes: d.durationMinutes ?? null,
      timezone: d.timezone,
      startDate: d.startDate,
      eventType: d.eventType ?? "weekly",
      imageUrl: d.imageUrl ?? "",
      registrationUrl: d.registrationUrl ?? "",
      createdBy: gate.userId,
    })
    .returning();

  const { created } = await ensureSeriesHorizon(series.id);

  const instances = await db
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      location: events.location,
      eventType: events.eventType,
      description: events.description,
    })
    .from(events)
    .where(eq(events.seriesId, series.id))
    .orderBy(asc(events.startTime));

  return NextResponse.json({ series, instances, created }, { status: 201 });
}
```

- [ ] **Step 2: Item route**

Create `src/app/api/admin/event-series/[id]/route.ts` (note: NO `.refine` on the update schema — partial payloads are validated against the merged record in the handler):

```ts
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { eventSeries, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  ensureSeriesHorizon,
  propagateCosmetics,
  regenerateFutureInstances,
  removeCleanFutureInstances,
  softDeleteSeries,
} from "@/server/event-series";

const PATTERN_KEYS = [
  "cadence",
  "dayOfWeek",
  "nthWeek",
  "startTimeOfDay",
  "durationMinutes",
  "timezone",
  "startDate",
] as const;

const COSMETIC_KEYS = [
  "title",
  "description",
  "location",
  "eventType",
  "imageUrl",
  "registrationUrl",
] as const;

const updateSeriesSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  cadence: z.enum(["weekly", "biweekly", "monthly_nth_weekday"]).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  nthWeek: z.number().int().min(1).max(5).nullable().optional(),
  startTimeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().max(50).optional(),
  imageUrl: z.string().max(2000).optional(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
  active: z.boolean().optional(),
});

async function requireAdmin(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId)
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ series: row });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;

  // Validate the MERGED record: partial payloads must not leave a
  // monthly series without an nthWeek (the generator throws on it).
  const mergedCadence = d.cadence ?? existing.cadence;
  const mergedNth = d.nthWeek !== undefined ? d.nthWeek : existing.nthWeek;
  if (mergedCadence === "monthly_nth_weekday" && mergedNth == null) {
    return NextResponse.json(
      { error: "nthWeek is required for monthly series" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (d.title !== undefined) updates.title = d.title;
  if (d.description !== undefined) updates.description = d.description;
  if (d.location !== undefined) updates.location = d.location;
  if (d.cadence !== undefined) updates.cadence = d.cadence;
  if (d.dayOfWeek !== undefined) updates.dayOfWeek = d.dayOfWeek;
  if (d.nthWeek !== undefined) updates.nthWeek = d.nthWeek;
  if (d.startTimeOfDay !== undefined) updates.startTimeOfDay = d.startTimeOfDay;
  if (d.durationMinutes !== undefined) updates.durationMinutes = d.durationMinutes;
  if (d.timezone !== undefined) updates.timezone = d.timezone;
  if (d.startDate !== undefined) updates.startDate = d.startDate;
  if (d.eventType !== undefined) updates.eventType = d.eventType;
  if (d.imageUrl !== undefined) updates.imageUrl = d.imageUrl;
  if (d.registrationUrl !== undefined) updates.registrationUrl = d.registrationUrl;
  if (d.active !== undefined) updates.active = d.active;

  const [updated] = await db
    .update(eventSeries)
    .set(updates)
    .where(eq(eventSeries.id, id))
    .returning();

  const patternChanged = PATTERN_KEYS.some((k) => d[k] !== undefined);
  const cosmeticChanged = COSMETIC_KEYS.some((k) => d[k] !== undefined);

  // Cosmetics propagate no matter which branch runs next: surviving
  // (photographed/detached-content…) future instances must not keep a
  // stale title while regenerated siblings get the new one.
  if (cosmeticChanged) await propagateCosmetics(id);

  if (d.active === false) {
    await removeCleanFutureInstances(id, { keepCancelled: true });
  } else if (patternChanged) {
    await regenerateFutureInstances(id);
  } else if (d.active === true) {
    await ensureSeriesHorizon(id);
  }

  return NextResponse.json({ series: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(eventSeries)
    .where(and(eq(eventSeries.id, id), isNull(eventSeries.deletedAt)));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await softDeleteSeries(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Smoke the API against the dev server**

```bash
npm run dev &
sleep 8
curl -s http://localhost:3000/api/admin/event-series | head -c 200
```

Expected: `{"error":"Unauthorized"}` (admin gate works; authenticated flows are exercised in Task 10 through the browser).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/event-series
git commit -m "feat(events): admin series API with propagate/regenerate/pause semantics"
```

---

### Task 5: Series-instance guard rails on the existing event routes

**Files:**
- Modify: `src/app/api/admin/events/[id]/route.ts`
- Modify: `src/app/api/admin/events/route.ts` (GET list gains `seriesId` + `isCancelled` for Task 7's UI)

**Interfaces:**
- Consumes: `events.seriesId`, `events.isDetached`, `events.isCancelled` (Task 2).
- Produces: PATCH accepts `isCancelled: boolean`; rejects `startTime` changes on series instances only when the parsed instant actually differs; sets `isDetached` only when a sent content value differs from the stored row. The gallery editor's full-payload ISO autosave passes untouched saves through with no detach and no 400. Admin events GET list rows include `seriesId` and `isCancelled`.

- [ ] **Step 1: Extend the update schema**

In `src/app/api/admin/events/[id]/route.ts`, change:

```ts
  // Past-event additions (migration 0011)
  isPast: z.boolean().optional(),
```

to:

```ts
  // Past-event additions (migration 0011)
  isPast: z.boolean().optional(),
  // Series-instance addition (migration 0014)
  isCancelled: z.boolean().optional(),
```

- [ ] **Step 2: Add the guard rails in PATCH**

In the same file's `PATCH`, change:

```ts
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
```

to:

```ts
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db.select().from(events).where(eq(events.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Series instances cannot be moved to another instant. Identical
  // instants (the gallery editor round-trips ISO strings) pass through.
  if (existing.seriesId && parsed.data.startTime !== undefined) {
    const incoming = new Date(parsed.data.startTime).getTime();
    if (Number.isNaN(incoming) || incoming !== existing.startTime.getTime()) {
      return NextResponse.json(
        {
          error:
            "This gathering is part of a series. Cancel this date and create a one-time event instead of moving it.",
        },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = {};

  // Content edits detach a series instance so series edits leave it be.
  // Detach fires only when a sent value actually differs from the row;
  // photos, recap, isPast, and isCancelled never detach.
  if (existing.seriesId) {
    const str = (v: string | null | undefined) => v ?? "";
    const p = parsed.data;
    let contentChanged = false;
    if (p.title !== undefined && p.title !== existing.title) contentChanged = true;
    if (p.description !== undefined && str(p.description) !== str(existing.description)) contentChanged = true;
    if (p.location !== undefined && str(p.location) !== str(existing.location)) contentChanged = true;
    if (p.eventType !== undefined && str(p.eventType) !== str(existing.eventType)) contentChanged = true;
    if (p.registrationUrl !== undefined && str(p.registrationUrl) !== str(existing.registrationUrl)) contentChanged = true;
    if (p.maxAttendees !== undefined && (p.maxAttendees ?? null) !== existing.maxAttendees) contentChanged = true;
    if (p.endTime !== undefined) {
      const incomingEnd = p.endTime ? new Date(p.endTime).getTime() : null;
      const existingEnd = existing.endTime ? existing.endTime.getTime() : null;
      if (incomingEnd !== existingEnd) contentChanged = true;
    }
    if (contentChanged) updates.isDetached = true;
  }
  if (parsed.data.isCancelled !== undefined) {
    updates.isCancelled = parsed.data.isCancelled;
  }
```

- [ ] **Step 3: Expose series fields in the admin GET list**

In `src/app/api/admin/events/route.ts` `GET`, change:

```ts
      isPast: events.isPast,
      recap: events.recap,
```

to:

```ts
      isPast: events.isPast,
      recap: events.recap,
      seriesId: events.seriesId,
      isCancelled: events.isCancelled,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/admin/events/[id]/route.ts" src/app/api/admin/events/route.ts
git commit -m "feat(events): change-aware cancel/detach guard rails for series instances"
```

---

### Task 6: Daily cron

**Files:**
- Create: `src/app/api/cron/materialize-events/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `ensureSeriesHorizon` (Task 3); `CRON_SECRET` env var.
- Produces: `GET /api/cron/materialize-events` → `{ ok: true, created }`.

- [ ] **Step 1: Cron route**

Create `src/app/api/cron/materialize-events/route.ts` (auth helper copied from `src/app/api/cron/publish-scheduled-letters/route.ts`):

```ts
import { NextResponse } from "next/server";
import { ensureSeriesHorizon } from "@/server/event-series";

export const runtime = "nodejs";

/**
 * GET /api/cron/materialize-events
 *
 * Daily horizon top-up: every active series keeps 8 weeks of real
 * events rows ahead of it. Idempotent; safe to re-run any time.
 *
 * Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>. We also
 * accept ?key=<CRON_SECRET> for manual smoke tests from a browser.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured = nothing protects this endpoint, refuse.
    return false;
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { created } = await ensureSeriesHorizon();
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Register the cron**

In `vercel.json`, change:

```json
  "crons": [
    { "path": "/api/cron/purge", "schedule": "0 4 * * *" },
    { "path": "/api/cron/group-followup", "schedule": "0 * * * *" },
    { "path": "/api/cron/publish-scheduled-letters", "schedule": "*/15 * * * *" }
  ],
```

to:

```json
  "crons": [
    { "path": "/api/cron/purge", "schedule": "0 4 * * *" },
    { "path": "/api/cron/group-followup", "schedule": "0 * * * *" },
    { "path": "/api/cron/publish-scheduled-letters", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/materialize-events", "schedule": "30 4 * * *" }
  ],
```

- [ ] **Step 3: Verify locally**

With the dev server running:

```bash
set -a && source .env.local && set +a
curl -s "http://localhost:3000/api/cron/materialize-events?key=$CRON_SECRET"
curl -s "http://localhost:3000/api/cron/materialize-events"
```

Expected: first returns `{"ok":true,"created":0}` (no series yet); second returns `{"error":"Unauthorized"}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/materialize-events/route.ts vercel.json
git commit -m "feat(events): daily materialize-events cron"
```

---

### Task 7: Admin events page — Repeats-first dialog, live preview, cancel dates, SeriesPanel

**Files:**
- Create: `src/components/admin/next-dates-preview.tsx`
- Create: `src/app/(app)/admin/events/series-panel.tsx`
- Modify: `src/app/(app)/admin/events/page.tsx`

**Interfaces:**
- Consumes: Task 4 API routes; Task 5's `seriesId`/`isCancelled` in the GET list; `previewOccurrences`, `SeriesPattern`, `SeriesCadence` from `@/lib/events/series`.
- Produces: `NextDatesPreview({ pattern, className })` + `seriesPatternFromLocalStart(repeats, startLocal): SeriesPattern | null` (also used by Task 8); `SeriesPanel({ refreshSignal })`; the create dialog posts to `/api/admin/event-series` when Repeats ≠ none; the edit dialog diff-sends only changed fields; series instances get Cancel/Restore date actions.

- [ ] **Step 1: Shared preview component**

Create `src/components/admin/next-dates-preview.tsx`:

```tsx
"use client";

/**
 * Live "Next: …" preview for series create/edit forms. Pure math; the
 * instants come from previewOccurrences and render in the admin's
 * local clock, which matches the Central wall-time intent.
 */
import { format } from "date-fns";
import {
  previewOccurrences,
  type SeriesCadence,
  type SeriesPattern,
} from "@/lib/events/series";

/** Build a SeriesPattern from a Repeats choice + datetime-local value. */
export function seriesPatternFromLocalStart(
  repeats: string,
  startLocal: string
): SeriesPattern | null {
  if (repeats === "none" || !startLocal) return null;
  const d = new Date(startLocal);
  if (Number.isNaN(d.getTime())) return null;
  return {
    cadence: repeats as SeriesCadence,
    dayOfWeek: d.getDay(),
    nthWeek:
      repeats === "monthly_nth_weekday" ? Math.ceil(d.getDate() / 7) : null,
    startTimeOfDay: startLocal.slice(11, 16),
    durationMinutes: null,
    timezone: "America/Chicago",
    startDate: startLocal.slice(0, 10),
  };
}

export function NextDatesPreview({
  pattern,
  className,
}: {
  pattern: SeriesPattern | null;
  className?: string;
}) {
  if (!pattern) return null;
  let dates: Date[] = [];
  try {
    dates = previewOccurrences(pattern, new Date(), 5);
  } catch {
    return null;
  }
  if (dates.length === 0) return null;
  return (
    <p className={className}>
      Next: {dates.map((d) => format(d, "EEE MMM d, h:mm a")).join(" · ")}
    </p>
  );
}
```

- [ ] **Step 2: Create the SeriesPanel component**

Create `src/app/(app)/admin/events/series-panel.tsx`:

```tsx
"use client";

/**
 * Recurring-series manager for /admin/events. Lists every live series
 * with its next dates; pause/resume, edit, or retire. Pattern edits
 * regenerate future instances server-side (the API decides; this
 * component only sends changed fields).
 */
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { NextDatesPreview } from "@/components/admin/next-dates-preview";
import type { SeriesPattern } from "@/lib/events/series";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const EVENT_TYPES = ["weekly", "monthly", "quarterly", "annual", "conference"];
const NTH_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

type Cadence = "weekly" | "biweekly" | "monthly_nth_weekday";

export type AdminSeries = {
  id: string;
  title: string;
  description: string;
  location: string;
  cadence: Cadence;
  dayOfWeek: number;
  nthWeek: number | null;
  startTimeOfDay: string;
  durationMinutes: number | null;
  timezone: string;
  startDate: string;
  eventType: string;
  active: boolean;
  label: string;
  nextDates: string[];
  instanceCount: number;
};

export function SeriesPanel({ refreshSignal }: { refreshSignal: number }) {
  const [series, setSeries] = useState<AdminSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminSeries | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/event-series");
    const data = await res.json();
    setSeries(data.series ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal]);

  async function toggleActive(s: AdminSeries) {
    setBusy(true);
    await fetch(`/api/admin/event-series/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    setBusy(false);
    refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setBusy(true);
    await fetch(`/api/admin/event-series/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setBusy(false);
    refresh();
  }

  if (loading)
    return <p className="text-sm text-muted-foreground">Loading series...</p>;
  if (series.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recurring series
      </h2>
      {series.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="font-medium truncate">{s.title}</h3>
                <Badge variant={s.active ? "default" : "secondary"}>
                  {s.active ? s.label : "Paused"}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Next:{" "}
                  {s.nextDates.length > 0
                    ? s.nextDates
                        .map((d) => format(new Date(d), "MMM d"))
                        .join(", ")
                    : "none scheduled"}
                </span>
                <span>{s.instanceCount} on the calendar</span>
                {s.location && <span>{s.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => toggleActive(s)}
              >
                {s.active ? "Pause" : "Resume"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(s.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <SeriesEditDialog
          series={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Retire Series"
        description="Future dates without photos or recaps are removed. Past gatherings and their photos stay."
        confirmLabel="Retire"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={busy}
      />
    </div>
  );
}

function SeriesEditDialog({
  series,
  onClose,
  onSaved,
}: {
  series: AdminSeries;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description);
  const [location, setLocation] = useState(series.location);
  const [cadence, setCadence] = useState<Cadence>(series.cadence);
  const [dayOfWeek, setDayOfWeek] = useState(String(series.dayOfWeek));
  const [nthWeek, setNthWeek] = useState(String(series.nthWeek ?? 1));
  const [startTimeOfDay, setStartTimeOfDay] = useState(series.startTimeOfDay);
  const [durationMinutes, setDurationMinutes] = useState(
    series.durationMinutes?.toString() ?? ""
  );
  const [startDate, setStartDate] = useState(series.startDate);
  const [eventType, setEventType] = useState(series.eventType);
  const [saving, setSaving] = useState(false);

  const previewPattern: SeriesPattern = {
    cadence,
    dayOfWeek: Number(dayOfWeek),
    nthWeek: cadence === "monthly_nth_weekday" ? Number(nthWeek) : null,
    startTimeOfDay,
    durationMinutes: durationMinutes ? Number(durationMinutes) : null,
    timezone: series.timezone,
    startDate,
  };

  async function save() {
    setSaving(true);
    // Send only what changed; the server regenerates future instances
    // only when a pattern field is present.
    const payload: Record<string, unknown> = {};
    if (title !== series.title) payload.title = title;
    if (description !== series.description) payload.description = description;
    if (location !== series.location) payload.location = location;
    if (cadence !== series.cadence) payload.cadence = cadence;
    if (Number(dayOfWeek) !== series.dayOfWeek)
      payload.dayOfWeek = Number(dayOfWeek);
    const nth = cadence === "monthly_nth_weekday" ? Number(nthWeek) : null;
    if (nth !== series.nthWeek) payload.nthWeek = nth;
    if (startTimeOfDay !== series.startTimeOfDay)
      payload.startTimeOfDay = startTimeOfDay;
    const dur = durationMinutes ? Number(durationMinutes) : null;
    if (dur !== series.durationMinutes) payload.durationMinutes = dur;
    if (startDate !== series.startDate) payload.startDate = startDate;
    if (eventType !== series.eventType) payload.eventType = eventType;

    if (Object.keys(payload).length > 0) {
      const res = await fetch(`/api/admin/event-series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSaving(false);
        alert("Couldn't save the series. Check the fields and try again.");
        return;
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Repeats</label>
              <Select
                value={cadence}
                onValueChange={(v) => setCadence(v as Cadence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every other week</SelectItem>
                  <SelectItem value="monthly_nth_weekday">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Day</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {cadence === "monthly_nth_weekday" && (
            <div>
              <label className="text-sm font-medium">Which week</label>
              <Select value={nthWeek} onValueChange={setNthWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NTH_LABELS.map((label, i) => (
                    <SelectItem key={label} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start time</label>
              <Input
                type="time"
                value={startTimeOfDay}
                onChange={(e) => setStartTimeOfDay(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="Leave empty for open-ended"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Starts on/after</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Event type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <NextDatesPreview
            pattern={previewPattern}
            className="text-xs text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Changing the schedule resets future dates that have no photos or
            recaps, including cancelled ones.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire the events page**

In `src/app/(app)/admin/events/page.tsx`:

(a) Add imports after the existing import block (below the `Select` import):

```ts
import { SeriesPanel } from "./series-panel";
import {
  NextDatesPreview,
  seriesPatternFromLocalStart,
} from "@/components/admin/next-dates-preview";
```

(b) Extend the `EventItem` type: after the line `isRecurring: boolean;` context — locate the type's `rsvpCount: number;` line and add before the closing brace:

```ts
  seriesId: string | null;
  isCancelled: boolean;
```

(c) Above the component (after the `typeColors` const), add:

```ts
// Admin inputs are Central-time wall clock; the series stores the zone.
const REPEAT_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every other week" },
  { value: "monthly_nth_weekday", label: "Monthly (same weekday)" },
];
```

(d) Add state after the line `const [saving, setSaving] = useState(false);`:

```ts
  // "none" | "weekly" | "biweekly" | "monthly_nth_weekday"
  const [formRepeats, setFormRepeats] = useState("none");
  const [seriesRefresh, setSeriesRefresh] = useState(0);
  // Snapshot of the form at openEdit time; handleSave diff-sends only
  // changed fields so unchanged local datetimes never get re-parsed
  // server-side (and series instances never falsely detach).
  const [editSnapshot, setEditSnapshot] = useState<Record<string, string> | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EventItem | null>(null);
```

(e) In `openCreate()`, after `setFormRegUrl("");` add:

```ts
    setFormRepeats("none");
    setEditSnapshot(null);
```

(f) In `openEdit(ev)`, after `setFormRegUrl(ev.registrationUrl ?? "");` add:

```ts
    setFormRepeats("none");
    setEditSnapshot({
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      startTime: ev.startTime
        ? format(new Date(ev.startTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      endTime: ev.endTime
        ? format(new Date(ev.endTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      eventType: ev.eventType ?? "weekly",
      maxAttendees: ev.maxAttendees?.toString() ?? "",
      registrationUrl: ev.registrationUrl ?? "",
    });
```

(g) Replace the whole `handleSave` function with:

```ts
  async function handleSave() {
    if (!formTitle.trim() || !formStartTime) return;
    setSaving(true);

    let res: Response;
    if (!editingId && formRepeats !== "none") {
      // Recurring: derive the pattern from the first gathering's
      // datetime-local value (interpreted as Central wall clock).
      const startLocal = new Date(formStartTime);
      const durationMinutes =
        formEndTime && new Date(formEndTime) > startLocal
          ? Math.round(
              (new Date(formEndTime).getTime() - startLocal.getTime()) / 60000
            )
          : null;
      res = await fetch("/api/admin/event-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          location: formLocation,
          cadence: formRepeats,
          dayOfWeek: startLocal.getDay(),
          nthWeek:
            formRepeats === "monthly_nth_weekday"
              ? Math.ceil(startLocal.getDate() / 7)
              : null,
          startTimeOfDay: formStartTime.slice(11, 16),
          durationMinutes,
          timezone: "America/Chicago",
          startDate: formStartTime.slice(0, 10),
          eventType: formEventType,
          registrationUrl: formRegUrl,
        }),
      });
      setSeriesRefresh((n) => n + 1);
    } else if (editingId) {
      // Diff-send: only fields the admin actually changed.
      const current: Record<string, string> = {
        title: formTitle,
        description: formDesc,
        location: formLocation,
        startTime: formStartTime,
        endTime: formEndTime,
        eventType: formEventType,
        maxAttendees: formMaxAttendees,
        registrationUrl: formRegUrl,
      };
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(current)) {
        if (!editSnapshot || editSnapshot[key] !== value) {
          if (key === "endTime") payload.endTime = value || undefined;
          else if (key === "maxAttendees")
            payload.maxAttendees = value ? parseInt(value, 10) : null;
          else payload[key] = value;
        }
      }
      if (Object.keys(payload).length === 0) {
        setDialogOpen(false);
        setSaving(false);
        return;
      }
      res = await fetch(`/api/admin/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          location: formLocation,
          startTime: formStartTime,
          endTime: formEndTime || undefined,
          eventType: formEventType,
          maxAttendees: formMaxAttendees ? parseInt(formMaxAttendees, 10) : null,
          registrationUrl: formRegUrl,
        }),
      });
    }

    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: unknown };
      alert(typeof j.error === "string" ? j.error : "Couldn't save the event.");
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    setSaving(false);
    fetchEvents();
  }
```

(h) Add the cancel-date handler after `handleDelete`:

```ts
  async function handleCancelDate() {
    if (!cancelTarget) return;
    await fetch(`/api/admin/events/${cancelTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCancelled: !cancelTarget.isCancelled }),
    });
    setCancelTarget(null);
    fetchEvents();
  }
```

(i) Mount the panel. Immediately after the closing `</AdminPageHeader>` tag, add:

```tsx
      <SeriesPanel refreshSignal={seriesRefresh} />
```

(j) Repeats control goes FIRST in the create dialog (the one-time-vs-recurring question leads). Immediately after `<div className="space-y-4">` (the dialog body opener), add:

```tsx
            {!editingId && (
              <div>
                <label className="text-sm font-medium">Repeats</label>
                <Select value={formRepeats} onValueChange={setFormRepeats}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <NextDatesPreview
                  pattern={seriesPatternFromLocalStart(formRepeats, formStartTime)}
                  className="mt-1 text-xs text-muted-foreground"
                />
                {formRepeats !== "none" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dates are created 8 weeks ahead, Central time, and topped
                    up daily.
                  </p>
                )}
              </div>
            )}
```

(k) Series badges + cancel action in the list rows. In the row markup, change:

```tsx
                    <Badge
                      className={typeColors[ev.eventType ?? "weekly"] ?? "bg-gray-600"}
                    >
                      {ev.eventType ?? "weekly"}
                    </Badge>
```

to:

```tsx
                    <Badge
                      className={typeColors[ev.eventType ?? "weekly"] ?? "bg-gray-600"}
                    >
                      {ev.eventType ?? "weekly"}
                    </Badge>
                    {ev.seriesId && <Badge variant="outline">Series</Badge>}
                    {ev.isCancelled && (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
```

And in the row's action buttons, change:

```tsx
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(ev)}
                  >
```

to:

```tsx
                <div className="flex items-center gap-2 shrink-0">
                  {ev.seriesId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelTarget(ev)}
                    >
                      {ev.isCancelled ? "Restore date" : "Cancel date"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(ev)}
                  >
```

(l) Add the cancel ConfirmDialog next to the existing delete ConfirmDialog (after it, before the closing `</div>`):

```tsx
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={cancelTarget?.isCancelled ? "Restore This Date" : "Cancel This Date"}
        description={
          cancelTarget?.isCancelled
            ? "This date returns to the public calendar."
            : "This date comes off the public calendar. The series keeps going."
        }
        confirmLabel={cancelTarget?.isCancelled ? "Restore" : "Cancel date"}
        confirmVariant={cancelTarget?.isCancelled ? "default" : "destructive"}
        onConfirm={handleCancelDate}
        loading={false}
      />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in the browser**

With the dev server running, sign in as admin, open `/admin/events`, create "Tuesday Table", Repeats = Weekly (the preview under the select must show the next 5 Tuesdays live), next Tuesday 6:00 AM. Expected: dialog closes; the events list gains 8 dated instances each with a Series badge; the Recurring series panel shows "Tuesday Table · Every Tuesday". Edit one instance's description only, save, reopen: description changed, no error. Click "Cancel date" on one instance: Cancelled badge appears. Pause the series, instance count drops; Resume restores (the cancelled date must NOT come back).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/next-dates-preview.tsx "src/app/(app)/admin/events/series-panel.tsx" "src/app/(app)/admin/events/page.tsx"
git commit -m "feat(admin): series creation, live date preview, and cancel-date on /admin/events"
```

---

### Task 8: Gallery manager — recurring create, series badge, latest-gathering shortcuts

**Files:**
- Modify: `src/server/gallery.ts`
- Modify: `src/app/(app)/admin/gallery/page.tsx`
- Modify: `src/app/(app)/admin/gallery/manager.tsx`

**Interfaces:**
- Consumes: Task 4 POST endpoint; Task 7's `NextDatesPreview` + `seriesPatternFromLocalStart`; `events.seriesId`, `eventSeries.title`.
- Produces: admin gallery rows carry `seriesId`/`seriesTitle`; New Event form leads with a Repeats select + live preview; series instances show a brass "Series" mark; a shortcut strip opens the most recent past gathering of each series for photo upload (the spec's "photos default to the most recent past occurrence").

- [ ] **Step 1: Series fields in the admin gallery query**

In `src/server/gallery.ts`, change the import lines:

```ts
import { events } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
```

to:

```ts
import { events, eventSeries } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
```

Replace the whole `listAllEventsForAdminGallery` function with:

```ts
export async function listAllEventsForAdminGallery(): Promise<
  Array<{
    id: string;
    title: string;
    startTime: Date;
    location: string | null;
    eventType: string | null;
    description: string | null;
    photoCount: number;
    seriesId: string | null;
    seriesTitle: string | null;
  }>
> {
  try {
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        location: events.location,
        eventType: events.eventType,
        description: events.description,
        photoCount: sql<number>`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb))::int`,
        seriesId: events.seriesId,
        seriesTitle: eventSeries.title,
      })
      .from(events)
      .leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
      .orderBy(desc(events.startTime))
      .limit(400);
    return rows;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Thread the fields through the page boundary**

In `src/app/(app)/admin/gallery/page.tsx`, the `initial` prop is built from an explicit object literal ending with `photoCount: r.photoCount,`. Add after that line:

```ts
          seriesId: r.seriesId,
          seriesTitle: r.seriesTitle,
```

- [ ] **Step 3: Extend `EventRow` and the one-off create path in the manager**

In `src/app/(app)/admin/gallery/manager.tsx`, the `EventRow` interface ends with `photoCount: number;` (around line 40). Add two fields before the closing brace:

```ts
  seriesId: string | null;
  seriesTitle: string | null;
```

- [ ] **Step 4: Recurring branch in `handleCreate`**

Replace the whole `handleCreate` function with:

```ts
  async function handleCreate(input: {
    title: string;
    startTime: string;
    startTimeLocal: string;
    location: string;
    eventType: string;
    repeats: string;
  }) {
    if (input.repeats !== "none") {
      // Recurring: the series API materializes 8 weeks of instances.
      const startLocal = new Date(input.startTimeLocal);
      const res = await fetch("/api/admin/event-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          location: input.location || undefined,
          cadence: input.repeats,
          dayOfWeek: startLocal.getDay(),
          nthWeek:
            input.repeats === "monthly_nth_weekday"
              ? Math.ceil(startLocal.getDate() / 7)
              : null,
          startTimeOfDay: input.startTimeLocal.slice(11, 16),
          durationMinutes: null,
          timezone: "America/Chicago",
          startDate: input.startTimeLocal.slice(0, 10),
          eventType: input.eventType || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof j.error === "string" ? j.error : "Couldn't create series"
        );
      }
      const data = (await res.json()) as {
        series: { id: string; title: string };
        instances: Array<{
          id: string;
          title: string;
          startTime: string;
          location: string | null;
          eventType: string | null;
          description: string | null;
        }>;
      };
      const rows: EventRow[] = data.instances.map((ev) => ({
        id: ev.id,
        title: ev.title,
        startTime: ev.startTime,
        location: ev.location ?? "",
        eventType: ev.eventType ?? "",
        description: ev.description ?? "",
        photoCount: 0,
        seriesId: data.series.id,
        seriesTitle: data.series.title,
      }));
      setEvents((es) => [...rows, ...es]);
      setOpenId(rows[0]?.id ?? null);
      setCreating(false);
      return;
    }

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        startTime: input.startTime,
        location: input.location || undefined,
        eventType: input.eventType || undefined,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: unknown };
      throw new Error(
        typeof j.error === "string" ? j.error : "Couldn't create event"
      );
    }
    const data = (await res.json()) as {
      event: {
        id: string;
        title: string;
        startTime: string;
        location: string | null;
        eventType: string | null;
        description: string | null;
      };
    };
    const newRow: EventRow = {
      id: data.event.id,
      title: data.event.title,
      startTime: data.event.startTime,
      location: data.event.location ?? "",
      eventType: data.event.eventType ?? "",
      description: data.event.description ?? "",
      photoCount: 0,
      seriesId: null,
      seriesTitle: null,
    };
    setEvents((es) => [newRow, ...es]);
    setOpenId(newRow.id);
    setCreating(false);
  }
```

- [ ] **Step 5: Repeats-first select + preview in `NewEventForm`**

In `NewEventForm` (starts around line 341; this is the create form, NOT the byte-identical Type field inside `EventEditor` further down):

(a) Change the `onSubmit` prop type to:

```ts
  onSubmit: (input: {
    title: string;
    startTime: string;
    startTimeLocal: string;
    location: string;
    eventType: string;
    repeats: string;
  }) => Promise<void>;
```

(b) After `const [eventType, setEventType] = useState("");` add:

```ts
  const [repeats, setRepeats] = useState("none");
```

(c) In `submit()`, change the `onSubmit({...})` call to:

```ts
      await onSubmit({
        title: title.trim(),
        // datetime-local value is local time without zone. Convert to
        // ISO so the server `new Date()` interprets it correctly.
        startTime: new Date(startTime).toISOString(),
        startTimeLocal: startTime,
        location,
        eventType,
        repeats,
      });
```

(d) The Repeats field leads the form. Immediately after the grid opener `<div className="grid gap-3 md:grid-cols-2">` in `NewEventForm`, add as the FIRST field:

```tsx
        <Field label="Repeats">
          <select
            value={repeats}
            onChange={(e) => setRepeats(e.target.value)}
            className="h-9 w-full border border-stone/15 bg-iron/40 px-3 text-sm text-bone focus:border-brass focus:outline-none"
          >
            <option value="none" className="bg-iron text-bone">
              Does not repeat
            </option>
            <option value="weekly" className="bg-iron text-bone">
              Weekly
            </option>
            <option value="biweekly" className="bg-iron text-bone">
              Every other week
            </option>
            <option value="monthly_nth_weekday" className="bg-iron text-bone">
              Monthly (same weekday)
            </option>
          </select>
        </Field>
```

(e) Add the live preview. In `NewEventForm`, immediately BEFORE the `{error && (` block (unique to NewEventForm; add the import `import { NextDatesPreview, seriesPatternFromLocalStart } from "@/components/admin/next-dates-preview";` to the top of manager.tsx):

```tsx
      <NextDatesPreview
        pattern={seriesPatternFromLocalStart(repeats, startTime)}
        className="mt-3 text-[0.6875rem] text-stone/65"
      />
```

- [ ] **Step 6: Series mark + latest-gathering shortcuts**

(a) In the row meta paragraph (the `<p>` rendering date, location, and the `{ev.eventType && (...)}` fragment inside the row list), after the `{ev.eventType && (...)}` fragment add:

```tsx
                      {ev.seriesTitle && (
                        <>
                          <span>·</span>
                          <span className="uppercase tracking-wider text-brass">
                            Series
                          </span>
                        </>
                      )}
```

(b) Add `useMemo` to the react import at the top of manager.tsx (it currently imports `useState`, `useEffect`, `useRef` from "react").

(c) In `GalleryManager`, after the `const totalPhotos ...` / `const eventsWithPhotos ...` lines, add:

```ts
  // One shortcut per series: its most recent past gathering, so photos
  // from "last Tuesday" are one click away.
  const latestBySeries = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, EventRow>();
    for (const e of events) {
      if (!e.seriesId) continue;
      const t = new Date(e.startTime).getTime();
      if (t > now) continue;
      const cur = map.get(e.seriesId);
      if (!cur || t > new Date(cur.startTime).getTime()) map.set(e.seriesId, e);
    }
    return [...map.values()];
  }, [events]);
```

(d) Render the shortcut strip. Immediately after the closing `</div>` of the "Search + new event" block (`{/* Search + new event */}`), add:

```tsx
      {latestBySeries.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-[0.625rem] uppercase tracking-wider text-stone/55">
            Add photos from the latest gathering:
          </span>
          {latestBySeries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setOpenId(e.id)}
              className="lift inline-flex h-8 items-center gap-2 border border-brass/40 bg-brass/10 px-3 text-[0.6875rem] text-brass transition-colors hover:bg-brass/20"
            >
              {e.seriesTitle ?? e.title}
              <span className="text-brass/70">
                {format(new Date(e.startTime), "MMM d")}
              </span>
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 7: Typecheck + browser check**

Run: `npx tsc --noEmit` — expected: no errors.

In the browser at `/admin/gallery`: create "Tuesday Table" with Repeats = Weekly (preview shows the next 5 Tuesdays before you click create). Expected: 8 rows appear, each marked `· SERIES` in brass. Once an occurrence date has passed (or when testing against an existing series with past dates), the "Add photos from the latest gathering" strip shows one chip per series and clicking it opens that date's editor. Upload a photo and edit its caption: the autosave badge shows "saved", and the instance must NOT be detached (verify: edit the series title in `/admin/events`; the photographed instance's title still updates via propagate? No — photos live on it, but it is NOT detached, so the title DOES update. Confirm the title changed).

- [ ] **Step 8: Commit**

```bash
git add src/server/gallery.ts "src/app/(app)/admin/gallery/page.tsx" "src/app/(app)/admin/gallery/manager.tsx"
git commit -m "feat(admin): recurring series creation, series marks, and latest-gathering shortcuts in the gallery manager"
```

---

### Task 9: Public /events — series grouping + cancelled handling

**Files:**
- Modify: `src/app/(public)/events/page.tsx`
- Modify: `src/app/(public)/events/[slug]/page.tsx`

**Interfaces:**
- Consumes: `events.seriesId/isCancelled`, `eventSeries` (Task 2), `cadenceLabel` + `type SeriesCadence` (Task 1).
- Produces: upcoming list grouped one-card-per-series with an "Every Tuesday" mark and expandable further dates; cancelled instances hidden from both lists; cancelled notice on the detail page.

- [ ] **Step 1: Update imports and queries in `src/app/(public)/events/page.tsx`**

Change:

```ts
import { events } from "@/db/schema";
import { and, asc, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
```

to:

```ts
import { events, eventSeries } from "@/db/schema";
import { and, asc, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
import { cadenceLabel, type SeriesCadence } from "@/lib/events/series";
```

Replace `getUpcoming` with:

```ts
async function getUpcoming() {
  try {
    const now = new Date();
    return await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        eventType: events.eventType,
        imageUrl: events.imageUrl,
        registrationUrl: events.registrationUrl,
        seriesId: events.seriesId,
        seriesCadence: eventSeries.cadence,
        seriesDayOfWeek: eventSeries.dayOfWeek,
        seriesNthWeek: eventSeries.nthWeek,
      })
      .from(events)
      .leftJoin(eventSeries, eq(events.seriesId, eventSeries.id))
      .where(
        and(
          gte(events.startTime, now),
          eq(events.isPast, false),
          eq(events.isCancelled, false)
        )
      )
      .orderBy(asc(events.startTime))
      .limit(60);
  } catch {
    return [];
  }
}
```

In `getPast`, change the `.where(` block's outer `and(` to include the cancelled filter:

```ts
      .where(
        and(
          eq(events.isCancelled, false),
          or(eq(events.isPast, true), lt(events.endTime, new Date())),
          or(
            sql`length(coalesce(${events.recap}, '')) > 0`,
            sql`jsonb_array_length(coalesce(${events.photos}, '[]'::jsonb)) > 0`
          )
        )
      )
```

- [ ] **Step 2: Add the grouping helper**

After `getPast` (before `export default async function EventsPage`), add:

```ts
type UpcomingRow = Awaited<ReturnType<typeof getUpcoming>>[number];

type UpcomingItem =
  | { kind: "single"; row: UpcomingRow }
  | { kind: "series"; row: UpcomingRow; later: UpcomingRow[]; label: string };

/**
 * One card per series (its next date leads; the rest fold under it),
 * one-time gatherings as-is. Rows arrive sorted by startTime so the
 * first row seen for a series is its next date, and overall order
 * stays chronological.
 */
function groupUpcoming(rows: UpcomingRow[]): UpcomingItem[] {
  const bySeries = new Map<string, UpcomingRow[]>();
  const items: UpcomingItem[] = [];
  for (const row of rows) {
    if (!row.seriesId) {
      items.push({ kind: "single", row });
      continue;
    }
    const bucket = bySeries.get(row.seriesId);
    if (bucket) {
      bucket.push(row);
      continue;
    }
    bySeries.set(row.seriesId, [row]);
    items.push({
      kind: "series",
      row,
      later: [],
      label: row.seriesCadence
        ? cadenceLabel({
            cadence: row.seriesCadence as SeriesCadence,
            dayOfWeek: row.seriesDayOfWeek ?? 0,
            nthWeek: row.seriesNthWeek,
          })
        : "Recurring",
    });
  }
  return items.map((it) =>
    it.kind === "series"
      ? { ...it, later: (bySeries.get(it.row.seriesId as string) ?? []).slice(1) }
      : it
  );
}
```

- [ ] **Step 3: Render the grouped list**

In `EventsPage`, change:

```ts
  const [upcoming, past] = await Promise.all([getUpcoming(), getPast()]);
```

to:

```ts
  const [upcoming, past] = await Promise.all([getUpcoming(), getPast()]);
  const upcomingItems = groupUpcoming(upcoming);
```

Replace the whole upcoming `<ul>` block (from `{upcoming.length > 0 ? (` through the `) : (` right before the empty-state `<div>` — the empty-state `<div>` and its closing stay untouched) with:

```tsx
          {upcomingItems.length > 0 ? (
            <ul className="mt-12 divide-y divide-iron/10 border-y border-iron/10">
              {upcomingItems.map((item) => {
                const ev = item.row;
                const start = new Date(ev.startTime);
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="group grid gap-4 py-8 transition-colors hover:bg-background/[0.02] md:grid-cols-[140px_1fr_auto] md:items-start md:gap-8"
                    >
                      <div className="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
                        <span className="font-display text-3xl font-semibold text-brass">
                          {format(start, "MMM").toUpperCase()}
                        </span>
                        <span className="font-display text-3xl font-semibold text-iron">
                          {format(start, "d")}
                        </span>
                      </div>
                      <div>
                        <span className="flex flex-wrap items-center gap-3">
                          {item.kind === "series" && (
                            <span className="section-mark text-brass">
                              {item.label}
                            </span>
                          )}
                          {ev.eventType && (
                            <span className="section-mark text-iron/50">
                              {ev.eventType}
                            </span>
                          )}
                        </span>
                        <h3 className="mt-2 font-display text-xl font-semibold text-iron group-hover:text-brass md:text-2xl">
                          {ev.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-iron/60">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="clock" size={14} />
                            {format(start, "EEEE · h:mm a")}
                          </span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="map-pin" size={14} />
                              {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-3 max-w-prose text-iron/70">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <span className="section-mark text-iron/40 group-hover:text-brass">
                        Details →
                      </span>
                    </Link>
                    {item.kind === "series" && item.later.length > 0 && (
                      <details className="-mt-4 pb-6 pl-4 md:pl-[172px]">
                        <summary className="cursor-pointer list-none section-mark text-brass/80 transition-colors hover:text-brass">
                          + {item.later.length} more date
                          {item.later.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-3 space-y-2 text-sm text-iron/60">
                          {item.later.map((r) => (
                            <li key={r.id}>
                              <Link
                                href={`/events/${r.id}`}
                                className="transition-colors hover:text-brass"
                              >
                                {format(new Date(r.startTime), "EEEE, MMMM d · h:mm a")}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
```

- [ ] **Step 4: Cancelled notice on the detail page**

In `src/app/(public)/events/[slug]/page.tsx`, after the closing `</h1>` of the title (the `{ev.title}` heading), add:

```tsx
          {ev.isCancelled && (
            <p className="mt-6 inline-flex items-center gap-2 border border-oxblood/50 bg-oxblood/15 px-3 py-1.5 text-sm text-foreground">
              This date is cancelled. Check the calendar for what is next.
            </p>
          )}
```

- [ ] **Step 5: Typecheck + browser check**

Run: `npx tsc --noEmit` — expected: no errors.

In the browser at `/events` (with the Task 7 "Tuesday Table" series live): expected one "Tuesday Table" card marked "Every Tuesday" with its next date leading and "+ 7 more dates" folding open; one-time events unchanged. Cancel one instance via the admin Cancel-date button, reload: that date is gone from the fold; its direct URL shows the cancelled notice.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/events/page.tsx" "src/app/(public)/events/[slug]/page.tsx"
git commit -m "feat(events): public calendar groups series instances, hides cancelled dates"
```

---

### Task 10: Full verification + docs

**Files:**
- Modify: `CLAUDE.md` (Commands + Vercel cron sections)

- [ ] **Step 1: Static gates**

```bash
npm test          # expected: all Vitest suites pass
npx tsc --noEmit  # expected: no errors
npm run lint      # expected: no new errors (pre-existing warnings tolerated)
npm run build     # expected: production build succeeds
```

- [ ] **Step 2: End-to-end smoke in the browser (dev server, signed in as admin)**

1. `/admin/events` → create "Tuesday Table", next Tuesday 6:00 AM, Repeats Weekly; live preview shows 5 Tuesdays before saving → series panel shows "Every Tuesday", 8 instances with Series badges.
2. `/events` → one Tuesday Table card, "Every Tuesday" mark, "+ 7 more dates" expands.
3. `/admin/gallery` → Tuesday Table rows carry the brass SERIES mark; open a date, upload a photo, caption it → autosave shows "saved"; `/gallery` (admin-only photo wall, viewed while signed in) shows it.
4. Detach check: in `/admin/events`, edit ONLY the description of one future instance → saves without error. Then edit the series title in the panel → all future instances update EXCEPT the description-edited one (detached).
5. Cancel-date: click "Cancel date" on one future instance → Cancelled badge; `/events` no longer lists that date; its URL shows the cancelled notice. Pause then Resume the series → the cancelled date must NOT return.
6. Series edit: change start time to 6:30 AM in the panel → future clean instances move to 6:30; the photographed instance keeps its time AND its calendar day is not double-booked.
7. Cron: `curl "http://localhost:3000/api/cron/materialize-events?key=$CRON_SECRET"` twice → second run returns `{"ok":true,"created":0}` (idempotent).
8. Retire the series → future dates gone, past date with photos still on `/events` past section and the admin-only `/gallery` wall.

- [ ] **Step 3: Update CLAUDE.md**

In the `## Commands` block, add after the `npm run build` line:

```bash
npm test             # vitest — src/lib unit tests (recurrence math)
```

In the `## Vercel` cron bullet, append to the cron list sentence: `, /api/cron/materialize-events (daily 4:30am, tops up 8-week series horizon)`.

- [ ] **Step 4: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: test command + materialize-events cron"
git push origin main
```

Pushing `drizzle/0014_event_series.sql` triggers the migration GH Action against production; the Vercel deploy picks up the new cron from `vercel.json`.

- [ ] **Step 5: Post-deploy check**

On the production site: `/admin/events` shows the series panel; `/events` shows the series card. Vercel dashboard → Cron: `materialize-events` listed.
