import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { AnnouncementEmail } from "@/emails/announcement";

describe("AnnouncementEmail", () => {
  it("renders the branded shepherd layout", async () => {
    const html = await render(
      AnnouncementEmail({
        subject: "Men's breakfast this Saturday",
        body: "Brothers,\n\nWe gather at 7am. Bring a neighbor.",
        ctaLabel: "See the details",
        ctaUrl: "https://www.acts2028sheepdogsociety.com/events",
        unsubscribeUrl: "https://www.acts2028sheepdogsociety.com/api/public/unsubscribe?m=x&t=y",
      })
    );
    // Brand markers: cream field, brass kicker, shepherd voice, Acts 20:28.
    expect(html).toContain("#F2EBDD");
    expect(html).toContain("#C8932A");
    expect(html).toContain("From the Shepherd");
    expect(html).toContain("Men&#x27;s breakfast this Saturday");
    expect(html).toContain("Bring a neighbor.");
    expect(html).toContain("See the details");
    expect(html).toContain("https://www.acts2028sheepdogsociety.com/events");
    expect(html).toContain("Unsubscribe");
    expect(html).toContain("Acts 20:28");
  });

  it("renders without a CTA or unsubscribe link", async () => {
    const html = await render(
      AnnouncementEmail({ subject: "A word", body: "Stand firm." })
    );
    expect(html).toContain("Stand firm.");
    expect(html).not.toContain("Unsubscribe");
  });
});
