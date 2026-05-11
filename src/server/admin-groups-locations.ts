"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { groups, locations, users } from "@/db/schema";
import { members } from "@/db/schema-members";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

// The legacy locationStatusEnum is `pending | active | inactive`. We want
// the admin UI to speak the user's "Approval Status" language
// (pending/approved/rejected). Map at the boundary so we don't need a new
// enum migration.
type ApprovalStatus = "pending" | "approved" | "rejected";
type LocationStatus = "pending" | "active" | "inactive";

function approvalToLocationStatus(s: ApprovalStatus): LocationStatus {
  if (s === "approved") return "active";
  if (s === "rejected") return "inactive";
  return "pending";
}

function locationStatusToApproval(s: string | null | undefined): ApprovalStatus {
  if (s === "active") return "approved";
  if (s === "inactive") return "rejected";
  return "pending";
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
    memberCount: countByGroup.get(r.groupId) ?? 0,
    createdAt:
      r.groupCreatedAt instanceof Date
        ? r.groupCreatedAt.toISOString()
        : String(r.groupCreatedAt),
  }));
}

export interface UpsertGroupLocationInput {
  groupId?: string; // omit = create
  groupName: string;
  groupDescription?: string;
  isActive?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  locationName?: string;
  specialInstructions?: string;
  locationType?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  displayedOnMap?: boolean;
  meetingDay?: string;
  meetingTime?: string;
}

export async function upsertGroupLocation(input: UpsertGroupLocationInput) {
  const userId = await requireAdmin();

  let groupId = input.groupId;
  // 1. group row
  if (!groupId) {
    const [g] = await db
      .insert(groups)
      .values({
        name: input.groupName,
        description: input.groupDescription ?? "",
        isActive: input.isActive ?? true,
        createdBy: userId,
      })
      .returning({ id: groups.id });
    groupId = g.id;
  } else {
    const groupPatch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.groupName !== undefined) groupPatch.name = input.groupName;
    if (input.groupDescription !== undefined)
      groupPatch.description = input.groupDescription;
    if (input.isActive !== undefined) groupPatch.isActive = input.isActive;
    await db.update(groups).set(groupPatch).where(eq(groups.id, groupId));
  }

  // 2. location row (one location per group, joined via locations.groupId)
  const [existingLoc] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.groupId, groupId))
    .limit(1);

  const locPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.locationName !== undefined) locPatch.name = input.locationName;
  if (input.specialInstructions !== undefined)
    locPatch.specialInstructions = input.specialInstructions;
  if (input.locationType !== undefined) locPatch.locationType = input.locationType;
  if (input.address !== undefined) locPatch.address = input.address;
  if (input.city !== undefined) locPatch.city = input.city;
  if (input.state !== undefined) locPatch.state = input.state;
  if (input.zipCode !== undefined) locPatch.zipCode = input.zipCode;
  if (input.latitude !== undefined) locPatch.latitude = input.latitude;
  if (input.longitude !== undefined) locPatch.longitude = input.longitude;
  if (input.displayedOnMap !== undefined)
    locPatch.displayedOnMap = input.displayedOnMap;
  if (input.meetingDay !== undefined) locPatch.meetingDay = input.meetingDay;
  if (input.meetingTime !== undefined) locPatch.meetingTime = input.meetingTime;
  if (input.approvalStatus !== undefined)
    locPatch.status = approvalToLocationStatus(input.approvalStatus);
  if (input.isActive !== undefined) locPatch.isActive = input.isActive;

  // Approving a group should put its pin on the public map automatically.
  // Only auto-flip when the caller didn't pass an explicit displayedOnMap
  // value in the same request — that lets the admin still soft-hide an
  // approved group later by toggling On Map → Off.
  if (input.approvalStatus === "approved" && input.displayedOnMap === undefined) {
    locPatch.displayedOnMap = true;
  }

  if (existingLoc) {
    await db.update(locations).set(locPatch).where(eq(locations.id, existingLoc.id));
  } else {
    // Create a fresh location bound to this group.
    // displayedOnMap defaults to true for approved rows so a pin appears
    // on the public locator immediately. Pending/rejected rows stay off.
    const initialDisplayedOnMap =
      input.displayedOnMap ?? input.approvalStatus === "approved";
    await db.insert(locations).values({
      name: input.locationName ?? input.groupName,
      latitude: input.latitude ?? "0",
      longitude: input.longitude ?? "0",
      city: input.city ?? "Unknown",
      state: input.state ?? "Unknown",
      groupId,
      status: approvalToLocationStatus(input.approvalStatus ?? "pending"),
      isActive: input.isActive ?? true,
      displayedOnMap: initialDisplayedOnMap,
      locationType: input.locationType ?? "in_person",
      address: input.address ?? "",
      zipCode: input.zipCode ?? "",
      meetingDay: input.meetingDay ?? "",
      meetingTime: input.meetingTime ?? "",
      specialInstructions: input.specialInstructions ?? "",
    });
  }

  revalidatePath("/admin/groups");
  revalidatePath("/admin/members");
  revalidatePath("/locations");
  return { groupId };
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
  revalidatePath("/locations");
}

export async function deleteGroupLocation(groupId: string) {
  await requireAdmin();
  // Hard delete the location (children of the group), then the group itself.
  // Members assigned to the group lose their group_id (set null on cascade).
  await db.delete(locations).where(eq(locations.groupId, groupId));
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath("/admin/groups");
  revalidatePath("/admin/members");
  revalidatePath("/locations");
}
