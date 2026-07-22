"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { groups, locations, users } from "@/db/schema";
import { members } from "@/db/schema-members";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  approvalToLocationStatus,
  locationStatusToApproval,
  upsertGroupLocationCore,
  type UpsertGroupLocationInput,
} from "@/server/groups-locations-core";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

/** Joined group + location row for the unified admin table. The user's mental
 *  model is "one group meets at one place", and that's how the admin sees it
 *  here. The underlying schema keeps groups and locations separate for code
 *  paths that already query them independently. */
export interface AdminGroupLocationRow {
  // Group fields (group is the primary key for the row)
  groupId: string;
  shortGroupId: string;
  groupName: string;
  groupDescription: string | null;
  isActive: boolean;
  approvalStatus: string;
  // Location fields (joined; may be missing if the group has no location yet)
  locationId: string | null;
  locationName: string | null;
  specialInstructions: string | null;
  locationType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: string | null;
  longitude: string | null;
  displayedOnMap: boolean;
  meetingDay: string | null;
  meetingTime: string | null;
  /** Group leader contact — admin-only, never sent to public APIs.
   *  See migration 0013 + the public route that selects only contactName. */
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  // Computed
  memberCount: number;
  createdAt: string;
}

export async function listAdminGroupsLocations(): Promise<AdminGroupLocationRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      groupDescription: groups.description,
      groupActive: groups.isActive,
      groupCreatedAt: groups.createdAt,
      locId: locations.id,
      locName: locations.name,
      specialInstructions: locations.specialInstructions,
      locationType: locations.locationType,
      address: locations.address,
      city: locations.city,
      state: locations.state,
      zipCode: locations.zipCode,
      latitude: locations.latitude,
      longitude: locations.longitude,
      displayedOnMap: locations.displayedOnMap,
      locStatus: locations.status,
      locActive: locations.isActive,
      meetingDay: locations.meetingDay,
      meetingTime: locations.meetingTime,
      contactName: locations.contactName,
      contactEmail: locations.contactEmail,
      contactPhone: locations.contactPhone,
    })
    .from(groups)
    .leftJoin(locations, eq(locations.groupId, groups.id))
    .orderBy(desc(groups.createdAt))
    .limit(500);

  // Member counts per group, single round-trip
  const counts = await db
    .select({ groupId: members.groupId, c: sql<number>`count(*)::int` })
    .from(members)
    .groupBy(members.groupId);
  const countByGroup = new Map(
    counts.filter((c) => c.groupId).map((c) => [c.groupId as string, c.c])
  );

  return rows.map((r) => ({
    groupId: r.groupId,
    shortGroupId: r.groupId.slice(0, 8),
    groupName: r.groupName,
    groupDescription: r.groupDescription,
    isActive: r.groupActive && (r.locActive ?? true),
    approvalStatus: locationStatusToApproval(r.locStatus),
    locationId: r.locId,
    locationName: r.locName,
    specialInstructions: r.specialInstructions,
    locationType: r.locationType,
    address: r.address,
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    latitude: r.latitude,
    longitude: r.longitude,
    displayedOnMap: r.displayedOnMap ?? false,
    meetingDay: r.meetingDay,
    meetingTime: r.meetingTime,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    memberCount: countByGroup.get(r.groupId) ?? 0,
    createdAt:
      r.groupCreatedAt instanceof Date
        ? r.groupCreatedAt.toISOString()
        : String(r.groupCreatedAt),
  }));
}

export async function upsertGroupLocation(input: UpsertGroupLocationInput) {
  const userId = await requireAdmin();
  // Auth-free create/update logic lives in groups-locations-core.ts so the
  // plant-request approval route (and tests) can share it.
  const result = await upsertGroupLocationCore(input, userId);

  revalidatePath("/admin/groups");
  revalidatePath("/admin/members");
  revalidatePath("/groups");
  // Homepage "When & where" band reads locations live (spec §A.2).
  revalidatePath("/");
  return result;
}

export async function bulkUpdateGroupsLocations(
  groupIds: string[],
  patch: {
    isActive?: boolean;
    approvalStatus?: "pending" | "approved" | "rejected";
    displayedOnMap?: boolean;
  }
) {
  await requireAdmin();
  if (groupIds.length === 0) return;

  const groupPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.isActive !== undefined) groupPatch.isActive = patch.isActive;
  if (Object.keys(groupPatch).length > 1) {
    await db.update(groups).set(groupPatch).where(inArray(groups.id, groupIds));
  }

  const locPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.isActive !== undefined) locPatch.isActive = patch.isActive;
  if (patch.approvalStatus !== undefined)
    locPatch.status = approvalToLocationStatus(patch.approvalStatus);
  if (patch.displayedOnMap !== undefined)
    locPatch.displayedOnMap = patch.displayedOnMap;
  // Bulk approve also auto-puts the rows on the map (admin can hide later).
  if (patch.approvalStatus === "approved" && patch.displayedOnMap === undefined) {
    locPatch.displayedOnMap = true;
  }
  if (Object.keys(locPatch).length > 1) {
    await db
      .update(locations)
      .set(locPatch)
      .where(inArray(locations.groupId, groupIds));
  }

  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  revalidatePath("/");
}

export async function deleteGroupLocation(groupId: string) {
  await requireAdmin();
  // Hard delete the location (children of the group), then the group itself.
  // Members assigned to the group lose their group_id (set null on cascade).
  await db.delete(locations).where(eq(locations.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/admin/groups");
  revalidatePath("/admin/members");
  revalidatePath("/groups");
  revalidatePath("/");
}
