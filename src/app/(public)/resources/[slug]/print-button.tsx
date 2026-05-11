"use client";

import { Icon } from "@/components/icons/Icon";

/**
 * Triggers the browser print dialog on the branded letterhead version
 * of the resource. Modern browsers offer "Save as PDF" as a destination
 * in that dialog, so this button doubles as a "Download as branded PDF"
 * for body-html resources — no server-side PDF generator required.
 *
 * The document title is briefly swapped so the saved-PDF filename
 * defaults to the resource title rather than the URL slug.
 */
export function PrintButton({
  title,
  label = "Print",
}: {
  title: string;
  label?: string;
}) {
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
      className="lift inline-flex h-9 items-center gap-2 border border-iron/20 bg-iron px-4 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:bg-brass hover:text-iron"
      title="Opens the print dialog. Choose 'Save as PDF' as the destination to download a branded copy."
    >
      <Icon name="download" size={12} />
      {label}
    </button>
  );
}
