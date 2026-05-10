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

export async function enrichLink(url: string): Promise<EnrichedLink> {
  const cleanUrl = url.trim();
  const provider = detectProvider(cleanUrl);
  if (provider === "youtube") return await enrichYouTube(cleanUrl);
  return await enrichOpenGraph(cleanUrl, provider);
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
  // Amazon often puts the author in <span class="author">. Scrape best-effort.
  const author =
    provider === "amazon"
      ? extractAmazonAuthor(html) ?? og.siteName ?? null
      : og.siteName ?? null;

  return {
    provider,
    url,
    title: og.title?.trim() || hostFromUrl(url) || "Untitled",
    description: og.description?.trim() ?? "",
    thumbnailUrl: og.image ?? null,
    author,
    embedHtml: null,
    durationSeconds: null,
    rawOg: og,
  };
}

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
