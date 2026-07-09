import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locationRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";

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

  // Tell the requester the outcome — previously this endpoint changed
  // status with zero notification, so a man who asked to start a group
  // had no way to learn Jeremy had actually decided. Non-blocking: the
  // status change above is already durable.
  if (updated) {
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: updated.requesterEmail,
        subject:
          status === "approved"
            ? "Your group-start request is approved"
            : "About your group-start request",
        text: buildDecisionEmail(updated, status as "approved" | "declined"),
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
  status: "approved" | "declined"
) {
  const first = req.requesterName.trim().split(/\s+/)[0] ?? "brother";
  const noteLine = req.notes ? `\n${req.notes}\n` : "";

  if (status === "approved") {
    return `${first},

Good news. Your request to start a group in ${req.proposedCity}, ${req.proposedState} is approved.
${noteLine}
We will be in touch about next steps to get your group listed and running.

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
