/**
 * Server-side URL enrichment for the "Add from link" composer.
 *
 * Three providers we care about:
 *   - YouTube: oEmbed gives us title, channel, thumbnail, iframe HTML.
 *   - Amazon: open-graph scraping for title, author (sometimes), cover.
 *   - Generic web: open-graph scraping for title, description, og:image.
 *
 * No third-party API keys required. YouTube oEmbed is public; Amazon and
 * generic web are HTML-fetch + regex against meta tags.
 */

export type Provider = "youtube" | "amazon" | "web" | "file";

export interface EnrichedLink {
  provider: Provider;
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  author: string | null;
  embedHtml: string | null;
  durationSeconds: number | null;
  rawOg: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    type?: string;
  };
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);
const AMAZON_HOST_RE = /(^|\.)amazon\.(com|co\.uk|ca|de|fr|es|it|com\.au|co\.jp)$/i;

const FETCH_OPTIONS = {
  // Hint that we want HTML; some sites short-circuit otherwise.
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; SheepdogSocietyBot/1.0; +https://www.acts2028sheepdogsociety.com/)",
    Accept: "text/html,application/xhtml+xml",
  },
  // No timeout — Vercel function maxDuration handles this. Keep simple.
  redirect: "follow" as const,
};

export function detectProvider(url: string): Provider {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "web";
  }
  const host = u.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) return "youtube";
  if (AMAZON_HOST_RE.test(host)) return "amazon";
  return "web";
}

/**
 * Extract a YouTube video ID from any common URL shape:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/embed/ID
 *   - youtube.com/shorts/ID
 *   - youtube-nocookie.com/embed/ID
 * Returns null if the URL isn't recognizably YouTube.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  // youtu.be/ID
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return isValidYouTubeId(id) ? id : null;
  }
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    // /watch?v=ID
    const v = u.searchParams.get("v");
    if (v && isValidYouTubeId(v)) return v;
    // /embed/ID, /shorts/ID, /v/ID
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "v");
    if (idx !== -1 && parts[idx + 1] && isValidYouTubeId(parts[idx + 1])) {
      return parts[idx + 1];
    }
  }
  return null;
}

function isValidYouTubeId(id: string | undefined): id is string {
  return !!id && /^[A-Za-z0-9_-]{6,15}$/.test(id);
}

/**
 * YouTube serves a few thumbnail sizes off a stable URL pattern. `hqdefault`
 * is guaranteed to exist for every public video; `maxresdefault` only exists
 * for higher-quality uploads. We use `hqdefault` for safety — the card
 * renders at a small size anyway and we don't want a broken image.
 */
export function youtubeThumbnailFromUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export async function enrichLink(url: string): Promise<EnrichedLink> {
  const cleanUrl = url.trim();
  const provider = detectProvider(cleanUrl);
  if (provider === "youtube") return await enrichYouTube(cleanUrl);
  if (provider === "amazon") return await enrichAmazon(cleanUrl);
  return await enrichOpenGraph(cleanUrl, provider);
}

// ============================================================
// Amazon — ASIN-first, public book APIs, NEVER scrape Amazon HTML
// ============================================================
//
// Amazon actively fights server-side scraping: a bot UA gets a 503
// page; a browser UA gets a captcha challenge. So instead of scraping
// the product page we extract the ASIN from the URL, treat it as an
// ISBN-10 (which is what Amazon uses for most books), and look the
// title/author/cover up via two free public APIs:
//
//   1. Open Library (https://openlibrary.org/dev/docs/api/books)
//      No key, no quota, fast, returns title + authors + canonical
//      cover URL. Doesn't usually carry a description.
//
//   2. Google Books (https://www.googleapis.com/books/v1/volumes)
//      Free for low volume, often carries a richer description and
//      higher-res cover. Used as a description supplement when
//      Open Library was the title source.
//
// Both APIs lookup by ISBN-13 (preferred) or ISBN-10. Amazon ASINs
// for books are usually ISBN-10. Non-book ASINs (B0xxxxxxxx) skip
// straight to a friendly "couldn't enrich" stub the admin can fill.

