import type { ReactNode } from "react";

/**
 * Broadsheet kicker row: folio label left, connecting hairline, optional
 * folio aside right. Opens every major public section (MASTER.md).
 * Server component — no interactivity.
 */
export function Kicker({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`.trim()}>
      <span className="folio shrink-0">{left}</span>
      <div className="hairline flex-1" aria-hidden />
      {/* The right aside is editorial garnish; below sm it can outrun the
          375px viewport (shrink-0 + long straplines), so it hides. */}
      {right ? (
        <span className="folio hidden shrink-0 text-right sm:inline">
          {right}
        </span>
      ) : null}
    </div>
  );
}
