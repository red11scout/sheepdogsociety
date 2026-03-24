"use client";

import { useEffect, useState } from "react";
import { LocationMap, type LocationPin } from "@/components/map/location-map";
import { LocationCard } from "@/components/map/location-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Plus } from "lucide-react";
import Link from "next/link";

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

  return (
    <>
      <title>Find a Location — SheepDog Society</title>
      <meta
        name="description"
        content="Find a Sheepdog Society group near you. Weekly Bible studies for men, open to all."
      />

      {/* Hero */}
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl text-center">
          <MapPin className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">Find a Location</h1>
          <p className="mt-2 text-muted-foreground">
            Discover a Sheepdog Society group near you. Weekly studies open to
            all men.
          </p>
        </div>
      </section>

      {/* Search + Filter */}
      <section className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by city, state, or group name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Day of week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/locations/request">
                <Plus className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Start a Group</span>
                <span className="sm:hidden">Start</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Map + Results */}
      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Map */}
            <div className="lg:col-span-2">
              <LocationMap
                locations={filtered}
                className="h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg border border-border"
              />
            </div>

            {/* Results List */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${filtered.length} Location${filtered.length !== 1 ? "s" : ""}`}
              </h2>
              <div className="max-h-[300px] sm:max-h-[360px] lg:max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {filtered.map((loc) => (
                  <LocationCard key={loc.id} location={loc} />
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <p>No locations found.</p>
                    <Button asChild variant="link" size="sm" className="mt-2">
                      <Link href="/locations/request">
                        Start a group in your area
                      </Link>
                    </Button>
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
