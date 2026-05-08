/**
 * Renders mammoth-converted HTML inside a typography wrapper.
 * The HTML was sanitized at upload time (scripts, on* attributes, inline
 * styles stripped). This is a server-trusted source: only an admin can
 * upload, and the conversion path is bounded.
 */
export function ResourceBody({ html }: { html: string }) {
  return (
    <div
      className="resource-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
