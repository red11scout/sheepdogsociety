import { describe, expect, it } from "vitest";
import { stripLeadingTitle } from "./strip-leading-title";

describe("stripLeadingTitle", () => {
  it("drops a first heading that restates the page title", () => {
    const html =
      "<h1>Men's Bible Study: Finish Strong — Galatians 6</h1><p>Body.</p>";
    expect(stripLeadingTitle(html, "Finish Strong – Galatians 6")).toBe(
      "<p>Body.</p>"
    );
  });
  it("keeps a first heading that is real content", () => {
    const html = "<h2>Week One</h2><p>Body.</p>";
    expect(stripLeadingTitle(html, "Finish Strong – Galatians 6")).toBe(html);
  });
  it("leaves heading-less bodies alone", () => {
    expect(stripLeadingTitle("<p>Body.</p>", "Anything")).toBe("<p>Body.</p>");
  });
});
