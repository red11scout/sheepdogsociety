import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email — Acts 2028 Sheepdog Society",
  robots: { index: false, follow: false },
};

export default function CheckEmailPage() {
  return (
    <div className="w-full max-w-md py-16 text-center">
      <p className="font-body text-xs uppercase tracking-[0.18em] text-olive mb-6">
        Acts 2028 Sheepdog Society
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
        Check your inbox
      </h1>
      <p className="font-body text-base text-olive leading-relaxed mb-2">
        We sent you a sign-in link.
      </p>
      <p className="font-body text-sm text-olive leading-relaxed mb-10">
        The link works for 24 hours. If you don&apos;t see it within a minute, check spam or junk.
      </p>

      <p className="font-pullquote italic text-stone text-sm leading-relaxed border-l-2 border-brass pl-4 text-left mb-10">
        &ldquo;Be on guard for yourselves and for all the flock, among which the Holy Spirit has made you overseers, to shepherd the church of God.&rdquo;
        <span className="block mt-2 text-xs not-italic uppercase tracking-widest">— Acts 20:28</span>
      </p>

      <div className="space-y-3 text-sm font-body text-olive">
        <p>
          Wrong email?{" "}
          <Link
            href="/admin/sign-in"
            className="text-brass underline underline-offset-4 hover:text-iron"
          >
            Try again
          </Link>
        </p>
        <p>
          Trouble signing in?{" "}
          <Link
            href="mailto:beargodwin@gmail.com?subject=Sheepdog%20Society%20sign-in%20help"
            className="text-brass underline underline-offset-4 hover:text-iron"
          >
            Email Drew
          </Link>
        </p>
      </div>
    </div>
  );
}
