/**
 * Label for a book's purchase button, derived from the URL's host so the
 * admin never has to type one: Amazon reads "Buy on Amazon", a publisher
 * or Christian bookstore reads "Get it at <site>", anything unparseable
 * falls back to "Get the book".
 */

// Includes Amazon's link shorteners (a.co, amzn.to, amzn.eu) — those are
// what the mobile app's Share button produces.
const AMAZON_HOST_RE =
  /(^|\.)(amazon\.(com|co\.uk|ca|de|fr|es|it|com\.au|co\.jp)|a\.co|amzn\.(to|eu|asia))$/i;

export function buyLabelForUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "Get the book";
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Get the book";
  }
  if (AMAZON_HOST_RE.test(host)) return "Buy on Amazon";
  if (!host) return "Get the book";
  return `Get it at ${host}`;
}
