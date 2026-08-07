/**
 * Renders mammoth-converted HTML inside a typography wrapper.
 * The HTML was sanitized at upload time (scripts, on* attributes, inline
 * styles stripped). This is a server-trusted source: only an admin can
 * upload, and the conversion path is bounded.
 */
import { stripLeadingTitle } from "@/lib/resources/strip-leading-title";

export function ResourceBody({
  html,
  dedupeTitle,
}: {
  html: string;
  dedupeTitle?: string;
}) {
  return (
    <div
      className="resource-prose"
      dangerouslySetInnerHTML={{
        __html: dedupeTitle ? stripLeadingTitle(html, dedupeTitle) : html,
      }}
    />
  );
}
