import { NextResponse } from "next/server";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Public payload — note what's intentionally NOT here:
    //   - contactEmail (admin-only, used to be exposed and was a leak)
    //   - contactPhone (admin-only, never returned by the public API)
    // The leader's name is fine to display so visitors know who runs
    // the group; reaching out goes through the /contact form, which
    // routes to the admin who knows the real email/phone.
    const [location] = await db
      .select({
        id: locations.id,
        name: locations.name,
        description: locations.description,
        latitude: locations.latitude,
        longitude: locations.longitude,
        address: locations.address,
        city: locations.city,
        state: locations.state,
        zipCode: locations.zipCode,
        meetingDay: locations.meetingDay,
        meetingTime: locations.meetingTime,
        meetingPlace: locations.meetingPlace,
        groupSize: locations.groupSize,
        maxSize: locations.maxSize,
        contactName: locations.contactName,
        signalGroupUrl: locations.signalGroupUrl,
        imageUrl: locations.imageUrl,
      })
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.status, "active")));

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}
