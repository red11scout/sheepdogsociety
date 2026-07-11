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
  it("groups are exactly Homepage and About", () => {
    expect(new Set(SITE_TEXT_KEYS.map((e) => e.group))).toEqual(
      new Set(["Homepage", "About"])
    );
  });
  it("DEFAULTS mirrors the registry", () => {
    for (const e of SITE_TEXT_KEYS) {
      expect(SITE_TEXT_DEFAULTS[e.key]).toBe(e.defaultValue);
    }
  });
});
