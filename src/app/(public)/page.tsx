import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons/Icon";
import { VersePlate } from "@/components/VersePlate";
import { Magnetic } from "@/components/motion/Magnetic";
import { Spotlight } from "@/components/motion/Spotlight";

export const metadata = {
  title: "Sheepdog Society — Stand Guard. Protect the Flock.",
  description:
    "A brotherhood of men rooted in faith, gathering weekly to study Scripture, sharpen one another, and live out Acts 20:28.",
  openGraph: {
    title: "Sheepdog Society — Keep watch over yourselves and all the flock.",
    description: "Acts 20:28. A brotherhood of men.",
    images: [{ url: "/api/og/verse", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og/verse"],
  },
};

export default function PublicHomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.5]" aria-hidden />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Acts 20:28 &middot; The Watch</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-5xl text-[clamp(3rem,9vw,8.5rem)] text-iron">
            Stand guard.
            <br />
            <span className="text-brass">Protect the flock.</span>
            <br />
            Live with purpose.
          </h1>
          <p className="mt-10 max-w-xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            We are men of faith who embrace the protector calling. We stand
            between wolves and sheep. We guard what matters. We live ready.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Button
                asChild
                size="lg"
                className="lift group h-12 rounded-none border border-iron bg-iron px-8 text-base text-bone hover:bg-iron/90"
              >
                <Link href="/get-started">
                  Join the brotherhood
                  <Icon
                    name="arrow-right"
                    size={18}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="lift h-12 rounded-none border border-iron/30 bg-transparent px-8 text-base text-iron hover:border-iron hover:bg-iron/5"
              >
                <Link href="/locations">
                  <Icon name="map-pin" size={18} className="mr-2" />
                  Find a group
                </Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-iron text-bone">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-28 md:grid-cols-[2fr_3fr] md:gap-20 md:px-12 md:py-40">
          <div>
            <div className="flex items-center gap-4">
              <span className="section-mark">§ II &middot; The Calling</span>
            </div>
            <div className="hairline mt-3" />
            <h2 className="display-xl mt-8 text-4xl text-bone md:text-5xl">
              Brothers, welcome.
            </h2>
          </div>
          <div className="space-y-6 font-pullquote text-xl leading-relaxed text-stone md:text-2xl">
            <p>
              We gather as men who recognize a hard truth. Every one of us was
              born a sinner.
            </p>
            <p>
              But by His sovereign grace, through the power of the Gospel, He
              transforms wolves into sheepdogs under the Great Shepherd, Jesus
              Christ.
            </p>
          </div>
        </div>
      </section>

      {/* Verse plate — the Acts 20:28 screenshot moment */}
      <VersePlate />

      {/* Why We Exist */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ III &middot; Why We Exist</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-4xl md:text-6xl">
            Transformed wolves, turned sheepdogs.
          </h2>
          <p className="mt-6 max-w-xl font-pullquote text-xl italic leading-relaxed text-iron/70">
            Living out Acts 20:28 with fearless faith.
          </p>
          <div className="mt-16 grid gap-px bg-iron/10 md:grid-cols-3">
            {[
              {
                icon: "shield" as const,
                roman: "I",
                title: "Protect",
                copy: "We guard our faith, families, and communities against spiritual and physical threats.",
              },
              {
                icon: "brothers" as const,
                roman: "II",
                title: "Fellowship",
                copy: "We sharpen one another through brotherhood, training, and shared burdens.",
              },
              {
                icon: "flame" as const,
                roman: "III",
                title: "Serve",
                copy: "We lead with sacrificial love as protectors, providers, and under-shepherds.",
              },
            ].map((item) => (
              <Spotlight
                key={item.title}
                size={520}
                color="var(--color-brass)"
                className="lift bg-bone"
              >
                <article className="relative p-10 md:p-12">
                  <div className="flex items-center justify-between">
                    <Icon
                      name={item.icon}
                      size={44}
                      strokeWidth={2}
                      className="text-brass"
                    />
                    <span className="section-mark">§ {item.roman}</span>
                  </div>
                  <h3 className="display-xl mt-12 text-3xl text-iron">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-xs text-base leading-relaxed text-iron/70">
                    {item.copy}
                  </p>
                </article>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>

      {/* How We Gather */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ IV &middot; How We Gather</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl text-bone md:text-6xl">
              Four rhythms.
              <br />
              One brotherhood.
            </h2>
            <p className="font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
              Weekly. Monthly. Quarterly. Yearly. We gather in person, eat
              together, climb together, and stand watch together.
            </p>
          </div>
          <ol className="mt-20 divide-y divide-stone/15 border-y border-stone/15">
            {[
              {
                icon: "scroll" as const,
                roman: "I",
                title: "Weekly studies",
                rhythm: "Every week",
                copy: "We meet weekly to dig into Scripture. Small groups. Hard questions. Real answers. Men sharpening men.",
              },
              {
                icon: "table" as const,
                roman: "II",
                title: "Monthly meals",
                rhythm: "Every month",
                copy: "Once a month, we break bread together. Good food. Good fellowship. Time to connect beyond the study.",
              },
              {
                icon: "calendar" as const,
                roman: "III",
                title: "Quarterly gatherings",
                rhythm: "Every quarter",
                copy: "Four times a year, we gather the whole brotherhood. Worship. Teaching. Vision casting.",
              },
              {
                icon: "mountain" as const,
                roman: "IV",
                title: "Annual camping",
                rhythm: "Every year",
                copy: "Once a year, we head to the wilderness. Campfires. Stars. Stories. Time away from the noise to hear God clearly.",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="grid grid-cols-[auto_1fr] gap-6 py-10 md:grid-cols-[80px_120px_1fr_auto] md:items-start md:gap-12 md:py-16"
              >
                <span className="section-mark text-brass md:pt-2">
                  § {item.roman}
                </span>
                <Icon
                  name={item.icon}
                  size={48}
                  strokeWidth={2}
                  className="text-brass md:mt-1"
                />
                <div className="col-span-2 md:col-span-1">
                  <h3 className="display-xl text-2xl text-bone md:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-base leading-relaxed text-stone md:text-lg">
                    {item.copy}
                  </p>
                </div>
                <span className="col-span-2 section-mark text-stone/60 md:col-span-1 md:pt-3">
                  {item.rhythm}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <Icon
            name="sheepdog-rest"
            size={88}
            strokeWidth={2}
            className="mx-auto text-brass"
          />
          <h2 className="display-xl mt-12 text-3xl md:text-5xl">
            Forth as sheepdogs, under the Shepherd of God.
          </h2>
          <p className="mt-6 font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Fierce, faithful, and forever His.
          </p>
          <p className="mt-10 section-mark">Glory to God</p>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Button
                asChild
                size="lg"
                className="lift group h-12 rounded-none border border-iron bg-iron px-8 text-base text-bone hover:bg-iron/90"
              >
                <Link href="/get-started">
                  Join the brotherhood
                  <Icon
                    name="arrow-right"
                    size={18}
                    className="ml-2 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.18}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="lift h-12 rounded-none border border-iron/30 bg-transparent px-8 text-base text-iron hover:border-iron hover:bg-iron/5"
              >
                <Link href="/locations">
                  <Icon name="map-pin" size={18} className="mr-2" />
                  Find a group
                </Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </section>
    </>
  );
}
