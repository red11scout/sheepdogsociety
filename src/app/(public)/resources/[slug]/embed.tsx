/**
 * Renders the iframe HTML built server-side by enrich.ts. Constrained to a
 * 16:9 frame so it's responsive on mobile. The HTML itself was sanitized at
 * upload time (we strip the iframe down to the bare attributes we need and
 * force youtube-nocookie). Server-trusted source.
 */
export function Embed({ html }: { html: string }) {
  return (
    <div
      className="resource-embed relative aspect-video w-full overflow-hidden border border-iron/10 bg-iron/10"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
