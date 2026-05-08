import mammoth from "mammoth";

export interface ConvertedDoc {
  html: string;
  text: string;
  warnings: string[];
}

const STYLE_MAP = [
  // Word's "Title" → semantic h1
  "p[style-name='Title'] => h1.resource-title",
  "p[style-name='Subtitle'] => p.resource-subtitle",
  // Headings
  "p[style-name='Heading 1'] => h2",
  "p[style-name='Heading 2'] => h3",
  "p[style-name='Heading 3'] => h4",
  // Quotes & callouts
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote.intense > p:fresh",
];

/**
 * Convert a .docx file buffer to clean HTML + plaintext for storage and search.
 * Uses mammoth's style-map so Word's "Title", "Heading 1", "Quote" become real semantic
 * elements instead of <p class="..."> blobs. Strips empty paragraphs and inline styles.
 */
export async function convertDocxBuffer(
  buffer: Buffer
): Promise<ConvertedDoc> {
  const { value, messages } = await mammoth.convertToHtml(
    { buffer },
    { styleMap: STYLE_MAP }
  );
  const html = sanitizeHtml(value);
  const text = htmlToPlainText(html);
  return {
    html,
    text,
    warnings: messages
      .filter((m) => m.type === "warning")
      .map((m) => m.message),
  };
}

/**
 * Permissive sanitizer — drop scripts, inline event handlers, and inline styles.
 * The source is admin-uploaded Word, so we trust the structure. We do not
 * trust attributes.
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sstyle='[^']*'/gi, "")
    // Strip empty paragraphs Word loves to emit
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|tr|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Heuristic title extraction: prefer the first h1, then the first h2, then the
 * first non-empty paragraph. Caller may override with the source filename.
 */
export function extractTitle(html: string, fallback: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).trim() || fallback;
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2) return stripTags(h2[1]).trim() || fallback;
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) return stripTags(p[1]).trim().slice(0, 120) || fallback;
  return fallback;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
}

export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // ~225 wpm for slow study reading
  return Math.max(1, Math.round(words / 225));
}
