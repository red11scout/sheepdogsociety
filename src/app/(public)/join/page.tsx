import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { MemberSignup, type GroupOption } from "@/components/MemberSignup";
import { PlantRequestForm } from "@/components/public/plant-request-form";
import { Kicker } from "@/components/public/kicker";
import { Icon, type IconName } from "@/components/icons/Icon";

export const metadata: Metadata = {
  title: "Join — Sheepdog Society",
  description:
    "Find a table near you. Or plant one where you live. Either way, do not stand alone.",
};

export const revalidate = 60;

async function getGroupOptions(): Promise<GroupOption[]> {
  try {
    const rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
      })
      .from(locations)
      .where(eq(locations.status, "active"))
      .orderBy(asc(locations.city), asc(locations.name))
      .limit(50);

    return rows.map((r) => {
      const place = [r.city, r.state].filter(Boolean).join(", ");
      const time = [r.meetingDay, r.meetingTime].filter(Boolean).join(" ");
      const head = r.name && r.name.trim() ? r.name : place || "Group";
      const tail = [place && head !== place ? place : null, time]
        .filter(Boolean)
        .join(" · ");
      // Middot, not the live file's em-dash: user-facing copy, and the
      // voice constraint bans em-dashes where a separator works.
      return { id: r.id, label: tail ? `${head} · ${tail}` : head };
    });
  } catch {
    return [];
  }
}

/** The five core principles, rehomed verbatim from the retired /get-started. */
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

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; path?: string }>;
}) {
  const sp = await searchParams;
  const path = sp.path === "start" ? "start" : "join";
  const groups = path === "join" ? await getGroupOptions() : [];
  const preselectedGroupId = sp.group;

  return (
    <>
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
          <Kicker left="Sit at the table" right="No application · No interview" />
          <h1 className="display-xl mt-10 text-display-xl">
            There is a chair.
            <br />
            <em>Sit in it.</em>
          </h1>
          <p className="dropcap mt-8 max-w-2xl font-scripture text-lg text-foreground/85">
            You do not need to have your life cleaned up. Tell us where you
            are. We will help you find a table.
          </p>

          {/* Two paths */}
          <nav aria-label="Join paths" className="mt-12 grid gap-px border border-foreground/15 bg-foreground/15 md:grid-cols-2">
            <Link
              href="/join"
              aria-current={path === "join" ? "page" : undefined}
              className={`block p-6 transition-colors ${
                path === "join"
                  ? "bg-card"
                  : "bg-background hover:bg-foreground/[0.03]"
              }`}
            >
              <span className={`section-mark ${path === "join" ? "" : "text-muted-foreground"}`}>
                I · Join a group
              </span>
              <p className="mt-2 font-display text-xl">Find a table near you.</p>
            </Link>
            <Link
              href="/join?path=start"
              aria-current={path === "start" ? "page" : undefined}
              className={`block p-6 transition-colors ${
                path === "start"
                  ? "bg-card"
                  : "bg-background hover:bg-foreground/[0.03]"
              }`}
            >
              <span className={`section-mark ${path === "start" ? "" : "text-muted-foreground"}`}>
                II · Start one
              </span>
              <p className="mt-2 font-display text-xl">
                Ready to lead? Plant a table where you live.
              </p>
            </Link>
          </nav>

          <div className="mt-12">
            {path === "start" ? (
              <PlantRequestForm />
            ) : (
              <MemberSignup
                groups={groups}
                preselectedGroupId={preselectedGroupId}
                source="/join"
              />
            )}
          </div>
        </div>
      </section>

      {/* Five core principles — what you are joining */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="Five core principles" right="Know before you come" />
          <ul className="mt-8 divide-y divide-foreground/10 border-y border-foreground/15">
            {principles.map((p) => (
              <li key={p.title} className="grid gap-3 py-6 md:grid-cols-[64px_1fr] md:items-start">
                <span className="flex items-center gap-3 md:flex-col md:items-start">
                  <Icon name={p.icon} size={24} strokeWidth={2} className="text-brass" />
                  <span className="section-mark">{p.roman}</span>
                </span>
                <span>
                  <h3 className="font-display text-xl">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {p.copy}
                  </p>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Want the full picture first?{" "}
            <Link href="/what-to-expect" className="link-editorial">
              What to expect at a table
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
