"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { members } from "@/db/schema-members";
import { groups, locations, users } from "@/db/schema";
import { eq, isNull, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") throw new Error("Forbidden");
  return userId;
}

/** Shape returned to the admin members table. Includes joined group + location names
 *  so the table can render them without N+1 lookups. */
export interface AdminMemberRow {
  id: string;
  shortId: string;
  approvalStatus: string;
  isActive: boolean;
  role: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  signalAccount: string | null;
  intent: string;
  status: string;
  groupId: string | null;
  groupName: string | null;
  locationId: string | null;
  locationName: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
}

export async function listAdminMembers(): Promise<AdminMemberRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: members.id,
      approvalStatus: members.approvalStatus,
      isActive: members.isActive,
      role: members.role,
      firstName: members.firstName,
      lastName: members.lastName,
      nickname: members.nickname,
      // Fall back to the legacy single-field name when the structured fields
      // haven't been backfilled yet.
      legacyName: members.name,
      email: members.email,
      phone: members.phone,
      signalAccount: members.signalAccount,
      intent: members.intent,
      status: members.status,
      groupId: members.groupId,
      locationId: members.locationId,
      city: members.city,
      state: members.state,
      source: members.source,
      note: members.note,
      adminNote: members.adminNote,
      createdAt: members.createdAt,
      groupName: groups.name,
      locationName: locations.name,
    })
    .from(members)
    .leftJoin(groups, eq(members.groupId, groups.id))
    .leftJoin(locations, eq(members.locationId, locations.id))
    .where(isNull(members.deletedAt))
    .orderBy(desc(members.createdAt))
    .limit(1000);

  return rows.map((r) => {
    // Synthesize first/last from legacyName if structured fields blank.
    let firstName = r.firstName;
    let lastName = r.lastName;
    if (!firstName && r.legacyName) {
      const parts = r.legacyName.trim().split(/\s+/);
      firstName = parts[0] ?? null;
      lastName = parts.slice(1).join(" ") || null;
    }
    return {
      id: r.id,
      shortId: r.id.slice(0, 8),
      approvalStatus: r.approvalStatus,
      isActive: r.isActive,
      role: r.role,
      firstName,
      lastName,
      nickname: r.nickname,
      email: r.email,
      phone: r.phone,
      signalAccount: r.signalAccount,
      intent: r.intent,
      status: r.status,
      groupId: r.groupId,
      groupName: r.groupName,
      locationId: r.locationId,
      locationName: r.locationName,
      city: r.city,
      state: r.state,
      source: r.source,
      note: r.note,
      adminNote: r.adminNote,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    };
  });
}

export async function listGroupOptions(): Promise<{ id: string; name: string }[]> {
  await requireAdmin();
  return await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .orderBy(groups.name);
}

export async function listLocationOptions(): Promise<{ id: string; name: string }[]> {
  await requireAdmin();
  return await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .orderBy(locations.name);
}

export interface UpdateMemberInput {
  id: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  isActive?: boolean;
  role?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  signalAccount?: string;
  groupId?: string | null;
  locationId?: string | null;
  status?:
    | "new"
    | "reviewed"
    | "contacted"
    | "connected"
    | "needs_followup"
    | "not_a_fit"
    | "archived";
  adminNote?: string;
}

export async function updateMember(input: UpdateMemberInput) {
  await requireAdmin();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of [
    "approvalStatus",
    "isActive",
    "role",
    "firstName",
    "lastName",
    "nickname",
    "email",
    "phone",
    "signalAccount",
    "groupId",
    "locationId",
    "status",
    "adminNote",
  ] as const) {
    if (input[k] !== undefined) patch[k] = input[k];
  }
  // Keep the legacy single-field `name` in sync when first/last change.
  if (input.firstName !== undefined || input.lastName !== undefined) {
    const f = input.firstName?.trim() ?? "";
    const l = input.lastName?.trim() ?? "";
    const composed = [f, l].filter(Boolean).join(" ");
    if (composed) patch.name = composed;
  }
  // If group changes, derive locationId from the group's primary location.
  if (input.groupId !== undefined && input.groupId) {
    const [loc] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.groupId, input.groupId))
      .limit(1);
    patch.locationId = loc?.id ?? null;
  } else if (input.groupId === null) {
    patch.locationId = null;
  }
  await db.update(members).set(patch).where(eq(members.id, input.id));
  revalidatePath("/admin/members");
}

export async function bulkUpdateMembers(
  ids: string[],
  patch: Pick<UpdateMemberInput, "approvalStatus" | "isActive" | "groupId">
) {
  await requireAdmin();
  if (ids.length === 0) return;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.approvalStatus !== undefined) updates.approvalStatus = patch.approvalStatus;
  if (patch.isActive !== undefined) updates.isActive = patch.isActive;
  if (patch.groupId !== undefined) {
    updates.groupId = patch.groupId;
    if (patch.groupId) {
      const [loc] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.groupId, patch.groupId))
        .limit(1);
      updates.locationId = loc?.id ?? null;
    } else {
      updates.locationId = null;
    }
  }
  await db.update(members).set(updates).where(inArray(members.id, ids));
  revalidatePath("/admin/members");
}

export async function softDeleteMember(id: string) {
  await requireAdmin();
  await db
    .update(members)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(members.id, id));
  revalidatePath("/admin/members");
}

export async function bulkSoftDeleteMembers(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;
  await db
    .update(members)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(and(inArray(members.id, ids), isNull(members.deletedAt)));
  revalidatePath("/admin/members");
}
