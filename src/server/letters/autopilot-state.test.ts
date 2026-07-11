import { describe, expect, it } from "vitest";
import { computeBlockDates } from "./autopilot-state";

const DAY_MS = 86400000;

describe("computeBlockDates", () => {
  it("null anchor: first date is exactly 7 days after now, at the publish hour", () => {
    // now is already at the 6am-Central publish instant (12:00 UTC,
    // CST-conservative), so the +7d arithmetic lands exactly on it.
    const now = new Date("2026-07-10T12:00:00.000Z");
    const dates = computeBlockDates(null, now);
    expect(dates).toHaveLength(4);
    expect(dates[0].getTime()).toBe(now.getTime() + 7 * DAY_MS);
    expect(dates[0].toISOString()).toBe("2026-07-17T12:00:00.000Z");
  });

  it("non-null anchor: dates land at anchor +7/+14/+21/+28 days", () => {
    const anchor = new Date("2026-06-01T12:00:00.000Z");
    const now = new Date("2026-06-01T15:00:00.000Z"); // ignored when anchor is present
    const dates = computeBlockDates(anchor, now);
    expect(dates[0].getTime()).toBe(anchor.getTime() + 7 * DAY_MS);
    expect(dates[1].getTime()).toBe(anchor.getTime() + 14 * DAY_MS);
    expect(dates[2].getTime()).toBe(anchor.getTime() + 21 * DAY_MS);
    expect(dates[3].getTime()).toBe(anchor.getTime() + 28 * DAY_MS);
  });

  it("dates are strictly ascending, exactly one week apart", () => {
    const now = new Date("2026-03-15T09:23:00.000Z"); // not aligned to the publish hour
    const dates = computeBlockDates(null, now);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
      expect(dates[i].getTime() - dates[i - 1].getTime()).toBe(7 * DAY_MS);
    }
  });

  it("every date lands at the 6am-Central publish hour (12:00 UTC, CST-conservative)", () => {
    const now = new Date("2026-09-01T00:00:00.000Z");
    const dates = computeBlockDates(null, now);
    for (const d of dates) {
      expect(d.getUTCHours()).toBe(12);
      expect(d.getUTCMinutes()).toBe(0);
      expect(d.getUTCSeconds()).toBe(0);
    }
  });
});