function extractAmazonAsin(url: string): string | null {
  try {
    const u = new URL(url);
    // Common forms: /dp/ASIN, /gp/product/ASIN, /gp/aw/d/ASIN, /exec/obidos/ASIN/
    const m = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos)\/([A-Z0-9]{10})/i);
    return m ? m[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

function looksLikeIsbn10(asin: string | null): boolean {
  // ISBN-10 is 9 digits + check digit (which can be 0-9 or X). Modern
  // book ASINs follow this pattern. Non-book ASINs start with B0/B07/B08.
  if (!asin) return false;
  return /^\d{9}[\dX]$/.test(asin);
}

interface BookMeta {
  title?: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  thumbnailUrl?: string;
}

async function fetchOpenLibrary(isbn: string): Promise<BookMeta | null> {
  try {
    const r = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`,
      { headers: { Accept: "application/json" } }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as Record<
      string,
      {
        title?: string;
        subtitle?: string;
        authors?: { name: string }[];
      }
    >;
    const book = data[`ISBN:${isbn}`];
    if (!book) return null;

    // Open Library covers are constructed by ISBN, but many books
    // (especially newer/niche editions) have no cover registered.
    // The default endpoint silently returns a placeholder image, which
    // looked broken in the admin preview. ?default=false makes the
    // endpoint 404 when no cover exists; we HEAD-check it and only
    // return the URL when a real cover is there. The downstream
    // ResourceCover SVG fallback handles the no-cover case.
    const coverProbeUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`;
    let thumbnailUrl: string | undefined;
    try {
      const probe = await fetch(coverProbeUrl, { method: "HEAD" });
      if (probe.ok) {
        // Strip ?default=false from the public URL — public visitors don't
        // need the probe param; full-size endpoint without it serves the
        // confirmed-existing cover.
        thumbnailUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg`;
      }
    } catch {
      // probe failed; leave thumbnailUrl undefined so the SVG fallback fires
    }

    return {
      title: book.title?.trim(),
      subtitle: book.subtitle?.trim(),
      authors: (book.authors ?? []).map((a) => a.name.trim()).filter(Boolean),
      thumbnailUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Last-resort description generator. Open Library is description-poor;
 * Google Books frequently 429s from shared IPs. When both come up dry
 * we ask Claude. Strict prompt — if the model doesn't recognize the
 * exact title+author, it returns an empty string. Better blank than
 * hallucinated.
 */
async function generateBookDescription(
  title: string,
  author: string,
  subtitle?: string
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return "";
  const fullTitle = subtitle ? `${title}: ${subtitle}` : title;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        temperature: 0.3,
        system:
          "You write short factual book summaries for a Christian men's ministry library. STRICT: if you don't recognize the EXACT book title + author below, return ONLY the literal string UNKNOWN. Do not guess, do not invent plot details, do not pad with generic blurb. If you DO recognize it, return 50-90 words of plain factual summary suitable for a study-resource catalog entry. Plain prose, no marketing voice, no em-dashes.",
        messages: [
          {
            role: "user",
            content: `Title: ${fullTitle}\nAuthor: ${author}\n\nWrite the summary, or UNKNOWN.`,
          },
        ],
      }),
    });
    if (!r.ok) return "";
    const data = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text || /^unknown\b/i.test(text)) return "";
    // Strip em-dashes and hashtags to match brand voice rules.
    return text.replace(/—/g, ", ").replace(/#\w+/g, "").trim();
  } catch {
    return "";
  }
}

async function fetchGoogleBooks(isbn: string): Promise<BookMeta | null> {
  try {
    const r = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as {
      items?: Array<{
        volumeInfo?: {
          title?: string;
          subtitle?: string;
          authors?: string[];
          description?: string;
          imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        };
      }>;
    };
    const v = data.items?.[0]?.volumeInfo;
    if (!v) return null;
    // Google Books returns http:// thumbnails; rewrite to https for
    // mixed-content compliance.
    const thumb = (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? "")
      .replace(/^http:/, "https:");
    return {
      title: v.title?.trim(),
      subtitle: v.subtitle?.trim(),
      authors: (v.authors ?? []).map((a) => a.trim()).filter(Boolean),
      description: v.description?.trim(),
      thumbnailUrl: thumb || undefined,
    };
  } catch {
    return null;
  }
}

async function enrichAmazon(url: string): Promise<EnrichedLink> {
  const asin = extractAmazonAsin(url);

  // Books: ISBN-10 lookup against Open Library + Google Books in parallel.
  // Merge so we get OpenLibrary's reliable title/cover + Google's richer
  // description when both are available.
  if (asin && looksLikeIsbn10(asin)) {
    const [ol, gb] = await Promise.all([
      fetchOpenLibrary(asin),
      fetchGoogleBooks(asin),
    ]);
    const merged: BookMeta = {
      title: ol?.title || gb?.title,
      subtitle: ol?.subtitle || gb?.subtitle,
      authors:
        ol?.authors && ol.authors.length > 0 ? ol.authors : gb?.authors ?? [],
      description: gb?.description || "",
      // Open Library cover is preferred — stable, ISBN-keyed. Google's
      // is a fallback (lower res, watermark-prone).
      thumbnailUrl: ol?.thumbnailUrl || gb?.thumbnailUrl,
    };

    if (merged.title) {
      // Description fallback: Open Library frequently has no description,
      // and Google Books is rate-limited from shared IPs. As a last
      // resort ask Claude — strictly told to return empty if unfamiliar
      // with the exact book, so we don't hallucinate plot summaries
      // for niche titles.
      if (!merged.description && merged.authors?.length) {
        merged.description = await generateBookDescription(
          merged.title,
          merged.authors[0],
          merged.subtitle
        );
      }

      const titleLine = merged.subtitle
        ? `${merged.title}: ${merged.subtitle}`
        : merged.title;
      return {
        provider: "amazon",
        url,
        title: titleLine,
        description: merged.description ?? "",
        thumbnailUrl: merged.thumbnailUrl ?? null,
        author: merged.authors?.length ? merged.authors.join(", ") : null,
        embedHtml: null,
        durationSeconds: null,
        rawOg: {
          title: titleLine,
          description: merged.description,
          image: merged.thumbnailUrl,
          siteName: "Amazon",
          type: "book",
        },
      };
    }
  }

  // Non-book ASINs and unknown books fall through to a clean stub. We
  // intentionally do NOT scrape the Amazon HTML — every attempt either
  // returns a 503 page (bot UA) or a captcha challenge (browser UA),
  // which would write garbage like title="Amazon" / author="Follow"
  // into the DB. Better to hand the admin an empty form to fill in.
  return {
    provider: "amazon",
    url,
    title: "",
    description: "",
    thumbnailUrl: null,
    author: null,
    embedHtml: null,
    durationSeconds: null,
    rawOg: { siteName: "Amazon", type: "book" },
  };
}

// ============================================================
// YouTube — oEmbed (public, no key)
// ============================================================
async function enrichYouTube(url: string): Promise<EnrichedLink> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    url
  )}&format=json`;
  let data: {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    html?: string;
  } = {};
  try {
    const res = await fetch(oembedUrl, FETCH_OPTIONS);
    if (!res.ok) {
      // YouTube returns 401 for private/age-gated/unlisted videos. Fall back
      // to OG scrape so the admin can still save the row.
      return await enrichOpenGraph(url, "youtube");
    }
    data = await res.json();
  } catch {
    return await enrichOpenGraph(url, "youtube");
  }

  // YouTube oEmbed doesn't give us duration. We can scrape it from the watch
  // page later if needed; skip for v1.
  const embedHtml = data.html ? sanitizeYouTubeIframe(data.html) : null;

  return {
    provider: "youtube",
    url,
    title: data.title?.trim() || "Untitled video",
    description: "",
    thumbnailUrl: data.thumbnail_url ?? null,
    author: data.author_name ?? null,
    embedHtml,
    durationSeconds: null,
    rawOg: {
      title: data.title,
      image: data.thumbnail_url,
      siteName: "YouTube",
      type: "video.other",
    },
  };
}

/**
 * Strip YouTube's oEmbed iframe down to the bare attributes we need + force
 * the privacy-enhanced `youtube-nocookie.com` domain so embeds don't drop
 * tracking cookies on visitors before they click play.
 */
function sanitizeYouTubeIframe(html: string): string {
  const srcMatch = html.match(/src="([^"]+)"/);
  const widthMatch = html.match(/width="(\d+)"/);
  const heightMatch = html.match(/height="(\d+)"/);
  if (!srcMatch) return "";
  let src = srcMatch[1];
  src = src.replace("youtube.com/embed/", "youtube-nocookie.com/embed/");
  const w = widthMatch?.[1] ?? "560";
  const h = heightMatch?.[1] ?? "315";
  return `<iframe width="${w}" height="${h}" src="${src}" title="YouTube video player" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

// ============================================================
// OG / Twitter card scrape — works for Amazon and generic web
// ============================================================
async function enrichOpenGraph(
  url: string,
  provider: Provider
): Promise<EnrichedLink> {
  let html = "";
  try {
    const res = await fetch(url, FETCH_OPTIONS);
    if (res.ok) html = await res.text();
  } catch {
    // Fall through with empty html — caller still gets a usable shape.
  }

  const og = scrapeOgTags(html);
  // Reject titles that match well-known block / error pages. These show
  // up when a server-side scrape hits a site that blocks bots (Amazon,
  // Cloudflare, etc.). Better to return empty than to write
  // "503 - Service Unavailable" or "Just a moment..." into the DB.
  const titleRaw = og.title?.trim();
  const titleIsGarbage = !!titleRaw && BLOCK_TITLE_PATTERNS.some((re) => re.test(titleRaw));
  const cleanTitle = titleIsGarbage ? "" : titleRaw;

  // Amazon often puts the author in <span class="author">. Scrape best-effort.
  const author =
    provider === "amazon"
      ? extractAmazonAuthor(html) ?? og.siteName ?? null
      : og.siteName ?? null;

  return {
    provider,
    url,
    title: cleanTitle || hostFromUrl(url) || "Untitled",
    description: og.description?.trim() ?? "",
    thumbnailUrl: og.image ?? null,
    author,
    embedHtml: null,
    durationSeconds: null,
    rawOg: og,
  };
}

const BLOCK_TITLE_PATTERNS: RegExp[] = [
  /^Amazon\.com$/i,
  /^Amazon$/i,
  /503\b.*Service Unavailable/i,
  /Just a moment/i, // Cloudflare challenge
  /Access Denied/i,
  /Robot Check/i,
  /Captcha/i,
  /Pardon Our Interruption/i,
];

function scrapeOgTags(html: string): EnrichedLink["rawOg"] {
  if (!html) return {};
  const out: EnrichedLink["rawOg"] = {};
  const grab = (re: RegExp): string | undefined => {
    const m = html.match(re);
    return m?.[1] ? decodeEntities(m[1]) : undefined;
  };
  // og:* takes precedence; twitter:* is fallback.
  out.title =
    grab(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    grab(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) ||
    grab(/<title[^>]*>([^<]+)<\/title>/i);
  out.description =
    grab(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    ) ||
    grab(
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i
    ) ||
    grab(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  out.image =
    grab(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    grab(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  out.siteName = grab(
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i
  );
  out.type = grab(
    /<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i
  );
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Amazon book pages ship the author inside markup that varies by region and
 * page version. Try a few patterns; first hit wins. Best-effort — fine to
 * return null and let admin fill it in.
 */
function extractAmazonAuthor(html: string): string | null {
  if (!html) return null;
  // Most common: <span class="author ..."><a ...>Author Name</a></span>
  let m = html.match(
    /<span[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i
  );
  if (m) return decodeEntities(m[1]).trim();
  // Sometimes: by <a class="...contributorNameID...">Author</a>
  m = html.match(
    /<a[^>]*class=["'][^"']*contributorNameID[^"']*["'][^>]*>([^<]+)<\/a>/i
  );
  if (m) return decodeEntities(m[1]).trim();
  // og:book:author meta tag (rare but reliable when present)
  m = html.match(
    /<meta[^>]+property=["']book:author["'][^>]+content=["']([^"']+)["']/i
  );
  if (m) return decodeEntities(m[1]).trim();
  return null;
}
