import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/icons/Icon";

export const metadata = {
  title: "Get Started — Sheepdog Society",
  description:
    "New here? The five core principles, what to expect at your first study, and how to find a group.",
};

const principles: { icon: IconName; roman: string; title: string; copy: string }[] = [
  {
    icon: "gate",
    roman: "I",
    title: "Free of charge.",
    copy: "Always free. No dues, no fees, no cost. This is a gift of brotherhood.",
  },
  {
    icon: "brothers",
    roman: "II",
    title: "Open to all men.",
    copy: "Every man is welcome regardless of background, denomination, or where he is in his walk.",
  },
  {
    icon: "hands",
    roman: "III",
    title: "Peer led.",
    copy: "No hierarchy. Any man can lead. We sharpen each other as equals before God.",
  },
  {
    icon: "flame",
    roman: "IV",
    title: "Ends with prayer.",
    copy: "Every gathering closes with the Circle of Prayer, where we lift one another up.",
  },
  {
    icon: "cross",
    roman: "V",
    title: "Christ-centered.",
    copy: "Jesus is our leader and foundation. Scripture is our guide. The Gospel is our hope.",
  },
];

const expectations = [
  {
    roman: "I",
    title: "Weekly study",
    copy: "Groups of two to twelve men meet weekly at a set time and place. Each man reads aloud from Scripture. We discuss, sharpen, and encourage.",
  },
  {
    roman: "II",
    title: "Signal between",
    copy: "Groups use Signal for secure communication between meetings. Share prayer requests, coordinate, stay connected.",
  },
  {
    roman: "III",
    title: "The Circle of Prayer",
    copy: "Every gathering ends with men standing together in prayer. Burdens shared and lifted. Confidential. Sacred. Powerful.",
  },
];

export default function GetStartedPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Get Started</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)]">
            New here?
            <br />
            <span className="text-brass">Welcome, brother.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Sheepdog Society is a brotherhood of men gathering weekly in small
            groups. We study Scripture. We sharpen each other. We live out our
            calling as protectors of the faith.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="lift h-12 rounded-none border border-iron bg-iron px-8 text-base text-bone hover:bg-iron/90"
            >
              <Link href="/locations">
                <Icon name="map-pin" size={18} className="mr-2" />
                Find a group
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="lift h-12 rounded-none border border-iron/30 bg-transparent px-8 text-base text-iron hover:border-iron hover:bg-iron/5"
            >
              <Link href="/locations/request">
                Start a group
                <Icon name="arrow-right" size={18} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 5 Principles */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Five core principles</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-4xl text-bone md:text-6xl">
            Five things to know.
          </h2>
          <div className="mt-16 grid gap-px bg-stone/10 md:grid-cols-3 lg:grid-cols-5">
            {principles.map((p) => (
              <article
                key={p.title}
                className="spotlight bg-iron p-8 md:p-10"
              >
                <div className="flex items-center justify-between">
                  <Icon
                    name={p.icon}
                    size={36}
                    strokeWidth={2}
                    className="text-brass"
                  />
                  <span className="section-mark text-brass">§ {p.roman}</span>
                </div>
                <h3 className="display-xl mt-10 text-xl text-bone md:text-2xl">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone">
                  {p.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ What to expect</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl md:text-6xl">
              Three rhythms,
              <br />
              <span className="text-brass">every week.</span>
            </h2>
            <ol className="space-y-10">
              {expectations.map((e) => (
                <li key={e.title} className="flex gap-6 md:gap-8">
                  <span className="display-xl shrink-0 text-2xl text-brass md:text-4xl">
                    § {e.roman}
                  </span>
                  <div>
                    <h3 className="display-xl text-xl text-iron md:text-2xl">
                      {e.title}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-iron/70 md:text-lg">
                      {e.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <span className="section-mark text-brass">§ How to join</span>
          <h2 className="display-xl mt-6 text-4xl text-bone md:text-6xl">
            No application.
            <br />
            <span className="text-brass">No interview.</span>
            <br />
            Just show up.
          </h2>
          <p className="mx-auto mt-8 max-w-xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
            Find a group near you. Come as you are. Be honest. Be real. This is
            a safe place for men.
          </p>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="lift h-12 rounded-none border border-bone bg-bone px-8 text-base text-iron hover:bg-stone"
            >
              <Link href="/locations">
                <Icon name="map-pin" size={18} className="mr-2" />
                Find a group
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="lift h-12 rounded-none border border-bone/30 bg-transparent px-8 text-base text-bone hover:border-bone hover:bg-bone/5"
            >
              <Link href="/locations/request">
                Start a group
                <Icon name="arrow-right" size={18} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
