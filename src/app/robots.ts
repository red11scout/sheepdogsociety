import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/og/ is the OG image endpoint — allow it explicitly (longest
        // match wins) so social share cards keep rendering even though
        // /api is otherwise disallowed below.
        allow: ["/", "/api/og/"],
        // /gallery is an admin tool behind login; keep crawlers off the
        // sign-in bounce. /admin and /api are never content.
        disallow: ["/admin", "/api", "/gallery"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
