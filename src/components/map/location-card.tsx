import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { LocationPin } from "./location-map";

export function LocationCard({ location }: { location: LocationPin }) {
  const memberPart =
    location.groupSize != null
      ? `${location.groupSize} ${location.groupSize === 1 ? "man" : "men"}`
      : null;
  const dayPart = location.meetingDay ?? null;
  const timePart = location.meetingTime ?? null;
  const meta = [memberPart, dayPart, timePart].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/locations/${location.id}`}
      className="group block border border-iron/10 bg-bone p-5 transition-all hover:border-brass hover:bg-bone/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="display-xl truncate text-lg text-iron md:text-xl">
            {location.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-iron/60">
            <Icon name="map-pin" size={14} className="text-brass" />
            {location.city}, {location.state}
          </p>
        </div>
        <Icon
          name="arrow-up-right"
          size={16}
          className="mt-1 text-iron/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brass"
        />
      </div>

      {meta && (
        <p className="mt-3 section-mark text-brass">
          {meta}
        </p>
      )}
    </Link>
  );
}
