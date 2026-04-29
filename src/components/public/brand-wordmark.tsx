import Link from "next/link";

// Wordmark for the Acts 20:28 Sheepdog Society. Always shown WITH the
// scripture reference somewhere (in the wordmark or one click away) so
// outsiders don't read "2028" as a year. Per brand brief §2: "Lean hard
// on Acts 20:28 as the differentiator."
export function BrandWordmark({
  size = "md",
  className = "",
  subheadColor = "text-olive",
  accentColor = "text-brass",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Tailwind text-* class for the subhead. Default text-olive (passes WCAG AA on bone bg). On dark iron, override with text-stone. */
  subheadColor?: string;
  /** Tailwind text-* class for the "20:28" colon decorator. Default text-brass (works on bone). On dark iron, override with text-stone. */
  accentColor?: string;
}) {
  const sizes = {
    sm: { primary: "text-base", secondary: "text-[10px]" },
    md: { primary: "text-lg", secondary: "text-[11px]" },
    lg: { primary: "text-2xl md:text-3xl", secondary: "text-xs" },
  } as const;
  const s = sizes[size];

  // Subhead uses olive (#5C6646) instead of stone (#C7B79A) for WCAG AA
  // contrast on bone backgrounds. On iron/dark backgrounds the parent passes
  // a className that overrides.
  return (
    <Link
      href="/"
      className={`inline-flex flex-col leading-none ${className}`}
    >
      <span className={`font-display font-semibold tracking-tight ${s.primary}`}>
        Acts <span className={accentColor}>20:28</span>
      </span>
      <span
        className={`font-body uppercase tracking-[0.18em] mt-1 ${subheadColor} ${s.secondary}`}
      >
        Sheepdog Society
      </span>
    </Link>
  );
}
