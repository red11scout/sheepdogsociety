import { db } from "@/db";
import { letters } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

export const revalidate = 3600; // hourly

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  let items: Array<{
    title: string;
    description: string;
    link: string;
    guid: string;
    pubDate: string;
  }> = [];

  try {
    const rows = await db
      .select({
        slug: letters.slug,
        issueNumber: letters.issueNumber,
        title: letters.title,
        subtitle: letters.subtitle,
        themeWord: letters.themeWord,
        excerpt: letters.excerpt,
        publishedAt: letters.publishedAt,
        updatedAt: letters.updatedAt,
      })
      .from(letters)
      .where(and(eq(letters.status, "published"), isNull(letters.deletedAt)))
      .orderBy(desc(letters.publishedAt))
      .limit(50);

    items = rows.map((row) => {
      const published = row.publishedAt ?? row.updatedAt;
      const titleParts = [
        `Issue No. ${row.issueNumber}`,
        row.themeWord ?? null,
        row.title,
      ].filter(Boolean);
      return {
        title: titleParts.join(" — "),
        description: row.subtitle ?? row.excerpt ?? "",
        link: `${SITE_URL}/letter/${row.slug}`,
        guid: `${SITE_URL}/letter/${row.slug}`,
        pubDate: published.toUTCString(),
      };
    });
  } catch {
    // DB unreachable → empty feed; better than 500.
    items = [];
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Acts 2028 Sheepdog Society — The Letter</title>
    <link>${SITE_URL}/letter</link>
    <description>A weekly letter for Christian men, anchored in Acts 20:28. One passage, one big idea, one practical step.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
