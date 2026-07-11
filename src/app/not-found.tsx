import Link from "next/link";

// Global 404. Every dynamic public route (letter/[slug], groups/[slug],
// events/[slug], bible/[book]/[chapter], resources/[slug]) calls notFound();
// without this they fell through to Next's bare, chrome-less default with no
// way back into the site. Self-contained and branded so it reads as ours.
export const metadata = {
  title: "Not found — Sheepdog Society",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-4">
          <span className="folio shrink-0">Off the map</span>
          <div className="hairline flex-1" aria-hidden />
          <span className="folio hidden shrink-0 text-right sm:inline">
            Error 404
          </span>
        </div>

        <h1 className="display-soft mt-6 text-[clamp(2.5rem,7vw,4rem)]">
          This page wandered off.
        </h1>

        <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground">
          The page you are after is not here. It may have moved, or the link
          was worn through. No shame in getting turned around. Here is the way
          back.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="min-h-11 border border-foreground bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Return to the front page
          </Link>
          <Link
            href="/letter"
            className="min-h-11 border border-foreground/30 px-6 py-2.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            Read this week&rsquo;s Letter
          </Link>
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link className="underline-offset-4 hover:underline" href="/groups">
            Find a group
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/events">
            Gatherings
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/bible">
            Bible
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/resources">
            Resources
          </Link>
          <Link className="underline-offset-4 hover:underline" href="/contact">
            Contact
          </Link>
        </nav>
      </div>
    </div>
  );
}
