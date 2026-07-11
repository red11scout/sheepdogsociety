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
