import { describe, expect, it } from "vitest";
import { summarize } from "./summary";

const labels = { "what-this-is": "What this is", "join-cta": "Join invitation" };
const names = { "pasture-iron": "Pasture & Iron", harvest: "Harvest" };
const base = { config: { themeId: "pasture-iron", pages: {} }, textOverrides: {} as Record<string, string> };

describe("summarize", () => {
  it("names the theme switch, section changes, and text edit count", () => {
    const next = {
      config: { themeId: "harvest", pages: { home: { sections: [{ id: "what-this-is", visible: false }] } } },
      textOverrides: { "home.hero.headline1": "Stand with your", "home.hero.paragraph": "x" },
    };
    const s = summarize(base, next, labels, names);
    expect(s).toContain("Switched to Harvest");
    expect(s).toContain("hid What this is");
    expect(s).toContain("edited 2 lines");
  });
  it("no changes reads plainly", () => {
    expect(summarize(base, base, labels, names)).toBe("No changes.");
  });
});
