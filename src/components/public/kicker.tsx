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
      {right ? <span className="folio shrink-0 text-right">{right}</span> : null}
    </div>
  );
}
