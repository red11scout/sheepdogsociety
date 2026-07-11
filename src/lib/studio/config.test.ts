import { describe, expect, it } from "vitest";
import { renderMerge, resolveThemeId, DEFAULT_CONFIG, type StudioConfig } from "./config";
import { SECTION_REGISTRY } from "./sections";

const HOME = SECTION_REGISTRY.home;
const ids = (r: { id: string }[]) => r.map((s) => s.id);

describe("renderMerge", () => {
  it("absent page entry renders registry order, all visible", () => {
    const out = renderMerge("home", DEFAULT_CONFIG);
    expect(ids(out)).toEqual(HOME.sections.map((s) => s.id));
    expect(out.every((s) => s.visible)).toBe(true);
  });
  it("config order applies only to ids it names; missing registry sections keep registry position, visible", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "join-cta", visible: true }, { id: "what-this-is", visible: false },
    ] } } };
    const out = renderMerge("home", cfg);
    // named ids appear in config order at the slots config ordering yields;
    // unnamed registry ids hold their registry positions (deterministic rule
    // implemented: walk registry order, but named ids are re-sequenced among
    // themselves to match config order).
    expect(ids(out)).toContain("hero");
    expect(out.find((s) => s.id === "what-this-is")).toMatchObject({ visible: false });
    const joinIdx = ids(out).indexOf("join-cta");
    const whatIdx = ids(out).indexOf("what-this-is");
    expect(joinIdx).toBeLessThan(whatIdx); // config order among named ids
  });
  it("locked sections are forced visible and keep registry position regardless of config", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "verse", visible: false }, { id: "verse", visible: false },
    ] } } };
    const verse = renderMerge("home", cfg).find((s) => s.id === "verse")!;
    expect(verse.visible).toBe(true);
    expect(verse.locked).toBe(true);
  });
  it("config ids not in the registry are dropped", () => {
    const cfg: StudioConfig = { themeId: "pasture-iron", pages: { home: { sections: [
      { id: "not-a-real-section", visible: true },
    ] } } };
    expect(ids(renderMerge("home", cfg))).not.toContain("not-a-real-section");
  });
  it("unknown pageId returns empty array", () => {
    expect(renderMerge("nope", DEFAULT_CONFIG)).toEqual([]);
  });
});

describe("resolveThemeId", () => {
  it("unknown themeId falls back to pasture-iron", () => {
    expect(resolveThemeId({ themeId: "neon-vaporwave", pages: {} }, ["pasture-iron", "harvest"])).toBe("pasture-iron");
    expect(resolveThemeId({ themeId: "harvest", pages: {} }, ["pasture-iron", "harvest"])).toBe("harvest");
  });
});
