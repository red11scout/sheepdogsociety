import { afterAll, describe, expect, it } from "vitest";

/**
 * Live end-to-end proof that a book study added from an Amazon short link
 * shows its cover on the public site. Runs the real enrichment (a.co
 * redirect + ISBN lookup), inserts a real public row, fetches the REAL
 * production page, and downloads the cover bytes. Gated like the other
 * integration suites:
 *
 *   set -a; source .env.local; set +a; INTEGRATION=1 npx vitest run src/lib/resources/book-cover.integration.test.ts
 *
 * The row exists publicly for the seconds the test runs; afterAll hard-
 * deletes it.
 */

const RUN = Boolean(process.env.INTEGRATION && process.env.DATABASE_URL);
const SITE = "https://www.acts2028sheepdogsociety.com";
const SHORT_LINK = "https://a.co/d/04jFn2hr"; // Man's Search for Meaning

describe.runIf(RUN)("book cover — live end-to-end", () => {
  let createdId: string | null = null;

  afterAll(async () => {
    if (!RUN || !createdId) return;
    const { db } = await import("@/db");
    const { resources } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(resources).where(eq(resources.id, createdId));
  });

  it(
    "short link → enriched cover → public page renders it → image bytes exist",
    async () => {
      const { db } = await import("@/db");
      const { resources, users, resourceSections } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const { enrichLink } = await import("@/lib/resources/enrich");

      // 1. Real enrichment of the real short link.
      const e = await enrichLink(SHORT_LINK);
      expect(e.provider).toBe("amazon");
      expect(e.thumbnailUrl).toBeTruthy();
      expect(e.title.toLowerCase()).toContain("man's search for meaning");

      // 2. Real row in Book Studies, public — what "Save book + study" writes.
      const [admin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      const [section] = await db
        .select({ id: resourceSections.id })
        .from(resourceSections)
        .where(eq(resourceSections.slug, "book-studies"))
        .limit(1);
      expect(section?.id).toBeTruthy();

      const slug = `cover-e2e-${Date.now()}`;
      const [row] = await db
        .insert(resources)
        .values({
          title: e.title,
          slug,
          summary: e.description,
          url: e.url,
          type: "link",
          provider: e.provider,
          thumbnailUrl: e.thumbnailUrl,
          author: e.author,
          uploadedBy: admin.id,
          sectionId: section.id,
          isPublic: true,
          category: "book-studies",
        })
        .returning({ id: resources.id });
      createdId = row.id;

      // 3. The LIVE production page renders the cover + book layout.
      const page = await fetch(`${SITE}/resources/${slug}`, {
        headers: { Accept: "text/html" },
        cache: "no-store",
      });
      expect(page.status).toBe(200);
      const html = await page.text();
      expect(html).toContain(e.thumbnailUrl!);
      expect(html).toContain("The Book");
      expect(html).toContain("Buy on Amazon");
      expect(html).toContain("Frankl");

      // 4. The cover URL itself serves real image bytes.
      const img = await fetch(e.thumbnailUrl!);
      expect(img.status).toBe(200);
      expect(img.headers.get("content-type") ?? "").toMatch(/^image\//);
      const bytes = await img.arrayBuffer();
      expect(bytes.byteLength).toBeGreaterThan(5000);
    },
    90000
  );
});

// Placeholder so `npm test` reports the file as skipped, not empty.
describe.runIf(!RUN)("book cover — live end-to-end (skipped)", () => {
  it("skipped without INTEGRATION=1 + DATABASE_URL", () => {
    expect(true).toBe(true);
  });
});
