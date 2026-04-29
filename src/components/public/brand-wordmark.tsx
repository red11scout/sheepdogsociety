import Link from "next/link";

// Wordmark for the Acts 20:28 Sheepdog Society. Always shown WITH the
// scripture reference somewhere (in the wordmark or one click away) so
// outsiders don't read "2028" as a year. Per brand brief §2: "Lean hard
// on Acts 20:28 as the differentiator."
export function BrandWordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: { primary: "text-base", secondary: "text-[10px]" },
    md: { primary: "text-lg", secondary: "text-[11px]" },
    lg: { primary: "text-2xl md:text-3xl", secondary: "text-xs" },
  } as const;
  const s = sizes[size];

  return (
    <Link
      href="/"
      className={`inline-flex flex-col leading-none ${className}`}
      aria-label="Acts 20:28 Sheepdog Society — home"
    >
      <span className={`font-display font-semibold tracking-tight ${s.primary}`}>
        Acts <span className="text-brass">20:28</span>
      </span>
      <span
        className={`font-body uppercase tracking-[0.18em] text-stone mt-1 ${s.secondary}`}
      >
        Sheepdog Society
      </span>
    </Link>
  );
}
