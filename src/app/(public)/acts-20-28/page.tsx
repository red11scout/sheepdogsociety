import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons/Icon";
import { VersePlate } from "@/components/VersePlate";

export const metadata = {
  title: "Acts 20:28 — Sheepdog Society",
  description: "Keep watch over yourselves and all the flock.",
  openGraph: {
    title: "Acts 20:28 — Keep watch over yourselves and all the flock.",
    description:
      "Be shepherds of the church of God, which he bought with his own blood.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};

export default function VerseSharePage() {
  return (
    <div className="bg-background">
      <VersePlate variant="full" />

      {/* Full Acts 20:28, NIV */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ Acts 20:28 &middot; NIV</span>
            <div className="hairline flex-1" />
          </div>
          <blockquote className="mt-10 border-l-2 border-brass/40 pl-6 font-pullquote text-2xl leading-relaxed text-foreground md:text-3xl">
            &ldquo;Keep watch over yourselves and all the flock of which the
            Holy Spirit has made you overseers. Be shepherds of the church of
            God, which he bought with his own blood.&rdquo;
          </blockquote>
          <p className="mt-6 section-mark text-stone/60">
            Paul to the elders of Ephesus &middot; Acts 20:28 (New International Version)
          </p>

          <div className="hairline mt-16" />

          <p className="mt-12 max-w-2xl text-base leading-relaxed text-stone md:text-lg">
            Paul gathers the men one last time. He has watched over them himself
            for three years, and now he is leaving for Jerusalem, knowing he
            will not see their faces again. He gives them one charge: keep
            watch. Watch yourselves first. Then watch the flock the Spirit has
            given into your care. Be shepherds, like the one who bought them
            with his own blood.
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone md:text-lg">
            That is the work this brotherhood was named for. Men standing watch
            for one another, sober, anchored in Scripture, willing to do the
            unglamorous work of guarding what God has entrusted to them.
          </p>
        </div>
      </section>

      <section className="bg-background text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-24 text-center md:px-12 md:pb-32">
          <span className="section-mark text-stone/60">Stand watch with us</span>
          <Button
            asChild
            size="lg"
            className="lift h-12 rounded-none border border-bone bg-bone px-8 text-base text-iron hover:bg-stone"
          >
            <Link href="/get-started">
              Join the brotherhood
              <Icon name="arrow-right" size={18} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
