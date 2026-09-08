import { NextResponse } from "next/server";
import { searchESV } from "@/lib/bible/esv";
import { referenceToUrl } from "@/lib/bible/books";

/**
 * ESV keyword search for the reader's picker panel. Public (middleware's
 * /api/public rule). ESV-only by design: no key or an ESV outage returns
 * 503 and the client shows the graceful "search is down" state — the
 * WEB fallback covers reading, not search (spec §4).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Lower-case + collapse whitespace so "Good Shepherd" and "good shepherd"
  // share one cache entry (ESV search is case-insensitive anyway); strip
  // control characters before the query reaches the upstream key.
  const q = (searchParams.get("q") ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 100);

  if (q.length < 3) {
    return NextResponse.json(
      { error: "q must be at least 3 characters" },
      { status: 400 }
    );
  }
  if (!process.env.ESV_API_KEY?.trim()) {
    return NextResponse.json({ error: "search-unavailable" }, { status: 503 });
  }

  try {
    const { results } = await searchESV(q);
    return NextResponse.json(
      {
        results: results.flatMap((r) => {
          const url = referenceToUrl(r.reference);
          return url ? [{ reference: r.reference, content: r.content, url }] : [];
        }),
      },
      {
        headers: {
          // Scripture does not change: let the CDN answer repeat queries
          // for a day so the ESV daily quota is spent on new searches only.
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Bible search error:", error);
    return NextResponse.json({ error: "search-unavailable" }, { status: 503 });
  }
}
