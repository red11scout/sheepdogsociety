import { NextResponse } from "next/server";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Public locator gates on TWO flags now (set independently by the
    // admin in /admin/groups):
    //   - displayed_on_map: explicit "show this on the public locator"
    //   - is_active: temporary disable without rejecting the row
    // Approval status no longer auto-controls visibility — admin gets
    // to decide approval and visibility separately.
    const activeLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        description: locations.description,
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
      .where(
        and(
          eq(locations.displayedOnMap, true),
          eq(locations.isActive, true)
        )
      );

    return NextResponse.json({ locations: activeLocations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations", detail: String(error) },
      { status: 500 }
    );
  }
}
