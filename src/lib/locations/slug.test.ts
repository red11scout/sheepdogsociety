import { describe, expect, it } from "vitest";
import { locationSlug } from "./slug";

describe("locationSlug", () => {
  it("slugifies name + city", () => {
    expect(locationSlug("Iron Table", "Rockmart")).toBe("iron-table-rockmart");
  });
  it("collapses punctuation and whitespace runs", () => {
    expect(locationSlug("St. Mark's — Men", "Dallas / Hiram")).toBe(
      "st-mark-s-men-dallas-hiram"
    );
  });
  it("trims leading/trailing dashes", () => {
    expect(locationSlug("(The) Forge!", "Rome!")).toBe("the-forge-rome");
  });
  it("falls back to 'group' when nothing survives", () => {
    expect(locationSlug("§§§", "***")).toBe("group");
  });
  it("tolerates empty inputs", () => {
    expect(locationSlug("", "")).toBe("group");
  });
});
