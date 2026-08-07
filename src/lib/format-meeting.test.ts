import { describe, expect, it } from "vitest";
import { formatMeetingTime, joinPlace } from "./format-meeting";

describe("formatMeetingTime", () => {
  it("normalizes the formats seen in production data", () => {
    expect(formatMeetingTime("7AM")).toBe("7:00 AM");
    expect(formatMeetingTime("5:00AM")).toBe("5:00 AM");
    expect(formatMeetingTime("6:00pm")).toBe("6:00 PM");
    expect(formatMeetingTime(" 6:30 a.m. ")).toBe("6:30 AM");
  });
  it("passes through what it cannot parse", () => {
    expect(formatMeetingTime("sunrise")).toBe("sunrise");
    expect(formatMeetingTime(null)).toBe("");
  });
});

describe("joinPlace", () => {
  it("trims parts and drops blanks", () => {
    expect(joinPlace("Canton ", "Georgia")).toBe("Canton, Georgia");
    expect(joinPlace("", null, "Roseville", "CA")).toBe("Roseville, CA");
  });
});
