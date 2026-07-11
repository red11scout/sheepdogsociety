import { describe, expect, it } from "vitest";
import { mergeSiteText, resolveSiteText } from "./resolve";
import { SITE_TEXT_DEFAULTS } from "./registry";

describe("resolveSiteText", () => {
  it("returns the default for null, undefined, empty, and whitespace-only", () => {
    expect(resolveSiteText(null, "fallback")).toBe("fallback");
    expect(resolveSiteText(undefined, "fallback")).toBe("fallback");
    expect(resolveSiteText("", "fallback")).toBe("fallback");
    expect(resolveSiteText("   \n\t ", "fallback")).toBe("fallback");
  });
  it("returns the stored value, trimmed, when real content exists", () => {
    expect(resolveSiteText("Real copy.", "fallback")).toBe("Real copy.");
    expect(resolveSiteText("  padded  ", "fallback")).toBe("padded");
  });
});

describe("mergeSiteText", () => {
  it("returns pure defaults for an empty table", () => {
    expect(mergeSiteText([])).toEqual(SITE_TEXT_DEFAULTS);
  });
  it("ignores unknown keys", () => {
    const map = mergeSiteText([{ key: "not.a.real.key", value: "x" }]);
    expect(map).toEqual(SITE_TEXT_DEFAULTS);
  });
  it("whitespace-only override falls back to the default", () => {
    const map = mergeSiteText([{ key: "home.hero.headline1", value: "   " }]);
    expect(map["home.hero.headline1"]).toBe(SITE_TEXT_DEFAULTS["home.hero.headline1"]);
  });
  it("a real override wins", () => {
    const map = mergeSiteText([{ key: "home.hero.headline1", value: "Stand with your" }]);
    expect(map["home.hero.headline1"]).toBe("Stand with your");
  });
});
