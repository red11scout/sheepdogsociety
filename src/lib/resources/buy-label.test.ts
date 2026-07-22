import { describe, expect, it } from "vitest";
import { buyLabelForUrl } from "./buy-label";

describe("buyLabelForUrl", () => {
  it("labels Amazon hosts across regions", () => {
    expect(buyLabelForUrl("https://www.amazon.com/dp/0851110452")).toBe("Buy on Amazon");
    expect(buyLabelForUrl("https://amazon.co.uk/dp/0851110452")).toBe("Buy on Amazon");
    expect(buyLabelForUrl("https://smile.amazon.com/dp/X")).toBe("Buy on Amazon");
  });

  it("labels Amazon short links (mobile Share button)", () => {
    expect(buyLabelForUrl("https://a.co/d/4example")).toBe("Buy on Amazon");
    expect(buyLabelForUrl("https://amzn.to/3xyz")).toBe("Buy on Amazon");
  });

  it("labels publisher and bookstore sites by host", () => {
    expect(buyLabelForUrl("https://www.christianbook.com/some-book")).toBe(
      "Get it at christianbook.com"
    );
    expect(buyLabelForUrl("https://www.crossway.org/books/x/")).toBe(
      "Get it at crossway.org"
    );
  });

  it("falls back for blank or malformed URLs", () => {
    expect(buyLabelForUrl("")).toBe("Get the book");
    expect(buyLabelForUrl(null)).toBe("Get the book");
    expect(buyLabelForUrl("not a url")).toBe("Get the book");
  });
});
