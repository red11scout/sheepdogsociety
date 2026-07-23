import { describe, expect, it } from "vitest";
import { condenseVerseText } from "./verse";

describe("condenseVerseText", () => {
  it("collapses whitespace without touching the words", () => {
    expect(
      condenseVerseText("  The LORD is my shepherd;\n    I shall not want.\n")
    ).toBe("The LORD is my shepherd; I shall not want.");
  });

  it("returns empty for blank input", () => {
    expect(condenseVerseText("   \n  ")).toBe("");
  });
});
