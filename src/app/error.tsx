"use client";

import { useEffect } from "react";
import Link from "next/link";

// Root error boundary. Renders a calm, branded page and NEVER shows the raw
// error message to users (it can carry internal/DB text). The digest is a
// non-sensitive reference the reader can quote to support; the full message is
// only surfaced in development.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-4">
          <span className="folio shrink-0">The press jammed</span>
          <div className="hairline flex-1" aria-hidden />
        </div>

        <h1 className="display-soft mt-6 text-[clamp(2.5rem,7vw,4rem)]">
          Something broke on our end.
        </h1>

        <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground">
          This one is on us, not you. The page hit a snag and could not load.
          Give it another try, or head back to the front page. If it keeps
          happening, tell us at{" "}
          <a
            className="text-brass-deep underline underline-offset-4"
            href="mailto:shepherd@acts2028sheepdogsociety.com"
          >
            shepherd@acts2028sheepdogsociety.com
          </a>
          .
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={reset}
            className="min-h-11 border border-foreground bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-11 border border-foreground/30 px-6 py-2.5 text-sm font-medium transition-colors hover:border-foreground"
          >
            Return to the front page
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-8 font-mono text-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        ) : null}

        {isDev ? (
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded border border-foreground/15 bg-foreground/5 p-4 text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
