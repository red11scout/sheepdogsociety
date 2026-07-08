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
