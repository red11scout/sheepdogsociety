import { Icon } from "@/components/icons/Icon";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "How We Gather — Sheepdog Society",
  description:
    "Weekly studies, monthly meals, quarterly gatherings, and annual camping. Four rhythms that hold the brotherhood together.",
};

const rhythms = [
  {
    icon: "scroll" as const,
    roman: "I",
    title: "Weekly studies",
    cadence: "Every week",
    sub: "The core",
    copy: "Small groups of two to twelve men meet weekly at a consistent time and place. This is the heartbeat of Sheepdog Society. Each man reads Scripture aloud. We discuss what God is showing us, sharpen one another, and end with a Circle of Prayer.",
    notes: [
      "Group size: two to twelve men (ideal range)",
      "Each man reads aloud from Scripture",
      "Open discussion on real-life application",
      "Every gathering ends with the Circle of Prayer",
      "Any man is welcome to lead",
    ],
  },
  {
    icon: "table" as const,
    roman: "II",
    title: "Monthly meals",
    cadence: "Every month",
    sub: "Break bread",
    copy: "Once a month, share a meal with your brothers. Deepen relationships. Connect beyond the study. Combine with another local group when you want to widen the table.",
    notes: [],
  },
  {
    icon: "calendar" as const,
    roman: "III",
    title: "Quarterly gatherings",
    cadence: "Every quarter",
    sub: "All groups converge",
    copy: "Four times a year, all local small groups gather for a convergence. Bigger events with guest speakers, stories from group leaders, competitions, cookouts, and food trucks. A reminder that you are part of something bigger.",
    notes: [],
  },
  {
    icon: "mountain" as const,
    roman: "IV",
    title: "Annual camping",
    cadence: "Every year",
    sub: "The big gathering",
    copy: "Once a year, we head to the wilderness. Campfires under the stars. Stories of transformation. Teaching that goes deep. Time away from the noise to hear God clearly and bond with brothers from across the region.",
    notes: [],
  },
];

const guidelines = [
  {
    label: "Ideal size: two to twelve men.",
    body: "Small enough for real conversation. Large enough for iron to sharpen iron.",
  },
  {
    label: "If you routinely get over twelve, split.",
    body: "Don't split because twenty showed up one weekend. Split when it is consistently over twelve.",
  },
  {
    label: "When you split, plant.",
    body: "Apply for a new location and identify new leadership. This creates more leaders and extends the brotherhood.",
  },
];

export default function HowWeGatherPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bone text-ink">
        <div className="dotted-grid absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ How We Gather</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)]">
            Four rhythms.
            <br />
            <span className="text-brass">One brotherhood.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-iron/70 md:text-2xl">
            Weekly. Monthly. Quarterly. Yearly. We gather in person, eat
            together, climb together, and stand watch together.
          </p>
        </div>
      </section>

      {/* Rhythms */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <ol className="divide-y divide-stone/15 border-y border-stone/15">
            {rhythms.map((r) => (
              <li key={r.title} className="py-12 md:py-20">
                <div className="grid gap-8 md:grid-cols-[120px_1fr_240px] md:gap-12">
                  <div className="flex flex-col gap-4">
                    <span className="section-mark text-brass">§ {r.roman}</span>
                    <Icon
                      name={r.icon}
                      size={56}
                      strokeWidth={2}
                      className="text-brass"
                    />
                  </div>
                  <div>
                    <span className="section-mark text-stone/60">{r.sub}</span>
                    <h2 className="display-xl mt-3 text-3xl text-foreground md:text-5xl">
                      {r.title}
                    </h2>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone md:text-lg">
                      {r.copy}
                    </p>
                    {r.notes.length > 0 && (
                      <ul className="mt-8 space-y-2 text-sm text-stone/80">
                        {r.notes.map((note) => (
                          <li
                            key={note}
                            className="flex items-start gap-3 leading-relaxed"
                          >
                            <span
                              className="mt-2 inline-block h-px w-3 shrink-0 bg-brass"
                              aria-hidden
                            />
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="md:text-right">
                    <span className="section-mark text-brass">{r.cadence}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Guidelines */}
      <section className="bg-bone text-ink">
        <div className="mx-auto max-w-7xl px-6 py-28 md:px-12 md:py-40">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Group size guidelines</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[2fr_3fr] md:gap-20">
            <h2 className="display-xl text-4xl md:text-6xl">
              Two to twelve.
              <br />
              <span className="text-brass">Then plant another.</span>
            </h2>
            <div className="space-y-8">
              {guidelines.map((g) => (
                <div key={g.label} className="border-l-2 border-brass pl-6">
                  <p className="display-xl text-xl text-iron md:text-2xl">
                    {g.label}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-iron/70">
                    {g.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center md:px-12 md:py-40">
          <Icon
            name="sheepdog-rest"
            size={88}
            strokeWidth={2}
            className="mx-auto text-brass"
          />
          <h2 className="display-xl mt-10 text-3xl text-foreground md:text-5xl">
            Find a group, or plant one.
          </h2>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="lift h-12 rounded-none border border-bone bg-bone px-8 text-base text-ink hover:bg-stone"
            >
              <Link href="/groups">
                <Icon name="map-pin" size={18} className="mr-2" />
                Find a group
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="lift h-12 rounded-none border border-bone/30 bg-transparent px-8 text-base text-foreground hover:border-bone hover:bg-bone/5"
            >
              <Link href="/join?path=start">
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
