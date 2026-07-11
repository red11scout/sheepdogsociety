/**
 * Minimal allowlist HTML sanitizer for admin-authored field notes (spec
 * §A-FN security hardening). Field notes are short, structurally simple
 * content (a couple of paragraphs, a scripture list, two headings), so a
 * small regex-based allowlist covers it without pulling in a full HTML
 * parser as a new dependency.
 *
 * Rules:
 *  - Only p, h3, ul, li, strong, em pass through, and always bare — no
 *    attributes survive on any tag (onclick, href, style, class, etc. are
 *    stripped along with the tag itself; the kept tag is rewritten plain).
 *  - script/style elements are removed ENTIRELY, tag and content both, so
 *    a payload can't hide in a script body.
 *  - Any other tag is stripped but its inner text is kept — e.g. an <a>
 *    wrapper collapses to just its link text.
 *  - Any '<' or '>' left over once tags are extracted (i.e. not part of a
 *    recognized tag) is escaped, so stray/partial markup can't slip
 *    through as-is.
 *
 * This runs server-side on every write in updateResource — it is not a
 * display-time-only precaution.
 */
const ALLOWED_TAGS = new Set(["p", "h3", "ul", "li", "strong", "em"]);

// Matches a complete open or close tag whose name starts with a letter and
// whose body has no nested angle brackets — covers every tag shape the
// generator or an admin's hand-typed HTML would realistically produce.
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g;

// Matches <script ...>...</script> and <style ...>...</style>, content
// included, so the whole element is dropped rather than just re-tagged.
const SCRIPT_OR_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

export function sanitizeFieldNotes(html: string): string {
  const withoutScriptsAndStyles = html.replace(SCRIPT_OR_STYLE_RE, "");

  let out = "";
  let lastIndex = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(withoutScriptsAndStyles)) !== null) {
    out += escapeStrayAngles(withoutScriptsAndStyles.slice(lastIndex, match.index));

    const tagName = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    if (ALLOWED_TAGS.has(tagName)) {
      out += isClosing ? `</${tagName}>` : `<${tagName}>`;
    }
    // Disallowed tags are dropped; their inner text (if any) arrives as its
    // own text segment on the next loop iteration and is preserved.

    lastIndex = TAG_RE.lastIndex;
  }

  out += escapeStrayAngles(withoutScriptsAndStyles.slice(lastIndex));

  return out;
}

function escapeStrayAngles(segment: string): string {
  return segment.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
