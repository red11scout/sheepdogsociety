"use client";

import { Icon } from "@/components/icons/Icon";

export function PrintButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const prevTitle = document.title;
        document.title = `${title} — Sheepdog Society`;
        window.print();
        // Restore after a tick — Safari fires afterprint asynchronously.
        setTimeout(() => {
          document.title = prevTitle;
        }, 500);
      }}
      className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:border-brass hover:text-brass"
    >
      <Icon name="scroll" size={12} />
      Print
    </button>
  );
}
