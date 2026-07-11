import { describe, expect, it } from "vitest";
import { SITE_TEXT_KEYS, SITE_TEXT_DEFAULTS } from "./registry";

describe("SITE_TEXT_KEYS", () => {
  it("has unique keys", () => {
    const keys = SITE_TEXT_KEYS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("every entry has a non-empty key, label, group, and default", () => {
    for (const e of SITE_TEXT_KEYS) {
      expect(e.key.trim().length).toBeGreaterThan(0);
      expect(e.label.trim().length).toBeGreaterThan(0);
      expect(e.group.trim().length).toBeGreaterThan(0);
      expect(e.defaultValue.trim().length).toBeGreaterThan(0);
    }
  });
  it("covers every DS-2 group", () => {
    const groups = new Set(SITE_TEXT_KEYS.map((e) => e.group));
    for (const g of ["Join", "FAQ", "Contact", "Giving", "What to Expect", "How We Gather", "Events", "The Letter", "Stories"]) {
      expect(groups.has(g as never)).toBe(true);
    }
  });
  it("DEFAULTS mirrors the registry", () => {
    for (const e of SITE_TEXT_KEYS) {
      expect(SITE_TEXT_DEFAULTS[e.key]).toBe(e.defaultValue);
    }
  });
});
