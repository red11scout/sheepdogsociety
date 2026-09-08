/**
 * Only images we host (Vercel Blob uploads, plus anything under /public)
 * go through next/image optimisation. Admin-pasted or provider-scraped
 * URLs can point anywhere, and an unlisted host makes next/image throw at
 * render, so those stay `unoptimized`. Keep in step with
 * `images.remotePatterns` in next.config.ts.
 */
export function isOptimizableImage(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
