import Link from "next/link";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { formatMeetingTime, joinPlace } from "@/lib/format-meeting";

/**
 * The standing weekly rhythm of the active groups, rendered as the same
 * ruled ledger the events strip uses. Fallback for empty event calendars:
 * the front page never says the calendar is empty (MASTER.md — "live
 * series data, never empty"); six groups with set days ARE the calendar.
 * Renders the old apology line only if there are no groups either.
 */
export async function WeeklyLedger() {
  let rows: Array<{
    id: string;
    name: string;
    slug: string | null;
    city: string;
    state: string;
    meetingDay: string | null;
    meetingTime: string | null;
  }> = [];
  try {
    rows = await db
      .select({
        id: locations.id,
        name: locations.name,
        slug: locations.slug,
        city: locations.city,
        state: locations.state,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
      })
      .from(locations)
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true),
          ne(locations.meetingDay, "")
        )
      )
      .orderBy(asc(locations.city), asc(locations.name))
      .limit(6);
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    return (
      <p className="mt-8 font-pullquote text-lede italic text-muted-foreground">
        The calendar is refilling. Check the gatherings page.
      </p>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-foreground/10 border-y border-foreground/15">
      {rows.map((g) => (
        <li key={g.id}>
          <Link
            href={`/groups/${g.slug ?? g.id}`}
            className="group grid cursor-pointer gap-3 py-6 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[140px_1fr_auto] md:items-center md:gap-8"
          >
            <span className="display-xl text-2xl text-brass-deep">
              {(g.meetingDay ?? "").slice(0, 3)}
            </span>
            <span>
              <span className="section-mark">Weekly</span>
              <span className="mt-1 block font-display text-xl">{g.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {[formatMeetingTime(g.meetingTime), joinPlace(g.city, g.state)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="section-mark inline-flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-brass">
              Details
              <Icon name="chevron-right" size={12} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
