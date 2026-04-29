import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { IssueKicker } from "@/components/public/issue-kicker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let row: typeof locations.$inferSelect | undefined;
  try {
    [row] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, slug), eq(locations.status, "active")))
      .limit(1);
  } catch {
    row = undefined;
  }
  if (!row) notFound();

  return (
    <article className="px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <IssueKicker
          parts={[
            "Group",
            `${row.city}, ${row.state}`,
            [row.meetingDay, row.meetingTime].filter(Boolean).join(" · ") ||
              null,
          ]}
        />
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
          {row.name}
        </h1>
        {row.description ? (
          <p className="mt-6 font-body text-[19px] text-iron leading-relaxed">
            {row.description}
          </p>
        ) : null}

        <section className="mt-12 grid sm:grid-cols-2 gap-6 border-y border-stone py-8">
          <Detail label="When" value={[row.meetingDay, row.meetingTime].filter(Boolean).join(" · ")} />
          <Detail label="Where" value={row.meetingPlace ? row.meetingPlace : `${row.city}, ${row.state}`} />
          <Detail
            label="Capacity"
            value={
              row.maxSize
                ? `${row.groupSize ?? 0} of ${row.maxSize}`
                : null
            }
          />
          {row.contactName ? (
            <Detail label="Led by" value={row.contactName} />
          ) : null}
        </section>

        <section className="mt-12 border border-stone p-8 bg-bone">
          <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">
            I&apos;m interested
          </h2>
          <p className="font-body text-sm text-olive mb-6">
            Send a quick note. The leader will reach out within a few days. We
            never share your contact info publicly.
          </p>
          <p className="font-body text-sm text-olive italic">
            Inquiry form coming in the next phase.
          </p>
        </section>

        <footer className="mt-12 pt-8 border-t border-stone">
          <Link
            href="/groups"
            className="font-body text-sm text-brass hover:text-iron underline underline-offset-4"
          >
            ← All groups
          </Link>
        </footer>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-body uppercase tracking-[0.18em] text-xs text-brass mb-1">
        {label}
      </p>
      <p className="font-body text-base text-iron">{value}</p>
    </div>
  );
}
