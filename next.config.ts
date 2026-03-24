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
};

export default nextConfig;
