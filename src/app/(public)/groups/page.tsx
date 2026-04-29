import Link from "next/link";
import { db } from "@/db";
import { locations, groupLeaders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

export const metadata = {
  title: "Bible Study Groups — Acts 2028 Sheepdog Society",
  description:
    "Find a Bible study group near you. Brotherhoods of Christian men meeting weekly to study Scripture and sharpen one another.",
};

export default async function GroupsIndexPage() {
  let allGroups: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    meetingDay: string | null;
    meetingTime: string | null;
    description: string | null;
    leaderName: string | null;
  }> = [];
  try {
    allGroups = await db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        description: locations.description,
        leaderName: groupLeaders.name,
      })
      .from(locations)
      .leftJoin(groupLeaders, eq(groupLeaders.id, locations.id)) // placeholder join
      .where(eq(locations.status, "active"));
  } catch {
    allGroups = [];
  }

  return (
    <>
      <section className="px-6 pt-20 pb-12 border-b border-stone/40">
        <div className="mx-auto max-w-6xl">
          <IssueKicker parts={["Find a Group"]} />
          <h1 className="mt-3 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl">
            Brotherhoods of men, meeting around tables.
          </h1>
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive max-w-3xl leading-relaxed">
            Bible study groups in cities across the country. Tuesday morning at
            the diner. Thursday night in someone&apos;s living room. Iron sharpens
            iron.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {allGroups.length === 0 ? (
            <EmptyGroups />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-stone/40 px-6 py-16 bg-iron text-bone">
        <div className="mx-auto max-w-3xl text-center">
          <IssueKicker parts={["Start a Group"]} className="text-stone" />
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
            No group near you?
          </h2>
          <p className="mt-4 font-body text-base text-stone leading-relaxed max-w-prose mx-auto">
            We&apos;ll help you start one. Three or four men, a Bible, a regular
            time, a place. That&apos;s the whole thing.
          </p>
          <Link
            href="/groups/start"
            className="mt-8 inline-block rounded-full bg-bone px-6 py-3 font-body font-semibold text-iron hover:bg-stone transition-colors"
          >
            Start a group →
          </Link>
        </div>
      </section>
    </>
  );
}

function EmptyGroups() {
  return (
    <div className="text-center py-16">
      <p className="font-display text-3xl text-iron">
        Groups are forming.
      </p>
      <p className="mt-4 font-body text-base text-olive">
        We&apos;re seeding the first cohort. If you&apos;re ready to lead one,{" "}
        <Link href="/groups/start" className="text-brass underline underline-offset-4">
          let us know
        </Link>
        .
      </p>
    </div>
  );
}

function GroupCard({
  group,
}: {
  group: {
    id: string;
    name: string;
    city: string;
    state: string;
    meetingDay: string | null;
    meetingTime: string | null;
    description: string | null;
    leaderName: string | null;
  };
}) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block border border-stone p-6 hover:border-iron transition-colors"
    >
      <p className="font-body uppercase tracking-[0.18em] text-xs text-olive">
        {group.city}, {group.state}
      </p>
      <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        {group.name}
      </h3>
      {group.meetingDay || group.meetingTime ? (
        <p className="mt-2 font-body text-sm text-olive">
          {[group.meetingDay, group.meetingTime].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {group.description ? (
        <p className="mt-4 font-body text-sm text-olive line-clamp-2">
          {group.description}
        </p>
      ) : null}
    </Link>
  );
}
