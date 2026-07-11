import { describe, expect, it } from "vitest";
import { sanitizeFieldNotes } from "./sanitize-field-notes";

describe("sanitizeFieldNotes", () => {
  it("passes generator-shaped HTML through unchanged", () => {
    const html = [
      "<p>Provision is a discipline, not a windfall.</p>",
      "<h3>Key scriptures</h3>",
      "<ul><li><strong>1 Timothy 5:8</strong> — a man who provides guards his household.</li></ul>",
      "<h3>Use it in a study</h3>",
      "<p>Read it aloud, then ask each man what he is providing this week.</p>",
    ].join("\n");
    expect(sanitizeFieldNotes(html)).toBe(html);
  });

  it("removes script elements and their content entirely", () => {
    const html = "<p>Notes</p><script>alert(1)</script><p>More</p>";
    const out = sanitizeFieldNotes(html);
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert(1)");
    expect(out).toBe("<p>Notes</p><p>More</p>");
  });

  it("strips attributes from an otherwise-allowed tag", () => {
    expect(sanitizeFieldNotes('<p onclick="x">Text</p>')).toBe("<p>Text</p>");
  });

  it("strips a disallowed wrapper tag but keeps its text", () => {
    expect(sanitizeFieldNotes('<a href="https://example.com">Click here</a>')).toBe(
      "Click here"
    );
  });

  it("escapes a stray angle bracket that isn't part of a tag", () => {
    expect(sanitizeFieldNotes("<p>3 < 5 is true</p>")).toBe("<p>3 &lt; 5 is true</p>");
  });
});
