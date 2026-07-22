import { describe, expect, it } from "vitest";
import { canonicalAmazonUrl, detectProvider } from "./enrich";

describe("detectProvider", () => {
  it("treats Amazon short links as amazon", () => {
    expect(detectProvider("https://a.co/d/04jFn2hr")).toBe("amazon");
    expect(detectProvider("https://amzn.to/3xyz")).toBe("amazon");
    expect(detectProvider("https://amzn.eu/d/abc")).toBe("amazon");
  });

  it("keeps full Amazon and other hosts as before", () => {
    expect(detectProvider("https://www.amazon.com/dp/0807014273")).toBe("amazon");
    expect(detectProvider("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(detectProvider("https://www.crossway.org/books/x/")).toBe("web");
    expect(detectProvider("not a url")).toBe("web");
  });
});

describe("canonicalAmazonUrl", () => {
  it("builds a stable tracking-free product URL", () => {
    expect(canonicalAmazonUrl("0807014273")).toBe(
      "https://www.amazon.com/dp/0807014273"
    );
  });
});
