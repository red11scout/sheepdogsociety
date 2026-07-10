import { describe, expect, it } from "vitest";
import { typeLabel } from "./type-label";

const base = { provider: null as string | null, sourceMime: null as string | null, hasBody: false, fileKey: "" };

describe("typeLabel", () => {
  it("provider wins over everything", () => {
    expect(typeLabel({ ...base, provider: "amazon", hasBody: true })).toBe("Book");
    expect(typeLabel({ ...base, provider: "youtube", sourceMime: "application/pdf" })).toBe("Video");
    expect(typeLabel({ ...base, provider: "web" })).toBe("Article");
  });
  it("readable body means Guide when no provider", () => {
    expect(typeLabel({ ...base, hasBody: true })).toBe("Guide");
    expect(typeLabel({ ...base, hasBody: true, sourceMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBe("Guide");
  });
  it("mime drives file types", () => {
    expect(typeLabel({ ...base, sourceMime: "video/mp4", fileKey: "x" })).toBe("Video");
    expect(typeLabel({ ...base, sourceMime: "application/pdf", fileKey: "x" })).toBe("Guide");
    expect(typeLabel({ ...base, sourceMime: "application/zip", fileKey: "x" })).toBe("Download");
  });
  it("anything unclassifiable is Download", () => {
    expect(typeLabel(base)).toBe("Download");
    expect(typeLabel({ ...base, provider: "unknown-future-provider" })).toBe("Download");
  });
});
