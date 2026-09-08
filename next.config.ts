import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploads land in Vercel Blob; see src/lib/images.ts for the matching
    // client-side check (everything else renders `unoptimized`). Blob URLs
    // are immutable (random suffix), so cache the optimised variants for
    // a month instead of the 60s default — each re-optimisation is billed.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    minimumCacheTTL: 2678400,
  },
  // Type errors fail the build (kept on; comment previously said the opposite).
  typescript: {
    ignoreBuildErrors: false,
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
      { source: "/get-started", destination: "/join", permanent: true },
    ];
  },
};

export default nextConfig;
