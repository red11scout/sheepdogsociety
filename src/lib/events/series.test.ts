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
