import { afterAll, describe, expect, it } from "vitest";

/**
 * Live integration tests for Group Interest approval ("Join a group" path).
 * Same gating and hygiene as plant-approval.integration.test.ts:
 *
 *   set -a; source .env.local; set +a; INTEGRATION=1 npx vitest run src/server/interest-approval.integration.test.ts
 */

const RUN = Boolean(process.env.INTEGRATION && process.env.DATABASE_URL);

// The DB flow is under test, not Resend — blank the audience id so the
// best-effort sync inside approveInterest no-ops instead of writing test
// emails into the real weekly-letter audience.
if (RUN) process.env.RESEND_AUDIENCE_ID = "";

describe.runIf(RUN)("interest approval — live integration", () => {
  const cleanup = {
    memberIds: [] as string[],
    interestIds: [] as string[],
    groupIds: [] as string[],
  };
  const suffix = `${Date.now()}`;

  afterAll(async () => {
    if (!RUN) return;
    const { db } = await import("@/db");
    const { groups, locations, locationInterests } = await import("@/db/schema");
    const { members } = await import("@/db/schema-members");
    const { eq, inArray } = await import("drizzle-orm");
    if (cleanup.memberIds.length)
      await db.delete(members).where(inArray(members.id, cleanup.memberIds));
    // Interests reference locations with ON DELETE CASCADE — delete them
    // first so the rows are gone even if the cascade ordering changes.
    if (cleanup.interestIds.length)
      await db
        .delete(locationInterests)
        .where(inArray(locationInterests.id, cleanup.interestIds));
    for (const gid of cleanup.groupIds) {
      await db.delete(locations).where(eq(locations.groupId, gid));
      await db.delete(groups).where(eq(groups.id, gid));
    }
  });

  async function adminId(): Promise<string> {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    expect(admin?.id).toBeTruthy();
    return admin.id;
  }

  it(
    "approving an interest with a group assigns the new member to that group",
    async () => {
      const { db } = await import("@/db");
      const { groups, locations, locationInterests } = await import("@/db/schema");
      const { members } = await import("@/db/schema-members");
      const { eq } = await import("drizzle-orm");
      const { approveInterest } = await import("@/server/interest-approval");

      // A test group + location to point the interest at.
      const [g] = await db
        .insert(groups)
        .values({ name: `ZZTEST Interest Group ${suffix}`, createdBy: await adminId() })
        .returning({ id: groups.id });
      cleanup.groupIds.push(g.id);
      const [loc] = await db
        .insert(locations)
        .values({
          name: `ZZTEST Interest Location ${suffix}`,
          latitude: "36.1",
          longitude: "-86.7",
          city: "Nashville",
          state: "Tennessee",
          groupId: g.id,
          displayedOnMap: false,
        })
        .returning({ id: locations.id });

      const [interest] = await db
        .insert(locationInterests)
        .values({
          locationId: loc.id,
          name: "ZZTEST Joiner",
          email: `zztest-joiner-${suffix}@example.com`,
          phone: "+16155550111",
          message: "Saw you all on the map.",
          wantsNewsletter: false,
        })
        .returning();
      cleanup.interestIds.push(interest.id);

      const result = await approveInterest(interest);
      expect(result.alreadyCreated).toBe(false);
      cleanup.memberIds.push(result.memberId);

      // Member database populated, assigned to the group.
      const [m] = await db
        .select()
        .from(members)
        .where(eq(members.id, result.memberId));
      expect(m.groupId).toBe(g.id);
      expect(m.locationId).toBe(loc.id);
      expect(m.role).toBe("member");
      expect(m.approvalStatus).toBe("approved");
      expect(m.subscribed).toBe(false); // carried from wantsNewsletter
      expect(m.note).toBe("Saw you all on the map.");

      // Interest marked approved + linked.
      const [after] = await db
        .select()
        .from(locationInterests)
        .where(eq(locationInterests.id, interest.id));
      expect(after.status).toBe("approved");
      expect(after.createdMemberId).toBe(result.memberId);

      // Idempotent: approving again returns the same member.
      const again = await approveInterest(after);
      expect(again.alreadyCreated).toBe(true);
      expect(again.memberId).toBe(result.memberId);
    },
    30000
  );

  it(
    "approving a no-preference interest creates the member without a group",
    async () => {
      const { db } = await import("@/db");
      const { locationInterests } = await import("@/db/schema");
      const { members } = await import("@/db/schema-members");
      const { eq } = await import("drizzle-orm");
      const { approveInterest } = await import("@/server/interest-approval");

      const [interest] = await db
        .insert(locationInterests)
        .values({
          locationId: null,
          name: "ZZTEST No Preference",
          email: `zztest-nopref-${suffix}@example.com`,
          wantsNewsletter: true,
        })
        .returning();
      cleanup.interestIds.push(interest.id);

      const result = await approveInterest(interest);
      cleanup.memberIds.push(result.memberId);

      const [m] = await db
        .select()
        .from(members)
        .where(eq(members.id, result.memberId));
      expect(m.groupId).toBeNull();
      expect(m.approvalStatus).toBe("approved");
      expect(m.subscribed).toBe(true);
      expect(m.intent).toBe("join");
    },
    30000
  );
});

// Placeholder so `npm test` reports the file as skipped, not empty.
describe.runIf(!RUN)("interest approval — live integration (skipped)", () => {
  it("skipped without INTEGRATION=1 + DATABASE_URL", () => {
    expect(true).toBe(true);
  });
});
