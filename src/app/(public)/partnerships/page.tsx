import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";

export const metadata = {
  title: "Partnerships — Sheepdog Society",
  description:
    "Bring the Sheepdog brotherhood to your church, men's group, community, school, or athletic team.",
};

const partnerships: {
  icon: IconName;
  roman: string;
  title: string;
  copy: string;
}[] = [
  {
    icon: "watchtower",
    roman: "I",
    title: "Through a church",
    copy: "Partner your church's men's ministry with the Sheepdog framework. We provide the structure, study guides, and support. Your church provides the men and the meeting space. A natural extension of what many churches already do.",
  },
  {
    icon: "brothers",
    roman: "II",
    title: "Existing men's group",
    copy: "Already have a men's group? Adopt the Sheepdog format. Weekly Scripture study, peer-led discussions, Circle of Prayer. We help you integrate our resources and connect to the larger brotherhood.",
  },
  {
    icon: "compass",
    roman: "III",
    title: "Community group",
    copy: "Start a community-based group outside a church setting. Coffee shop, park, gym, someone's home. Two men and a Bible. We help you get started.",
  },
  {
    icon: "scroll",
    roman: "IV",
    title: "School or college",
    copy: "Launch a Sheepdog group for young men at your school, college, or university. We are building the next generation. Same principles, same format, tailored for younger men.",
  },
  {
    icon: "anchor",
    roman: "V",
    title: "Athletics",
    copy: "Pair faith-based study with your team or fitness group. Train the body and the spirit. Many groups pair a workout with their weekly study. Iron sharpening iron in every sense.",
  },
];

export default function PartnershipsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-iron">
        <div className="aurora aurora--soft" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Partnerships</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6rem)]">
            Five ways to plant.
            <br />
            <span className="text-brass">One brotherhood.</span>
          </h1>
        </div>
      </section>

      {/* Partnership types */}
      <section className="bg-iron text-bone">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <ol className="divide-y divide-stone/15 border-y border-stone/15">
            {partnerships.map((p) => (
              <li
                key={p.title}
                className="grid gap-8 py-12 md:grid-cols-[80px_80px_1fr_auto] md:items-start md:gap-12 md:py-16"
              >
                <span className="section-mark text-brass md:pt-3">
                  § {p.roman}
                </span>
                <Icon
                  name={p.icon}
                  size={48}
                  strokeWidth={2}
                  className="text-brass md:mt-1"
                />
                <div className="md:max-w-2xl">
                  <h2 className="display-xl text-2xl text-bone md:text-4xl">
                    {p.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-stone md:text-lg">
                    {p.copy}
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 section-mark text-brass transition-opacity hover:opacity-70 md:pt-3"
                >
                  Learn more
                  <Icon name="arrow-right" size={14} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bone text-iron">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <Icon
            name="hands"
            size={64}
            strokeWidth={2}
            className="mx-auto text-brass"
          />
          <h2 className="display-xl mt-10 text-3xl md:text-5xl">
            Bring the brotherhood
            <br />
            <span className="text-brass">to your community.</span>
          </h2>
          <div className="mt-12">
            <Link
              href="/contact"
              className="lift inline-flex h-12 items-center gap-2 border border-iron bg-iron px-8 text-base font-medium text-bone transition-colors hover:bg-iron/90"
            >
              Start the conversation
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
