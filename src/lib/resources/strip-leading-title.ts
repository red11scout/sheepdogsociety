/** Word docs arrive with their own title as the first heading, which
 *  doubles the page h1 ("Finish Strong" then "Men's Bible Study: Finish
 *  Strong" right under it). Drop the body's first heading when it is
 *  essentially the page title. */
export function stripLeadingTitle(html: string, title: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(title);
  if (!target) return html;
  const m = html.match(/^\s*<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!m) return html;
  const headingText = norm(m[2].replace(/<[^>]+>/g, ""));
  if (!headingText) return html;
  if (headingText.includes(target) || target.includes(headingText)) {
    return html.slice((m.index ?? 0) + m[0].length);
  }
  return html;
}
