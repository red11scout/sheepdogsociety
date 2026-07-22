import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locations, locationRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";
import { geocodeAddress } from "@/lib/geocoding";
import { upsertGroupLocation } from "@/server/admin-groups-locations";

export const runtime = "nodejs";
export const maxDuration = 30;

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await db
    .select()
    .from(locationRequests)
    .orderBy(locationRequests.createdAt);

  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, notes } = await request.json();
  if (!id || !["approved", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [req] = await db
    .select()
    .from(locationRequests)
    .where(eq(locationRequests.id, id));
  if (!req) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Approval creates the real group + map pin from the request's own
  // fields — the whole point of collecting them up front. Idempotent:
  // once created_group_id is set, a second approve only re-flips status.
  let groupSlug: string | null = null;
  if (status === "approved" && !req.createdGroupId) {
    // Resolve coordinates: submit-time geocode → full address → city/state.
    let latitude = req.latitude ?? "";
    let longitude = req.longitude ?? "";
    if (!isFinite(parseFloat(latitude)) || !isFinite(parseFloat(longitude))) {
      try {
        const geo =
          (await geocodeAddress({
            address: req.address ?? "",
            city: req.proposedCity,
            state: req.proposedState,
            zipCode: req.zipCode ?? "",
          })) ??
          (await geocodeAddress({
            city: req.proposedCity,
            state: req.proposedState,
          }));
        if (geo) {
          latitude = geo.latitude.toFixed(6);
          longitude = geo.longitude.toFixed(6);
        }
      } catch (err) {
        console.error("approval geocode failed", err);
      }
    }
    if (!isFinite(parseFloat(latitude)) || !isFinite(parseFloat(longitude))) {
      // Never create a pinless "0,0" group — the map silently drops NaN
      // and renders (0,0) in the Atlantic. Leave the request pending.
      return NextResponse.json(
        {
          error:
            "Could not find that address on the map. Fix the address on the request (or add the group by hand in Groups & Locations), then approve again.",
        },
        { status: 422 }
      );
    }

    const groupName =
      req.proposedGroupName?.trim() ||
      `${req.proposedCity} Watch`;
    const { groupId } = await upsertGroupLocation({
      groupName,
      locationName: req.meetingPlace?.trim() || groupName,
      locationType: "in_person",
      address: req.address ?? "",
      city: req.proposedCity,
      state: req.proposedState,
      zipCode: req.zipCode ?? "",
      latitude,
      longitude,
      meetingDay: req.meetingDay ?? "",
      meetingTime: req.meetingTime ?? "",
      contactName: req.requesterName,
      contactEmail: req.requesterEmail,
      contactPhone: req.requesterPhone ?? "",
      approvalStatus: "approved",
    });

    const [loc] = await db
      .select({ id: locations.id, slug: locations.slug })
      .from(locations)
      .where(eq(locations.groupId, groupId))
      .limit(1);
    groupSlug = loc?.slug ?? null;

    await db
      .update(locationRequests)
      .set({
        createdGroupId: groupId,
        createdLocationId: loc?.id ?? null,
        latitude,
        longitude,
      })
      .where(eq(locationRequests.id, id));
  }

  const [updated] = await db
    .update(locationRequests)
    .set({
      status,
      notes: notes ?? "",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(locationRequests.id, id))
    .returning();

  // Tell the requester the outcome. Non-blocking: the status change and
  // group creation above are already durable.
  if (updated) {
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: updated.requesterEmail,
        subject:
          status === "approved"
            ? "Your group-start request is approved"
            : "About your group-start request",
        text: buildDecisionEmail(
          updated,
          status as "approved" | "declined",
          groupSlug
        ),
      });
      if (error) console.error("plant-request decision email rejected", error);
    } catch (err) {
      console.error("plant-request decision email failed", err);
    }
  }

  return NextResponse.json({ success: true });
}

function buildDecisionEmail(
  req: { requesterName: string; proposedCity: string; proposedState: string; notes: string | null },
  status: "approved" | "declined",
  groupSlug: string | null
) {
  const first = req.requesterName.trim().split(/\s+/)[0] ?? "brother";
  const noteLine = req.notes ? `\n${req.notes}\n` : "";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";
  const groupLine = groupSlug
    ? `\nYour group is live on the map: ${siteUrl}/groups/${groupSlug}\n`
    : "";

  if (status === "approved") {
    return `${first},

Good news. Your request to start a group in ${req.proposedCity}, ${req.proposedState} is approved.
${noteLine}${groupLine}
We will be in touch about next steps to get your group running.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Sheepdog Society
acts2028sheepdogsociety.com`;
  }

  return `${first},

We read your request to start a group in ${req.proposedCity}, ${req.proposedState}. We are not able to move forward with it right now.
${noteLine}
This is not a no to you. Reply to this email if you want to talk about it, or look for an existing group near you at acts2028sheepdogsociety.com/groups.

— Sheepdog Society
acts2028sheepdogsociety.com`;
}
