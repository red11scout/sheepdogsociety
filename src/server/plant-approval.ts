import { db } from "@/db";
import { locations, locationRequests } from "@/db/schema";
import { members } from "@/db/schema-members";
import { and, eq, isNull } from "drizzle-orm";
import { geocodeAddress } from "@/lib/geocoding";
import { upsertGroupLocationCore } from "@/server/groups-locations-core";

type PlantRequestRow = typeof locationRequests.$inferSelect;

export type ApprovePlantResult =
  | {
      ok: true;
      groupId: string;
      locationId: string | null;
      slug: string | null;
      memberId: string | null;
      alreadyCreated: boolean;
    }
  | { ok: false; reason: "geocode" };

function finiteCoord(v: string | null | undefined): boolean {
  return isFinite(parseFloat(v ?? ""));
}

/**
 * Auth-free core of plant-request approval, shared by the admin PATCH route
 * and integration tests. Creates the group + geocoded map pin from the
 * request's own fields, then auto-populates the member database: the
 * requester's members row (linked by member_id, or matched by email, or
 * created fresh) becomes the group's leader. Idempotent — once
 * created_group_id is set, re-approval returns the existing ids.
 *
 * Callers own the admin check, cache revalidation, and any emails.
 */
export async function approvePlantRequest(
  req: PlantRequestRow,
  adminUserId: string
): Promise<ApprovePlantResult> {
  if (req.createdGroupId) {
    const [loc] = await db
      .select({ id: locations.id, slug: locations.slug })
      .from(locations)
      .where(eq(locations.groupId, req.createdGroupId))
      .limit(1);
    return {
      ok: true,
      groupId: req.createdGroupId,
      locationId: loc?.id ?? req.createdLocationId,
      slug: loc?.slug ?? null,
      memberId: req.memberId,
      alreadyCreated: true,
    };
  }

  // Resolve coordinates: submit-time geocode → full address → city/state.
  let latitude = req.latitude ?? "";
  let longitude = req.longitude ?? "";
  if (!finiteCoord(latitude) || !finiteCoord(longitude)) {
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
  if (!finiteCoord(latitude) || !finiteCoord(longitude)) {
    // Never create a pinless "0,0" group — the map renders (0,0) in the
    // Atlantic. Leave the request pending for the admin to fix.
    return { ok: false, reason: "geocode" };
  }

  const groupName =
    req.proposedGroupName?.trim() || `${req.proposedCity} Watch`;
  // Legacy (pre-0025) requests carry their meeting info only as free text —
  // don't drop it; land it in the location's special instructions.
  const hasStructuredMeeting = Boolean(
    req.meetingDay?.trim() || req.meetingTime?.trim() || req.meetingPlace?.trim()
  );
  const { groupId } = await upsertGroupLocationCore(
    {
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
      specialInstructions:
        !hasStructuredMeeting && req.proposedMeetingDetails?.trim()
          ? req.proposedMeetingDetails.trim()
          : undefined,
      contactName: req.requesterName,
      contactEmail: req.requesterEmail,
      contactPhone: req.requesterPhone ?? "",
      approvalStatus: "approved",
    },
    adminUserId
  );

  const [loc] = await db
    .select({ id: locations.id, slug: locations.slug })
    .from(locations)
    .where(eq(locations.groupId, groupId))
    .limit(1);

  // Auto-populate the member database: the requester leads his new group.
  const memberPatch = {
    groupId,
    locationId: loc?.id ?? null,
    role: "leader",
    approvalStatus: "approved",
    updatedAt: new Date(),
  };
  let memberId: string | null = null;
  if (req.memberId) {
    const [m] = await db
      .update(members)
      .set(memberPatch)
      .where(eq(members.id, req.memberId))
      .returning({ id: members.id });
    memberId = m?.id ?? null;
  }
  if (!memberId) {
    const email = req.requesterEmail.trim().toLowerCase();
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.email, email), isNull(members.deletedAt)))
      .limit(1);
    if (existing) {
      await db.update(members).set(memberPatch).where(eq(members.id, existing.id));
      memberId = existing.id;
    } else {
      const [created] = await db
        .insert(members)
        .values({
          name: req.requesterName,
          email,
          phone: req.requesterPhone || null,
          intent: "start",
          role: "leader",
          groupId,
          locationId: loc?.id ?? null,
          city: req.proposedCity,
          state: req.proposedState,
          zip: req.zipCode || null,
          approvalStatus: "approved",
          isActive: true,
          source: "plant-request",
          note: req.reason || null,
          termsAcceptedAt: req.createdAt ?? new Date(),
        })
        .returning({ id: members.id });
      memberId = created.id;
    }
  }

  await db
    .update(locationRequests)
    .set({
      createdGroupId: groupId,
      createdLocationId: loc?.id ?? null,
      memberId,
      latitude,
      longitude,
    })
    .where(eq(locationRequests.id, req.id));

  return {
    ok: true,
    groupId,
    locationId: loc?.id ?? null,
    slug: loc?.slug ?? null,
    memberId,
    alreadyCreated: false,
  };
}
