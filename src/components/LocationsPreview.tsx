"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LocationMap, type LocationPin } from "@/components/map/location-map";
import { Icon } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { Magnetic } from "@/components/motion/Magnetic";

export function LocationsPreview() {
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/locations")
      .then((r) => r.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalMen = locations.reduce((acc, l) => acc + (l.groupSize ?? 0), 0);
  const cities = new Set(locations.map((l) => `${l.city}-${l.state}`)).size;

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div className="border-t border-stone/15">
        <div className="mx-auto max-w-7xl px-6 pt-24 md:px-12 md:pt-32">
          <div className="flex items-center gap-4">
            <span className="section-mark text-brass">§ The Outposts</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr] md:items-end md:gap-20">
            <h2 className="display-xl text-[clamp(2.5rem,7vw,6rem)] text-foreground">
              Where men are
              <br />
              <span className="text-brass">already gathering.</span>
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <Stat label="Cities" value={cities} loading={loading} />
              <Stat label="Groups" value={locations.length} loading={loading} />
              <Stat label="Men" value={totalMen} loading={loading} />
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-7xl px-6 md:px-12">
          <div className="relative h-[460px] border border-stone/15 md:h-[600px]">
            <LocationMap locations={locations} className="h-full" />
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "linear-gradient(to bottom, transparent 70%, color-mix(in oklab, var(--color-iron) 100%, transparent) 100%)",
              }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-28 pt-10 md:px-12 md:pb-40 md:pt-14">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p className="max-w-md font-pullquote text-xl italic leading-relaxed text-stone">
              We meet in diners, coffee shops, gyms, garages. Wherever two or
              more can sit with the Word.
            </p>
            <div className="flex flex-wrap gap-4">
              <Magnetic>
                <Link
                  href="/groups"
                  className="lift group inline-flex h-12 items-center gap-2 border border-bone bg-bone px-7 text-base font-medium text-ink transition-colors hover:bg-stone"
                >
                  See every group
                  <Icon
                    name="arrow-right"
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Link
                  href="/join?path=start"
                  className="lift inline-flex h-12 items-center gap-2 border border-stone/30 bg-transparent px-7 text-base font-medium text-foreground transition-colors hover:border-brass hover:text-brass"
                >
                  Plant one
                  <Icon name="plus" size={16} />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div>
      <div className="display-xl text-3xl text-brass md:text-5xl">
        {loading ? "..." : <CountUp to={value} />}
      </div>
      <div className="mt-2 section-mark text-stone/55">{label}</div>
    </div>
  );
}
