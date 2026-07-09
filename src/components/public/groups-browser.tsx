"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocationMap, type LocationPin } from "@/components/map/location-map";
import { Icon } from "@/components/icons/Icon";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Map + search/day filter + ruled ledger of groups. Client component:
 * the filters and Mapbox need the browser; the pins arrive server-
 * fetched from the page so the list is in the HTML for crawlers.
 */
export function GroupsBrowser({ pins }: { pins: LocationPin[] }) {
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = pins;
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
    return result;
  }, [pins, search, dayFilter]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-3 border-y border-foreground/15 py-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            placeholder="City, state, or group name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full border border-foreground/15 bg-transparent pl-11 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-brass focus:outline-none"
          />
        </div>
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="h-11 border border-foreground/15 bg-transparent px-4 text-sm text-foreground focus:border-brass focus:outline-none md:w-[160px]"
        >
          <option value="all">All days</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <LocationMap
        locations={filtered}
        className="mt-6 h-[420px] border border-foreground/15 sm:h-[480px]"
      />

      {/* Ruled ledger of results */}
      <div className="mt-8 flex items-center justify-between">
        <span className="folio">
          {filtered.length} {filtered.length === 1 ? "group" : "groups"}
        </span>
        <span className="folio">{dayFilter !== "all" ? dayFilter : "All days"}</span>
      </div>
      {filtered.length > 0 ? (
        <ul className="mt-3 divide-y divide-foreground/10 border-y border-foreground/15">
          {filtered.map((loc) => {
            const memberPart =
              loc.groupSize != null && loc.groupSize > 0
                ? `${loc.groupSize} ${loc.groupSize === 1 ? "man" : "men"}`
                : null;
            const meta = [memberPart, loc.meetingDay, loc.meetingTime]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={loc.id}>
                <Link
                  href={`/groups/${loc.slug ?? loc.id}`}
                  className="group grid cursor-pointer gap-2 py-6 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8"
                >
                  <div>
                    <h3 className="font-display text-xl">{loc.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Icon name="map-pin" size={14} className="text-brass" />
                      {loc.city}, {loc.state}
                    </p>
                  </div>
                  {meta && <p className="section-mark">{meta}</p>}
                  <span className="section-mark text-muted-foreground transition-colors group-hover:text-brass">
                    Details →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 border border-dashed border-foreground/15 p-10 text-center">
          <Icon name="map-pin" size={32} strokeWidth={2} className="mx-auto text-foreground/30" />
          <p className="mt-4 font-pullquote text-lg italic text-muted-foreground">
            No groups in this view.
          </p>
          <Link
            href="/join?path=start"
            className="mt-4 inline-flex items-center gap-2 section-mark transition-colors hover:text-brass"
          >
            Plant one
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
