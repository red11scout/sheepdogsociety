import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { NewsletterForm } from "@/components/public/newsletter-form";
import { LocationsPreview } from "@/components/LocationsPreview";

export const metadata = {
  title: "Sheepdog Society — Acts 20:28",
  description:
    "Find your brothers. A brotherhood of men anchored in Acts 20:28, who tell the truth and grow stronger in Christ together.",
  openGraph: {
    title: "Sheepdog Society — Find your brothers.",
    description:
      "Brothers who tell the truth and hear yours. Acts 20:28.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};

export default function HomePage() {
  return (
    <>
      {/* Hero — one immersive canvas */}
      <section className="relative isolate overflow-hidden bg-background text-foreground">
        {/* Aurora wash */}
        <div className="aurora" aria-hidden />
        {/* Breathing shield watermark */}
        <div
          className="pointer-events-none absolute -right-[8%] top-1/2 -translate-y-1/2 opacity-[0.045] mix-blend-screen"
          aria-hidden
        >
          <Icon name="shield" size={920} className="text-brass breathe" />
        </div>
        {/* Faint dotted grid */}
        <div className="dotted-grid absolute inset-0 opacity-[0.06]" aria-hidden />

        <div className="relative mx-auto flex min-h-[100vh] max-w-5xl flex-col justify-center px-6 py-32 md:px-12">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">
              § Acts 20:28 &middot; The Watch
            </span>
            <div className="hairline flex-1" />
            <Link
              href="/acts-20-28"
              className="section-mark text-stone/50 transition-colors hover:text-brass"
            >
              The Verse
            </Link>
          </div>

          <h1 className="display-xl mt-12 max-w-3xl text-[clamp(3rem,9vw,9rem)] text-foreground">
            Find your
            <br />
            <span className="text-brass">brothers.</span>
          </h1>

          <p className="mt-10 max-w-2xl font-pullquote text-xl leading-relaxed text-stone md:text-2xl">
            You have walked alone a long time. There is honor in that, and a limit to it. Find brothers who will tell you the truth and hear yours, men who know the Word, who will stand watch beside you and grow stronger in Christ. That is the work. That is enough.
          </p>

          <div className="mt-14 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link
                href="/locations"
                className="lift group inline-flex h-12 items-center gap-3 border border-bone bg-bone px-7 text-base font-medium text-iron transition-colors hover:bg-stone"
              >
                <Icon name="map-pin" size={18} />
                Find a group near you
                <Icon
                  name="arrow-right"
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </Magnetic>
            <Link
              href="/encouragements"
              className="inline-flex h-12 items-center gap-2 px-2 text-base text-foreground/80 transition-colors hover:text-brass"
            >
              Read this week&rsquo;s Letter
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          <p className="mt-12 max-w-xl text-sm leading-relaxed text-stone">
            We do not meet to perform. We do not meet to debate. We meet to be honest with each other, anchored in Scripture, and to send each other back into the week steadier than we came.
          </p>
        </div>

        {/* Down indicator */}
        <div
          className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-3">
            <span className="section-mark text-stone/40">Outposts</span>
            <div className="h-12 w-px animate-pulse bg-stone/30" />
          </div>
        </div>
      </section>

      {/* Map section */}
      <LocationsPreview />

      {/* The Letter (newsletter) */}
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">
              § The Letter
            </span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-[clamp(2.5rem,6vw,5rem)] text-foreground">
            Sunday morning,
            <br />
            <span className="text-brass">before the day starts.</span>
          </h2>
          <p className="mt-8 max-w-xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
            One letter a week. A scripture. A practice. Sent at sunrise. Read
            in five minutes. Carry it the rest of the week.
          </p>
          <div className="mt-10 max-w-xl">
            <NewsletterForm />
          </div>
          <div className="mt-16 flex items-center gap-4">
            <div className="hairline flex-1" />
            <Magnetic strength={0.18}>
              <Link
                href="/get-started"
                className="lift inline-flex h-11 items-center gap-2 border border-stone/30 bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:border-brass hover:text-brass"
              >
                What to expect
                <Icon name="arrow-right" size={16} />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </>
  );
}
