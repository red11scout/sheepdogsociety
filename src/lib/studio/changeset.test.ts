import { describe, expect, it } from "vitest";
import { validateChangeset, type Changeset } from "./changeset";
import { DEFAULT_CONFIG, type StudioConfig } from "./config";
import { SITE_TEXT_KEYS } from "@/lib/site-text/registry";

const emptyConfig: StudioConfig = DEFAULT_CONFIG;

describe("validateChangeset", () => {
  it("accepts a valid section visibility change and a valid text edit", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", visible: false }],
      textEdits: [{ key: "about.mission.body", value: "New mission copy.", why: "Tighter." }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(dropped).toEqual([]);
    expect(accepted.sectionChanges).toEqual(cs.sectionChanges);
    expect(accepted.textEdits).toEqual(cs.textEdits);
  });

  it("drops a section change for an unknown pageId", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "not-a-page", sectionId: "hero", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].reason).toMatch(/page/i);
  });

  it("drops a section change for an unknown sectionId on a known page", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "not-a-section", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(1);
  });

  it("drops a section change targeting a locked section", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "hero", visible: false }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped[0].reason).toMatch(/locked/i);
  });

  it("drops a duplicate {pageId, sectionId} pair — both copies rejected", () => {
    const cs: Changeset = {
      sectionChanges: [
        { pageId: "about", sectionId: "mission", visible: false },
        { pageId: "about", sectionId: "mission", visible: true },
      ],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.reason.match(/duplicate/i))).toBe(true);
  });

  it("bounds-checks a position patch against the full materialized order (registry + config merge)", () => {
    // "about" has 6 sections in the registry (indices 0-5).
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", position: 99 }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped[0].reason).toMatch(/position/i);
  });

  it("accepts a position patch within bounds", () => {
    const cs: Changeset = {
      sectionChanges: [{ pageId: "about", sectionId: "mission", position: 2 }],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(dropped).toEqual([]);
    expect(accepted.sectionChanges).toEqual(cs.sectionChanges);
  });

  it("drops a text edit for an unknown key", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "not.a.real.key", value: "Something", why: "Because" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/key/i);
  });

  it("drops a text edit with an empty or whitespace-only value", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "about.mission.body", value: "   ", why: "Reset it" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/blank|empty|reset/i);
  });

  it("drops a text edit whose value contains banned language", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [{ key: "about.mission.body", value: "We must delve deeper.", why: "Punchier" }],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped[0].reason).toMatch(/banned|voice/i);
  });

  it("caps accepted items at 20 total, dropping the remainder with a reason", () => {
    const textEdits = Array.from({ length: 25 }, (_, i) => ({
      key: SITE_TEXT_KEYS[i].key,
      value: `Version ${i}`,
      why: "Test",
    }));
    const { accepted, dropped } = validateChangeset({ sectionChanges: [], textEdits }, emptyConfig);
    expect(accepted.textEdits).toHaveLength(20);
    expect(dropped).toHaveLength(5);
    expect(dropped.every((d) => d.reason.match(/cap|limit|20/i))).toBe(true);
  });

  it("passes through a known themeId unchanged", () => {
    const cs: Changeset = { themeId: "harvest", sectionChanges: [], textEdits: [] };
    const { accepted } = validateChangeset(cs, emptyConfig);
    expect(accepted.themeId).toBe("harvest");
  });

  it("passes themeId through unvalidated — the Server Action layer re-validates it", () => {
    const cs: Changeset = { themeId: "neon-vaporwave", sectionChanges: [], textEdits: [] };
    const { accepted } = validateChangeset(cs, emptyConfig);
    expect(accepted.themeId).toBe("neon-vaporwave");
  });

  it("rejects both copies of a duplicate text-edit key", () => {
    const cs: Changeset = {
      sectionChanges: [],
      textEdits: [
        { key: "about.mission.body", value: "Version A", why: "First" },
        { key: "about.mission.body", value: "Version B", why: "Second" },
      ],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.textEdits).toEqual([]);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.reason.match(/duplicate/i))).toBe(true);
  });

  it("drops a NaN or non-integer position instead of silently accepting it", () => {
    const cs: Changeset = {
      sectionChanges: [
        { pageId: "about", sectionId: "mission", position: NaN },
        { pageId: "about", sectionId: "leadership", position: 1.5 },
      ],
      textEdits: [],
    };
    const { accepted, dropped } = validateChangeset(cs, emptyConfig);
    expect(accepted.sectionChanges).toEqual([]);
    expect(dropped).toHaveLength(2);
    expect(dropped.every((d) => d.reason.match(/valid|whole number/i))).toBe(true);
  });
});
