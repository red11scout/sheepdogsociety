import { db } from "@/db";
import { groups, locations } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { locationSlug } from "@/lib/locations/slug";

/**
 * Auth-free core of the group+location upsert, extracted from the
 * `upsertGroupLocation` server action so the plant-request approval route
 * (and integration tests) can create groups too. Callers are responsible
 * for BOTH the admin check and cache revalidation — this module never
 * touches next/cache, so it runs outside a request context.
 */

// The legacy locationStatusEnum is `pending | active | inactive`. The admin
// surfaces speak "Approval Status" (pending/approved/rejected); map at the
// boundary so no enum migration is needed.
type ApprovalStatus = "pending" | "approved" | "rejected";
type LocationStatus = "pending" | "active" | "inactive";

export function approvalToLocationStatus(s: ApprovalStatus): LocationStatus {
  if (s === "approved") return "active";
  if (s === "rejected") return "inactive";
  return "pending";
}

export function locationStatusToApproval(
  s: string | null | undefined
): ApprovalStatus {
  if (s === "active") return "approved";
  if (s === "inactive") return "rejected";
  return "pending";
}

export interface UpsertGroupLocationInput {
  groupId?: string; // omit = create
  groupName: string;
  groupDescription?: string;
  isActive?: boolean;
  approvalStatus?: ApprovalStatus;
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
  /** Group leader contact info — admin-only. Email + phone are NEVER
   *  surfaced via the public /api/public/locations/* endpoints. */
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export async function upsertGroupLocationCore(
  input: UpsertGroupLocationInput,
  userId: string
): Promise<{ groupId: string }> {
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
  if (input.contactName !== undefined) locPatch.contactName = input.contactName;
  if (input.contactEmail !== undefined) locPatch.contactEmail = input.contactEmail;
  if (input.contactPhone !== undefined) locPatch.contactPhone = input.contactPhone;
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
    // Pretty /groups/[slug] URL (migration 0015). Deduped against
    // existing slugs with -2/-3... suffixes, matching the SQL backfill.
    const slugBase = locationSlug(
      input.locationName ?? input.groupName,
      input.city ?? "Unknown"
    );
    const taken = new Set(
      (
        await db
          .select({ slug: locations.slug })
          .from(locations)
          .where(like(locations.slug, `${slugBase}%`))
      ).map((r) => r.slug)
    );
    let slug = slugBase;
    for (let n = 2; taken.has(slug); n++) slug = `${slugBase}-${n}`;
    await db.insert(locations).values({
      name: input.locationName ?? input.groupName,
      slug,
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
      contactName: input.contactName ?? "",
      contactEmail: input.contactEmail ?? "",
      contactPhone: input.contactPhone ?? "",
    });
  }

  return { groupId };
}
