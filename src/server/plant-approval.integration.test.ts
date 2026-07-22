import { afterAll, describe, expect, it } from "vitest";

/**
 * Live integration tests for the plant-approval loop. Runs the real core
 * against the real database and Mapbox — no HTTP, no auth, no emails.
 * Gated: `INTEGRATION=1` plus a sourced .env.local. `npm test` skips it.
 *
 *   set -a; source .env.local; set +a; INTEGRATION=1 npx vitest run src/server/plant-approval.integration.test.ts
 *
 * All rows are created with ZZTEST markers and hard-deleted afterward.
 */

const RUN = Boolean(process.env.INTEGRATION && process.env.DATABASE_URL);

describe.runIf(RUN)("plant approval — live integration", () => {
  const cleanup = {
    memberIds: [] as string[],
    requestIds: [] as string[],
    groupIds: [] as string[],
  };
  const suffix = `${Date.now()}`;

  afterAll(async () => {
    if (!RUN) return;
    const { db } = await import("@/db");
    const { groups, locations, locationRequests } = await import("@/db/schema");
    const { members } = await import("@/db/schema-members");
    const { eq, inArray } = await import("drizzle-orm");
    // Members first (FK to groups is set-null, but keep it tidy), then
    // locations, groups, requests.
    if (cleanup.memberIds.length)
      await db.delete(members).where(inArray(members.id, cleanup.memberIds));
    for (const gid of cleanup.groupIds) {
      await db.delete(locations).where(eq(locations.groupId, gid));
      await db.delete(groups).where(eq(groups.id, gid));
    }
    if (cleanup.requestIds.length)
      await db
        .delete(locationRequests)
        .where(inArray(locationRequests.id, cleanup.requestIds));
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
    "join-form start path: approval creates a geocoded group and promotes the member to leader",
    async () => {
      const { db } = await import("@/db");
      const { locations, locationRequests } = await import("@/db/schema");
      const { members } = await import("@/db/schema-members");
      const { eq } = await import("drizzle-orm");
      const { approvePlantRequest } = await import("@/server/plant-approval");

      // 1. Simulate what /api/members writes for intent=start.
      const [member] = await db
        .insert(members)
        .values({
          name: "ZZTEST Plant Leader",
          email: `zztest-plant-${suffix}@example.com`,
          intent: "start",
          city: "Nashville",
          state: "TN",
          termsAcceptedAt: new Date(),
        })
        .returning();
      cleanup.memberIds.push(member.id);

      const [req] = await db
        .insert(locationRequests)
        .values({
          requesterName: "ZZTEST Plant Leader",
          requesterEmail: member.email!,
          requesterPhone: "",
          proposedGroupName: `ZZTEST Northside Watch ${suffix}`,
          proposedCity: "Nashville",
          proposedState: "Tennessee",
          address: "415 5th Ave N",
          zipCode: "37219",
          meetingPlace: "ZZTEST Diner",
          meetingDay: "Saturday",
          meetingTime: "7:00 AM",
          memberId: member.id,
        })
        .returning();
      cleanup.requestIds.push(req.id);

      // 2. Approve.
      const result = await approvePlantRequest(req, await adminId());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      cleanup.groupIds.push(result.groupId);

      // 3. The group's location is geocoded and map-visible.
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.groupId, result.groupId));
      expect(loc).toBeTruthy();
      expect(Number.isFinite(parseFloat(loc.latitude))).toBe(true);
      expect(Number.isFinite(parseFloat(loc.longitude))).toBe(true);
      // Nashville is ~36.16N, -86.78W — sanity-check the pin is in town.
      expect(parseFloat(loc.latitude)).toBeGreaterThan(35);
      expect(parseFloat(loc.latitude)).toBeLessThan(37);
      expect(parseFloat(loc.longitude)).toBeLessThan(-85);
      expect(loc.displayedOnMap).toBe(true);
      expect(loc.isActive).toBe(true);
      expect(loc.status).toBe("active");
      expect(loc.slug).toBeTruthy();
      expect(loc.meetingDay).toBe("Saturday");
      expect(loc.contactEmail).toBe(member.email);

      // 4. The member database is auto-populated: he leads his group.
      const [promoted] = await db
        .select()
        .from(members)
        .where(eq(members.id, member.id));
      expect(promoted.groupId).toBe(result.groupId);
      expect(promoted.locationId).toBe(loc.id);
      expect(promoted.role).toBe("leader");
      expect(promoted.approvalStatus).toBe("approved");

      // 5. Idempotency: approving again returns the same group, creates nothing.
      const [reqAfter] = await db
        .select()
        .from(locationRequests)
        .where(eq(locationRequests.id, req.id));
      const again = await approvePlantRequest(reqAfter, await adminId());
      expect(again.ok).toBe(true);
      if (again.ok) {
        expect(again.alreadyCreated).toBe(true);
        expect(again.groupId).toBe(result.groupId);
      }
    },
    60000
  );

  it(
    "tab-II plant request with no member row: approval auto-creates the leader member",
    async () => {
      const { db } = await import("@/db");
      const { locationRequests } = await import("@/db/schema");
      const { members } = await import("@/db/schema-members");
      const { eq } = await import("drizzle-orm");
      const { approvePlantRequest } = await import("@/server/plant-approval");

      const [req] = await db
        .insert(locationRequests)
        .values({
          requesterName: "ZZTEST Standalone Requester",
          requesterEmail: `zztest-standalone-${suffix}@example.com`,
          requesterPhone: "+16155550100",
          proposedGroupName: `ZZTEST Downtown Watch ${suffix}`,
          proposedCity: "Franklin",
          proposedState: "Tennessee",
          address: "231 Public Sq",
          zipCode: "37064",
        })
        .returning();
      cleanup.requestIds.push(req.id);

      const result = await approvePlantRequest(req, await adminId());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      cleanup.groupIds.push(result.groupId);
      expect(result.memberId).toBeTruthy();
      cleanup.memberIds.push(result.memberId!);

      const [created] = await db
        .select()
        .from(members)
        .where(eq(members.id, result.memberId!));
      expect(created.role).toBe("leader");
      expect(created.groupId).toBe(result.groupId);
      expect(created.approvalStatus).toBe("approved");
      expect(created.subscribed).toBe(true);
      expect(created.intent).toBe("start");
    },
    60000
  );

  it(
    "unmappable street address: approval falls back to city/state coordinates",
    async () => {
      const { db } = await import("@/db");
      const { locations, locationRequests } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const { approvePlantRequest } = await import("@/server/plant-approval");

      const [req] = await db
        .insert(locationRequests)
        .values({
          requesterName: "ZZTEST Fallback",
          requesterEmail: `zztest-fallback-${suffix}@example.com`,
          proposedGroupName: `ZZTEST Boise Watch ${suffix}`,
          proposedCity: "Boise",
          proposedState: "Idaho",
          address: "qqqxyzzy 99999 nowhere lane zz",
        })
        .returning();
      cleanup.requestIds.push(req.id);

      const result = await approvePlantRequest(req, await adminId());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      cleanup.groupIds.push(result.groupId);
      if (result.memberId) cleanup.memberIds.push(result.memberId);

      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.groupId, result.groupId));
      // Boise is ~43.6N, -116.2W.
      expect(parseFloat(loc.latitude)).toBeGreaterThan(42);
      expect(parseFloat(loc.latitude)).toBeLessThan(45);
      expect(parseFloat(loc.longitude)).toBeLessThan(-115);
    },
    60000
  );
});

// Placeholder so `npm test` reports the file as skipped, not empty.
describe.runIf(!RUN)("plant approval — live integration (skipped)", () => {
  it("skipped without INTEGRATION=1 + DATABASE_URL", () => {
    expect(true).toBe(true);
  });
});
