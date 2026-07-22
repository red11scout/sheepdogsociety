import { db } from "@/db";
import { locations, locationInterests } from "@/db/schema";
import { members } from "@/db/schema-members";
import { and, eq, isNull } from "drizzle-orm";
import { syncMemberToAudience } from "@/lib/resend-audience";

type InterestRow = typeof locationInterests.$inferSelect;

export interface ApproveInterestResult {
  memberId: string;
  alreadyCreated: boolean;
}

/**
 * Auth-free core of Group Interest approval, shared by the admin PATCH
 * route and integration tests. Approving a "Join a group" request
 * populates the member database: the man's members row (matched by email
 * or created fresh) is approved and assigned to the group the interest
 * points at. Idempotent — once created_member_id is set, re-approval
 * returns the existing member. Callers own the admin check and cache
 * revalidation.
 */
export async function approveInterest(
  interest: InterestRow
): Promise<ApproveInterestResult> {
  if (interest.createdMemberId) {
    return { memberId: interest.createdMemberId, alreadyCreated: true };
  }

  // Resolve the group from the location the interest points at.
  let groupId: string | null = null;
  if (interest.locationId) {
    const [loc] = await db
      .select({ groupId: locations.groupId })
      .from(locations)
      .where(eq(locations.id, interest.locationId))
      .limit(1);
    groupId = loc?.groupId ?? null;
  }

  const email = interest.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.email, email), isNull(members.deletedAt)))
    .limit(1);

  let memberId: string;
  if (existing) {
    const patch: Record<string, unknown> = {
      approvalStatus: "approved",
      isActive: true,
      updatedAt: new Date(),
    };
    // Assign the group only when the interest names one — never unassign.
    if (groupId) {
      patch.groupId = groupId;
      patch.locationId = interest.locationId;
    }
    await db.update(members).set(patch).where(eq(members.id, existing.id));
    memberId = existing.id;
  } else {
    const [created] = await db
      .insert(members)
      .values({
        name: interest.name,
        email,
        phone: interest.phone || null,
        intent: "join",
        role: "member",
        groupId,
        locationId: interest.locationId,
        approvalStatus: "approved",
        isActive: true,
        subscribed: interest.wantsNewsletter,
        source: "group-interest",
        note: interest.message || null,
        termsAcceptedAt: interest.createdAt ?? new Date(),
      })
      .returning({ id: members.id });
    memberId = created.id;
  }

  await db
    .update(locationInterests)
    .set({
      status: "approved",
      respondedAt: new Date(),
      createdMemberId: memberId,
    })
    .where(eq(locationInterests.id, interest.id));

  // Mirror the letter checkbox into the Resend Audience (best-effort).
  if (interest.wantsNewsletter) {
    await syncMemberToAudience(email, true);
  }

  return { memberId, alreadyCreated: false };
}
