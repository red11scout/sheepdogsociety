"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LocationMap, type LocationPin } from "@/components/map/location-map";
import { LocationCard } from "@/components/map/location-card";
import { Icon } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { Magnetic } from "@/components/motion/Magnetic";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationPin[]>([]);
  const [filtered, setFiltered] = useState<LocationPin[]>([]);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/locations")
      .then((r) => r.json())
      .then((data) => {
        setLocations(data.locations ?? []);
        setFiltered(data.locations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = locations;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.state.toLowerCase().includes(q)
      );
    }

    if (dayFilter !== "all") {
      result = result.filter(
        (l) => l.meetingDay?.toLowerCase() === dayFilter.toLowerCase()
      );
    }

    setFiltered(result);
  }, [search, dayFilter, locations]);

  const totalMen = locations.reduce(
    (acc, l) => acc + (l.groupSize ?? 0),
    0
  );

  return (
    <>
      <title>Find a group — Sheepdog Society</title>
      <meta
        name="description"
        content="Find a Sheepdog Society group near you. Weekly Bible studies for men, open to all."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-iron text-bone">
        <div className="aurora" aria-hidden />
        <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-12 md:py-32">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ The Outposts</span>
            <div className="hairline flex-1" />
          </div>
          <div className="mt-10 grid gap-12 md:grid-cols-[3fr_2fr] md:gap-20 md:items-end">
            <h1 className="display-xl text-[clamp(2.5rem,7vw,6.5rem)] text-bone">
              Find a group.
              <br />
              <span className="text-brass">Or plant one.</span>
            </h1>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="display-xl text-4xl text-brass md:text-6xl">
                  {loading ? "..." : <CountUp to={locations.length} />}
                </div>
                <div className="mt-2 section-mark text-stone/60">
                  Active groups
                </div>
              </div>
              {totalMen > 0 && (
                <div>
                  <div className="display-xl text-4xl text-brass md:text-6xl">
                    {loading ? "..." : <CountUp to={totalMen} />}
                  </div>
                  <div className="mt-2 section-mark text-stone/60">
                    Men gathering
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Search + Filter Bar */}
      <section className="border-b border-iron/10 bg-bone">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:px-12">
          <div className="relative flex-1">
            <Icon
              name="search"
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-iron/40"
            />
            <input
              type="text"
              placeholder="City, state, or group name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full border border-iron/15 bg-transparent pl-11 pr-4 text-sm text-iron placeholder:text-iron/40 focus:border-brass focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="h-11 border border-iron/15 bg-transparent px-4 text-sm text-iron focus:border-brass focus:outline-none md:w-[160px]"
            >
              <option value="all">All days</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <Magnetic strength={0.18}>
              <Link
                href="/locations/request"
                className="lift inline-flex h-11 shrink-0 items-center gap-2 border border-iron bg-iron px-5 text-xs font-medium uppercase tracking-wider text-bone transition-colors hover:bg-iron/90"
              >
                <Icon name="plus" size={14} />
                <span className="hidden sm:inline">Plant a group</span>
                <span className="sm:hidden">Plant</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* Map + Results */}
      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-12 md:py-14">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LocationMap
                locations={filtered}
                className="h-[420px] border border-iron/15 sm:h-[520px] lg:h-[600px]"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="section-mark">
                  {loading
                    ? "Loading"
                    : `${filtered.length} ${filtered.length === 1 ? "Result" : "Results"}`}
                </span>
                <span className="section-mark text-brass">
                  {dayFilter !== "all" ? dayFilter : "All days"}
                </span>
              </div>
              <div className="hairline mt-3" />
              <div className="mt-4 max-h-[600px] space-y-2 overflow-y-auto pr-1">
                {filtered.map((loc) => (
                  <LocationCard key={loc.id} location={loc} />
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="border border-dashed border-iron/15 p-8 text-center">
                    <Icon
                      name="map-pin"
                      size={32}
                      strokeWidth={2}
                      className="mx-auto text-iron/30"
                    />
                    <p className="mt-4 font-pullquote text-lg italic text-iron/60">
                      No groups in this view.
                    </p>
                    <Link
                      href="/locations/request"
                      className="mt-4 inline-flex items-center gap-2 section-mark text-brass hover:opacity-70"
                    >
                      Plant one
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
