import { NextResponse } from "next/server";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
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
      .where(sql`${locations.status}::text = 'active'`);

    return NextResponse.json({ locations: activeLocations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations", detail: String(error) },
      { status: 500 }
    );
  }
}
