/** Draft-preview affordance. Server component, no client JS. Overlays the
 *  masthead (fixed, does not shift layout) — rendered only when draftMode
 *  is enabled. */
export function DraftRibbon() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex h-8 items-center justify-center gap-3 border-b border-oxblood bg-iron text-xs font-medium text-brass">
      <span>Draft preview &middot; not live</span>
      <a href="/api/admin/studio/preview?off=1" className="underline underline-offset-2">
        Stop preview
      </a>
    </div>
  );
}
