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

/**
 * Plain shifted-Date version (per brief: "Use the plain version"). Shifts
 * the UTC instant back 6 hours (the fixed CST-conservative convention
 * computeScheduledFor already uses) and reads UTC date parts.
 */
export function chicagoDateParts(utc: Date): { year: number; month: number; day: number } {
  const shifted = new Date(utc.getTime() - 6 * 3600 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}
