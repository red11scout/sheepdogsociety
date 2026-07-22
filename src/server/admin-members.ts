"use server";

import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { members } from "@/db/schema-members";
import { groups, locations, users } from "@/db/schema";
import { eq, isNull, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { syncMemberToAudience } from "@/lib/resend-audience";

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
  /** Weekly-letter checkbox — mirrored into the Resend Audience. */
  subscribed: boolean;
  role: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  email: string | null;
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
  zip: string | null;
  timeline: string | null;
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
      subscribed: members.subscribed,
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
      zip: members.zip,
      timeline: members.timeline,
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
      subscribed: r.subscribed,
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
      zip: r.zip,
      timeline: r.timeline,
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

export interface CreateMemberInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  signalAccount?: string;
  role?: string;
  groupId?: string | null;
  adminNote?: string;
  subscribed?: boolean;
}

/**
 * Admin-created member. Unlike a /join signup, contact info is fully optional
 * (email / phone / Signal — any mix or none), but at least one name field is
 * required so the row has a human label (the legacy `name` column is NOT NULL).
 * Admin-added members are auto-approved and marked source="admin". If a group
 * is chosen, locationId is derived from that group's primary location, matching
 * updateMember/bulkUpdateMembers.
 */
export async function createMember(
  input: CreateMemberInput
): Promise<AdminMemberRow> {
  await requireAdmin();

  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  const nick = input.nickname?.trim() ?? "";
  const composedName = [first, last].filter(Boolean).join(" ") || nick;
  if (!composedName) {
    throw new Error("Add at least a first name, last name, or nickname.");
  }

  const email = input.email?.trim() || null;
  if (email) {
    const [dupe] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.email, email), isNull(members.deletedAt)))
      .limit(1);
    if (dupe) {
      throw new Error(`A member with the email ${email} already exists.`);
    }
  }

  const groupId = input.groupId || null;
  let locationId: string | null = null;
  let groupName: string | null = null;
  let locationName: string | null = null;
  if (groupId) {
    const [g] = await db
      .select({ name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    groupName = g?.name ?? null;
    const [loc] = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.groupId, groupId))
      .limit(1);
    locationId = loc?.id ?? null;
    locationName = loc?.name ?? null;
  }

  const [created] = await db
    .insert(members)
    .values({
      name: composedName,
      firstName: first || null,
      lastName: last || null,
      nickname: nick || null,
      email,
      phone: input.phone?.trim() || null,
      signalAccount: input.signalAccount?.trim() || null,
      intent: "join",
      role: input.role?.trim() || "member",
      groupId,
      locationId,
      approvalStatus: "approved",
      isActive: true,
      subscribed: input.subscribed ?? true,
      status: "new",
      source: "admin",
      adminNote: input.adminNote?.trim() || null,
      termsAcceptedAt: new Date(),
    })
    .returning();

  revalidatePath("/admin/members");

  // Mirror the checkbox into the Resend Audience (best-effort, non-blocking).
  if (created.email) {
    await syncMemberToAudience(created.email, created.subscribed);
  }

  return {
    id: created.id,
    shortId: created.id.slice(0, 8),
    approvalStatus: created.approvalStatus,
    isActive: created.isActive,
    subscribed: created.subscribed,
    role: created.role,
    firstName: created.firstName,
    lastName: created.lastName,
    nickname: created.nickname,
    email: created.email,
    phone: created.phone,
    signalAccount: created.signalAccount,
    intent: created.intent,
    status: created.status,
    groupId: created.groupId,
    groupName,
    locationId: created.locationId,
    locationName,
    city: created.city,
    state: created.state,
    zip: created.zip,
    timeline: created.timeline,
    source: created.source,
    note: created.note,
    adminNote: created.adminNote,
    createdAt:
      created.createdAt instanceof Date
        ? created.createdAt.toISOString()
        : String(created.createdAt),
  };
}

export interface UpdateMemberInput {
  id: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  isActive?: boolean;
  subscribed?: boolean;
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
    "subscribed",
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
  // Mirror a subscribed flip into the Resend Audience (best-effort).
  if (input.subscribed !== undefined) {
    const [row] = await db
      .select({ email: members.email })
      .from(members)
      .where(eq(members.id, input.id));
    await syncMemberToAudience(row?.email, input.subscribed);
  }
}

export async function bulkUpdateMembers(
  ids: string[],
  patch: Pick<UpdateMemberInput, "approvalStatus" | "isActive" | "subscribed" | "groupId">
) {
  await requireAdmin();
  if (ids.length === 0) return;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.approvalStatus !== undefined) updates.approvalStatus = patch.approvalStatus;
  if (patch.isActive !== undefined) updates.isActive = patch.isActive;
  if (patch.subscribed !== undefined) updates.subscribed = patch.subscribed;
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
  // Mirror bulk subscribed flips into the Resend Audience (best-effort).
  if (patch.subscribed !== undefined) {
    const rows = await db
      .select({ email: members.email })
      .from(members)
      .where(inArray(members.id, ids));
    for (const r of rows) {
      await syncMemberToAudience(r.email, patch.subscribed);
    }
  }
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
