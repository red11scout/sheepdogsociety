import { describe, expect, it } from "vitest";
import { SECTION_REGISTRY } from "./sections";

const EXPECTED_PAGE_IDS = [
  "home", "about", "join", "faq", "contact", "giving",
  "what-to-expect", "how-we-gather", "events", "letter", "stories", "resources",
];

describe("SECTION_REGISTRY", () => {
  it("has every governed page, keyed by its own pageId", () => {
    for (const id of EXPECTED_PAGE_IDS) {
      expect(SECTION_REGISTRY[id]).toBeDefined();
      expect(SECTION_REGISTRY[id].pageId).toBe(id);
    }
  });

  it("every page has unique, non-empty section ids", () => {
    for (const page of Object.values(SECTION_REGISTRY)) {
      const ids = page.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.length > 0)).toBe(true);
    }
  });

  it("every page has at least one locked section (a hero or dynamic block)", () => {
    for (const page of Object.values(SECTION_REGISTRY)) {
      expect(page.sections.some((s) => s.locked)).toBe(true);
    }
  });
});
