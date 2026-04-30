import type { Metadata } from "next";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { MemberSignup, type GroupOption } from "@/components/MemberSignup";

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
      const tail = [place && head !== place ? place : null, time].filter(Boolean).join(" · ");
      return { id: r.id, label: tail ? `${head} — ${tail}` : head };
    });
  } catch {
    return [];
  }
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const groups = await getGroupOptions();
  const sp = await searchParams;
  const preselectedGroupId = sp.group;

  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-3xl px-6 py-24 md:px-12 md:py-32">
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Sit at the table</span>
          <div className="hairline flex-1 text-iron/40" />
        </div>
        <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-iron">
          There is a chair.
          <br />
          <span className="text-brass">Sit in it.</span>
        </h1>
        <p className="mt-8 max-w-2xl font-pullquote text-xl italic text-iron/70">
          You do not need to have your life cleaned up. Tell us where you are.
          We will help you find a table.
        </p>

        <div className="mt-16">
          <MemberSignup
            groups={groups}
            preselectedGroupId={preselectedGroupId}
            source="/join"
          />
        </div>
      </div>
    </section>
  );
}
