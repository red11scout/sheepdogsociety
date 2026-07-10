import { describe, expect, it } from "vitest";
import { selectDraftingInput } from "./field-notes-input";

const base = { provider: null as string | null, bodyText: null as string | null, title: "Made to Provide", author: null as string | null, description: null as string | null, summary: null as string | null };

describe("selectDraftingInput", () => {
  it("file resources with a real body draft in full mode", () => {
    const r = selectDraftingInput({ ...base, bodyText: "x".repeat(500) });
    expect(r.mode).toBe("full");
    expect(r.content).toContain("x");
  });
  it("full-mode content is capped at 12000 chars", () => {
    const r = selectDraftingInput({ ...base, bodyText: "x".repeat(20000) });
    expect(r.content.length).toBeLessThanOrEqual(12000 + 200); // + header allowance
  });
  it("a file with a stub body falls to framing when metadata suffices", () => {
    const r = selectDraftingInput({ ...base, bodyText: "too short", description: "A 12-week study on biblical manhood and provision for men." });
    expect(r.mode).toBe("framing");
  });
  it("amazon books never use bodyText even if present", () => {
    const r = selectDraftingInput({ ...base, provider: "amazon", bodyText: "x".repeat(500), author: "Doug Smith", description: "A study book for men on providing as a Christian." });
    expect(r.mode).toBe("framing");
    expect(r.content).not.toContain("xxx");
    expect(r.content).toContain("Doug Smith");
  });
  it("youtube uses title + description", () => {
    const r = selectDraftingInput({ ...base, provider: "youtube", description: "Sermon on Acts 20:28 and the shepherd's charge to the church." });
    expect(r.mode).toBe("framing");
  });
  it("bare title with no metadata is insufficient", () => {
    expect(selectDraftingInput(base).mode).toBe("insufficient");
  });
  it("youtube framing never includes the author line even when author is set", () => {
    const r = selectDraftingInput({ ...base, provider: "youtube", author: "Some Channel", description: "Sermon on Acts 20:28 and the shepherd's charge to the church." });
    expect(r.mode).toBe("framing");
    expect(r.content).not.toContain("Author/creator");
  });
  it("full-mode floor is exact: 400 chars in, 399 out", () => {
    expect(selectDraftingInput({ ...base, bodyText: "x".repeat(400) }).mode).toBe("full");
    expect(selectDraftingInput({ ...base, bodyText: "x".repeat(399) }).mode).toBe("insufficient");
  });
});
