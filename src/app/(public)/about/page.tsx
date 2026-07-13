import { Fragment } from "react";
import { Ambient } from "@/components/motion/Ambient";
import type { Metadata } from "next";
import { Icon } from "@/components/icons/Icon";
import { Kicker } from "@/components/public/kicker";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getSiteTextMap();
  return {
    title: t["about.meta.title"],
    description: t["about.meta.description"],
  };
}

export default async function AboutPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="nw-hero bg-background text-foreground">
          <Ambient soft />
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="About · The Watch" />
          <h1 className="display-xl mt-10 max-w-4xl text-display-xl">
            {t["about.hero.headline1"]}
            <br />
            <em>{t["about.hero.headline2"]}</em>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-lede italic leading-relaxed text-muted-foreground">
            {t["about.hero.paragraph"]}
          </p>
        </div>
      </section>
    ),
    mission: (
      <section className="bg-background text-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-28 md:grid-cols-[2fr_3fr] md:gap-20 md:px-12 md:py-40">
          <div>
            <Kicker left="I · Mission" />
            <h2 className="display-xl mt-8 text-display-lg">
              Our mission.
            </h2>
          </div>
          <p className="font-pullquote text-xl leading-relaxed text-muted-foreground md:text-2xl">
            {t["about.mission.body"]}
          </p>
        </div>
      </section>
    ),
    foundation: (
      <section className="ember-band">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="II · Foundation" />
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-display-lg">
              Acts 20:28.
              <br />
              <em>The verse we live by.</em>
            </h2>
            <div className="space-y-6">
              <p className="section-mark">§ Acts 20:28</p>
              <blockquote className="font-pullquote text-2xl italic leading-relaxed md:text-4xl">
                Keep watch over yourselves and all the flock. Be shepherds of
                the church of God, which he bought with his own blood.
              </blockquote>
              <p className="section-mark text-brass">Acts 20:28 &middot; ESV</p>
              <p className="text-base leading-relaxed md:text-lg">
                {t["about.foundation.body"]}
              </p>
            </div>
          </div>
        </div>
      </section>
    ),
    leadership: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="III · Leadership" />
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-display-lg">
              A starfish,
              <br />
              <em>not a spider.</em>
            </h2>
            <div className="space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>{t["about.leadership.p1"]}</p>
              <p>{t["about.leadership.p2"]}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    believe: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="IV · What We Believe" />
          <h2 className="display-xl mt-10 max-w-3xl text-display-lg">
            Three convictions.
          </h2>
          <StaggerReveal className="mt-16 grid gap-px bg-background/10 md:grid-cols-3">
            {[
              {
                icon: "scroll" as const,
                roman: "I",
                title: t["about.believe.1.title"],
                copy: t["about.believe.1.copy"],
              },
              {
                icon: "flame" as const,
                roman: "II",
                title: t["about.believe.2.title"],
                copy: t["about.believe.2.copy"],
              },
              {
                icon: "brothers" as const,
                roman: "III",
                title: t["about.believe.3.title"],
                copy: t["about.believe.3.copy"],
              },
            ].map((item) => (
              <article
                key={item.title}
                className="spotlight lift bg-card border border-foreground/15 p-10 md:p-12"
              >
                <div className="flex items-center justify-between">
                  <Icon
                    name={item.icon}
                    size={44}
                    strokeWidth={2}
                    className="text-brass"
                  />
                  <span className="section-mark">§ {item.roman}</span>
                </div>
                <h3 className="display-soft mt-12 text-display-md">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">
                  {item.copy}
                </p>
              </article>
            ))}
          </StaggerReveal>
        </div>
      </section>
    ),
    culture: (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="V · Our Culture" />
          <h2 className="display-xl mt-10 max-w-3xl text-display-lg">
            How we hold the line.
          </h2>
          <ol className="mt-16 divide-y divide-foreground/10 border-y border-foreground/15">
            {[
              {
                roman: "I",
                heading: t["about.culture.1.heading"],
                copy: t["about.culture.1.copy"],
              },
              {
                roman: "II",
                heading: t["about.culture.2.heading"],
                copy: t["about.culture.2.copy"],
              },
              {
                roman: "III",
                heading: t["about.culture.3.heading"],
                copy: t["about.culture.3.copy"],
              },
              {
                roman: "IV",
                heading: t["about.culture.4.heading"],
                copy: t["about.culture.4.copy"],
              },
            ].map((item) => (
              <li
                key={item.heading}
                className="grid grid-cols-[60px_1fr] gap-6 py-10 md:grid-cols-[80px_280px_1fr] md:gap-12 md:py-14"
              >
                <span className="section-mark text-brass md:pt-2">
                  § {item.roman}
                </span>
                <h3 className="display-soft col-span-1 text-display-md">
                  {item.heading}
                </h3>
                <p className="col-span-2 text-base leading-relaxed text-muted-foreground md:col-span-1 md:text-lg">
                  {item.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("about", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
