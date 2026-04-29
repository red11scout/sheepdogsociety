// Small-caps kicker used above editorial titles, e.g.
// "ISSUE NO. 47 · MARRIAGE & FAMILY · APRIL 24, 2026 · 8 MIN READ"
//
// Per brief §4: kickers establish the issue-based, editorial feel and
// kill the "blog post" vocabulary on sight.
export function IssueKicker({
  parts,
  className = "",
}: {
  parts: Array<string | null | undefined>;
  className?: string;
}) {
  const visible = parts.filter((p): p is string => Boolean(p && p.trim()));
  if (visible.length === 0) return null;
  return (
    <p
      className={`font-body uppercase tracking-[0.18em] text-xs text-olive ${className}`}
    >
      {visible.join(" · ")}
    </p>
  );
}
