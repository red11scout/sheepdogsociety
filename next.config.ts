import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (handled in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow Clerk/Supabase images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Phase 2 IA consolidation. All 308s. Config redirects run before
  // middleware and the filesystem; keep /locations/request ABOVE
  // /locations/:id or the request page becomes a bogus group id.
  // /groups/start ships HERE (same commit that deletes its page file),
  // or "start" would fall into /groups/[slug] and 404.
  async redirects() {
    return [
      { source: "/encouragements/:slug", destination: "/letter/:slug", permanent: true },
      { source: "/encouragements", destination: "/letter", permanent: true },
      {
        source: "/locations/request",
        destination: "/join?path=start",
        permanent: true,
      },
      { source: "/locations/:id", destination: "/groups/:id", permanent: true },
      { source: "/locations", destination: "/groups", permanent: true },
      {
        source: "/groups/start",
        destination: "/join?path=start",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
