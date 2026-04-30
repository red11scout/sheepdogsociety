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
    <div className="bg-iron">
      <VersePlate variant="full" />
      <section className="bg-iron text-bone">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center md:px-12">
          <span className="section-mark text-stone/60">Share</span>
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
