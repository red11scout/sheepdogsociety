"use client";

/**
 * Live "Next: …" preview for series create/edit forms. Pure math; the
 * instants come from previewOccurrences and render in the admin's
 * local clock, which matches the Central wall-time intent.
 */
import { format } from "date-fns";
import {
  previewOccurrences,
  type SeriesCadence,
  type SeriesPattern,
} from "@/lib/events/series";

/** Build a SeriesPattern from a Repeats choice + datetime-local value. */
export function seriesPatternFromLocalStart(
  repeats: string,
  startLocal: string
): SeriesPattern | null {
  if (repeats === "none" || !startLocal) return null;
  const d = new Date(startLocal);
  if (Number.isNaN(d.getTime())) return null;
  return {
    cadence: repeats as SeriesCadence,
    dayOfWeek: d.getDay(),
    nthWeek:
      repeats === "monthly_nth_weekday" ? Math.ceil(d.getDate() / 7) : null,
    startTimeOfDay: startLocal.slice(11, 16),
    durationMinutes: null,
    timezone: "America/New_York",
    startDate: startLocal.slice(0, 10),
  };
}

export function NextDatesPreview({
  pattern,
  className,
}: {
  pattern: SeriesPattern | null;
  className?: string;
}) {
  if (!pattern) return null;
  let dates: Date[] = [];
  try {
    dates = previewOccurrences(pattern, new Date(), 5);
  } catch {
    return null;
  }
  if (dates.length === 0) return null;
  return (
    <p className={className}>
      Next: {dates.map((d) => format(d, "EEE MMM d, h:mm a")).join(" · ")}
    </p>
  );
}
