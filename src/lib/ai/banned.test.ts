import { describe, expect, it } from "vitest";
import { findBannedLanguage } from "./banned";

describe("findBannedLanguage", () => {
  it("finds banned single words case-insensitively", () => {
    expect(findBannedLanguage("We must LEVERAGE this robust plan.")).toEqual([
      "leverage",
      "robust",
    ]);
  });
  it("finds banned phrases", () => {
    expect(
      findBannedLanguage("Men who do life together level up at the end of the day.")
    ).toEqual(["do life together", "level up", "at the end of the day"]);
  });
  it("matches whole words only, not substrings", () => {
    // "navigate" banned; "navigator" fine. "based" banned; "database" fine.
    expect(findBannedLanguage("The navigator opened the database.")).toEqual([]);
  });
  it("dedupes repeats", () => {
    expect(findBannedLanguage("Unpack it. Then unpack it again.")).toEqual(["unpack"]);
  });
  it("returns empty for clean brand-voice text", () => {
    expect(
      findBannedLanguage("A weekly table. Scripture read plain. One concrete move.")
    ).toEqual([]);
  });
});
