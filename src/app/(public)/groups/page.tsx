import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Kicker } from "@/components/public/kicker";
import { Icon } from "@/components/icons/Icon";
import { GroupsBrowser } from "@/components/public/groups-browser";
import type { LocationPin } from "@/components/map/location-map";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Groups — Sheepdog Society",
  description:
    "Find a Sheepdog Society group near you. Weekly Bible studies for men, open to all.",
};

/** Same visibility gate as the public map API: displayedOnMap AND isActive. */
async function getPins(): Promise<LocationPin[]> {
  try {
    return await db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
        latitude: locations.latitude,
        longitude: locations.longitude,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        meetingPlace: locations.meetingPlace,
        groupSize: locations.groupSize,
        maxSize: locations.maxSize,
        contactName: locations.contactName,
      })
      .from(locations)
      .where(and(eq(locations.displayedOnMap, true), eq(locations.isActive, true)))
      .orderBy(asc(locations.city), asc(locations.name));
  } catch {
    return [];
  }
}

export default async function GroupsPage() {
  const pins = await getPins();
  const totalMen = pins.reduce((acc, l) => acc + (l.groupSize ?? 0), 0);

  return (
    <>
      {/* Hero */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
          <Kicker left="The outposts" right="Come as you are" />
          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr] md:items-end md:gap-20">
            <h1 className="display-xl text-display-xl">
              Find a group.
              <br />
              <em>Or plant one.</em>
            </h1>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="display-xl text-4xl text-brass-deep md:text-6xl">
                  {pins.length}
                </p>
                <p className="folio mt-2">Active groups</p>
              </div>
              {totalMen > 0 && (
                <div>
                  <p className="display-xl text-4xl text-brass-deep md:text-6xl">
                    {totalMen}
                  </p>
                  <p className="folio mt-2">Men gathering</p>
                </div>
              )}
            </div>
          </div>
          <p className="mt-8 max-w-2xl font-pullquote text-lede italic text-muted-foreground">
            We meet in diners, coffee shops, gyms, garages. Wherever two or
            more can sit with the Word.
          </p>
        </div>
      </section>

      {/* Map + ledger */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <GroupsBrowser pins={pins} />
        </div>
      </section>

      {/* Plant CTA */}
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10 md:pb-28">
          <Kicker left="No group near you?" />
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <h2 className="display-xl text-display-md">Plant a table where you live.</h2>
            <Link
              href="/join?path=start"
              className="lift inline-flex h-12 items-center gap-3 bg-foreground px-7 text-base font-medium text-background"
            >
              Start a group
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
