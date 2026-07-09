import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { Kicker } from "@/components/public/kicker";
import { Icon } from "@/components/icons/Icon";
import { GroupInterestForm } from "@/components/public/group-interest-form";

export const revalidate = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public detail payload. Same columns and gate (status = 'active') as
 * the old /api/public/locations/[id] route — contactEmail/contactPhone
 * stay admin-only, on purpose (see that route's comment). Accepts a
 * slug OR a legacy UUID (old /locations/[id] links 308 through here).
 */
async function getLocation(slugOrId: string) {
  const isUuid = UUID_RE.test(slugOrId);
  try {
    const [row] = await db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
        description: locations.description,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        meetingPlace: locations.meetingPlace,
        groupSize: locations.groupSize,
        maxSize: locations.maxSize,
        contactName: locations.contactName,
        signalGroupUrl: locations.signalGroupUrl,
      })
      .from(locations)
      .where(
        and(
          isUuid ? eq(locations.id, slugOrId) : eq(locations.slug, slugOrId),
          eq(locations.status, "active")
        )
      )
      .limit(1);
    return row ? { ...row, wasUuid: isUuid } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) return { title: "Group — Sheepdog Society" };
  return {
    title: `${loc.name} — Sheepdog Society`,
    description: `A Sheepdog Society group in ${loc.city}, ${loc.state}. Weekly Bible study for men, open to all.`,
  };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loc = await getLocation(slug);
  if (!loc) notFound();
  // Legacy UUID URL and we know the pretty slug: settle on the canonical.
  if (loc.wasUuid && loc.slug) permanentRedirect(`/groups/${loc.slug}`);

  const when = [loc.meetingDay, loc.meetingTime].filter(Boolean).join(" · ");
  const where = loc.meetingPlace || loc.address || "";

  return (
    <article className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <Kicker
          left="Gathering post"
          right={`${loc.city}, ${loc.state}`}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          {/* Left column */}
          <div className="lg:col-span-8">
            <h1 className="display-soft text-display-lg">{loc.name}</h1>
            {loc.description ? (
              <p className="dropcap mt-8 max-w-prose font-serif text-lg leading-[1.75] text-foreground/85">
                {loc.description}
              </p>
            ) : (
              <p className="mt-8 max-w-prose font-pullquote text-lede italic text-muted-foreground">
                Weekly Scripture. Honest talk. Prayer before we leave.
              </p>
            )}

            {loc.signalGroupUrl && (
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-foreground/15 bg-card p-6 md:p-8">
                <div className="flex items-center gap-4">
                  <Icon name="message" size={28} strokeWidth={2} className="text-brass" />
                  <div>
                    <p className="font-display text-lg md:text-xl">Signal group</p>
                    <p className="text-sm text-muted-foreground">
                      Join for between-meeting comms.
                    </p>
                  </div>
                </div>
                <a
                  href={loc.signalGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lift inline-flex h-11 cursor-pointer items-center gap-2 border border-foreground/70 px-5 text-xs font-medium uppercase tracking-wider transition-colors hover:border-brass"
                >
                  Join Signal
                  <Icon name="arrow-up-right" size={14} />
                </a>
              </div>
            )}

            <Link
              href="/groups"
              className="link-editorial mt-10 inline-flex items-center gap-2 text-sm"
            >
              ← All groups
            </Link>
          </div>

          {/* Right rail — the particulars */}
          <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-0">
            <p className="folio">The particulars</p>
            <dl className="mt-6 space-y-6">
              {when && (
                <div>
                  <dt className="folio">When</dt>
                  <dd className="mt-1.5 font-display text-lg">{when}</dd>
                </div>
              )}
              {where && (
                <div>
                  <dt className="folio">Where</dt>
                  <dd className="mt-1.5 font-display text-lg">{where}</dd>
                </div>
              )}
              <div>
                <dt className="folio">Group size</dt>
                <dd className="mt-1.5 font-display text-lg">
                  {loc.groupSize ?? 0} of {loc.maxSize} men
                </dd>
              </div>
              {loc.contactName && (
                <div>
                  <dt className="folio">Contact</dt>
                  <dd className="mt-1.5 font-display text-lg">{loc.contactName}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {/* Interest form */}
        <div className="mt-16 max-w-3xl border-t border-foreground/15 pt-12">
          <Kicker left="Interested?" />
          <h2 className="display-xl mt-8 text-display-md">
            Show up. We will be there.
          </h2>
          <GroupInterestForm locationId={loc.id} />
        </div>
      </div>
    </article>
  );
}
