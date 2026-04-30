import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Spotlight } from "@/components/motion/Spotlight";

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
    copy: "Secure one-time or recurring giving through our online platform.",
    cta: "Give now",
    href: "#give-online",
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
    icon: "hands",
    roman: "III",
    title: "Partner with us",
    copy: "Become a Sheepdog Partner with ongoing monthly support.",
    cta: "Learn more",
    href: "#give-partner",
  },
];

export default function GivingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Give</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Fuel the brotherhood.
            <br />
            <span className="text-brass">Support the mission.</span>
          </h1>
        </div>
      </section>

      {/* Why we give */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Why we give</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl text-bone md:text-6xl">
              Always free
              <br />
              <span className="text-brass">for every man.</span>
            </h2>
            <div className="space-y-6 text-base leading-relaxed text-stone md:text-lg">
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
              <blockquote className="border-l-2 border-brass pl-6 font-pullquote text-xl italic text-bone md:text-2xl">
                Each of you should give what you have decided in your heart to
                give, not reluctantly or under compulsion, for God loves a
                cheerful giver.
              </blockquote>
              <p className="section-mark text-brass">2 Corinthians 9:7</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ways to give */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Ways to give</span>
            <div className="hairline flex-1" />
          </div>
          <h2 className="display-xl mt-10 max-w-3xl text-4xl md:text-6xl">
            Three ways to invest.
          </h2>
          <div className="mt-16 grid gap-px bg-iron/10 md:grid-cols-3">
            {ways.map((w) => (
              <Spotlight
                key={w.title}
                size={520}
                color="var(--color-brass)"
                className="lift bg-bone"
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
                  <h3 className="display-xl mt-12 text-2xl text-iron md:text-3xl">
                    {w.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-iron/70">
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

      {/* Partners */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <span className="section-mark text-brass">§ Sheepdog Partners</span>
          <h2 className="display-xl mt-6 text-3xl text-bone md:text-5xl">
            Churches. Organizations.
            <br />
            <span className="text-brass">Brothers.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
            Our partners believe in the Sheepdog mission and stand with us
            through prayer, resources, and giving.
          </p>
          <div className="mt-12">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 border border-bone bg-bone px-8 text-base font-medium text-iron transition-colors hover:bg-stone"
            >
              Become a partner
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
