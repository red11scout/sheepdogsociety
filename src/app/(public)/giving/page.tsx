import { Fragment } from "react";
import { Ambient } from "@/components/motion/Ambient";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Spotlight } from "@/components/motion/Spotlight";
import { Kicker } from "@/components/public/kicker";
import { getSiteTextMap } from "@/lib/site-text/get";
import { getStudioConfig } from "@/lib/studio/get";
import { renderMerge } from "@/lib/studio/config";

export const metadata = {
  title: "Give — Sheepdog Society",
  description:
    "Support the Sheepdog Society mission. Why we give and how to partner with us.",
};

const ways: { icon: IconName; roman: string; title: string; copy: string; cta: string; href: string }[] = [
  {
    icon: "key",
    roman: "I",
    title: "Give online",
    copy: "One-time or recurring support. Reach out and we will get you set up.",
    cta: "Get started",
    href: "/contact",
  },
  {
    icon: "mail",
    roman: "II",
    title: "Give by mail",
    copy: "Send a check to our mailing address. Contact us for details.",
    cta: "Contact us",
    href: "/contact",
  },
  {
    icon: "heart",
    roman: "III",
    title: "Partner with us",
    copy: "Become a Sheepdog Partner with ongoing monthly support.",
    cta: "Learn more",
    href: "#partners",
  },
];

export default async function GivingPage() {
  const [t, config] = await Promise.all([getSiteTextMap(), getStudioConfig()]);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="nw-hero bg-background text-foreground">
          <Ambient soft />
        <div className="mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <Kicker left="Give" />
          <h1 className="display-xl mt-10 max-w-4xl text-display-xl">
            {t["giving.hero.headline1"]}
            <br />
            <em>{t["giving.hero.headline2"]}</em>
          </h1>
        </div>
      </section>
    ),
    "why-we-give": (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="Why we give" />
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-display-lg">
              {t["giving.why.headline1"]}
              <br />
              <em>{t["giving.why.headline2"]}</em>
            </h2>
            <div className="space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              <p>
                Sheepdog Society is free for every man who walks through the
                door. Always has been. Always will be.
              </p>
              <p>
                Keeping this brotherhood running takes resources. Study guides,
                technology, events, camping trips. When you give, you invest
                in the spiritual growth of men across the country. Every dollar
                goes to the mission.
              </p>
              <blockquote className="border-l-2 border-brass pl-6 font-pullquote text-xl italic text-foreground md:text-2xl">
                Each of you should give what you have decided in your heart to
                give, not reluctantly or under compulsion, for God loves a
                cheerful giver.
              </blockquote>
              <p className="section-mark text-brass">2 Corinthians 9:7</p>
            </div>
          </div>
        </div>
      </section>
    ),
    "ways-to-give": (
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <Kicker left="Ways to give" />
          <h2 className="display-xl mt-10 max-w-3xl text-display-lg">{t["giving.ways.title"]}</h2>
          <div className="mt-16 grid gap-px bg-background/10 md:grid-cols-3">
            {ways.map((w) => (
              <Spotlight
                key={w.title}
                size={520}
                color="var(--color-brass)"
                className="lift bg-card border border-foreground/15"
              >
                <article className="p-10 md:p-12">
                  <div className="flex items-center justify-between">
                    <Icon
                      name={w.icon}
                      size={40}
                      strokeWidth={2}
                      className="text-brass"
                    />
                    <span className="section-mark">§ {w.roman}</span>
                  </div>
                  <h3 className="display-soft mt-12 text-display-md">
                    {w.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {w.copy}
                  </p>
                  <Link
                    href={w.href}
                    className="mt-8 inline-flex items-center gap-2 section-mark text-brass transition-opacity hover:opacity-70"
                  >
                    {w.cta}
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </article>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>
    ),
    partners: (
      <section id="partners" className="scroll-mt-24 bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <span className="section-mark text-brass">§ Sheepdog Partners</span>
          <h2 className="display-xl mt-6 text-display-lg">
            {t["giving.partners.headline1"]}
            <br />
            <em>{t["giving.partners.headline2"]}</em>
          </h2>
          <p className="mx-auto mt-8 max-w-xl font-pullquote text-xl italic leading-relaxed text-muted-foreground md:text-2xl">
            Our partners believe in the Sheepdog mission and stand with us
            through prayer, resources, and giving.
          </p>
          <div className="mt-12">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 bg-foreground px-7 text-base font-medium text-background"
            >
              Become a partner
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      {renderMerge("giving", config)
        .filter((s) => s.visible)
        .map((s) => (
          <Fragment key={s.id}>{sections[s.id]}</Fragment>
        ))}
    </>
  );
}
