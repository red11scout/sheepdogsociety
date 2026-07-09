import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationRequests } from "@/db/schema";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";

const schema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.email(),
  requesterPhone: z.string().max(30).optional(),
  proposedCity: z.string().min(1).max(200),
  proposedState: z.string().min(1).max(50),
  proposedMeetingDetails: z.string().max(2000).optional(),
  reason: z.string().max(2000).optional(),
  // No .max(0) — that would reject a filled honeypot at validation time,
  // skipping the runtime check below and surfacing a visible 400 to bots
  // instead of a silent fake-success.
  honeypot: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Honeypot — bots fill this, humans never see it. Pretend success.
    if (parsed.data.honeypot) {
      return NextResponse.json({ success: true });
    }

    const {
      requesterName,
      requesterEmail,
      requesterPhone,
      proposedCity,
      proposedState,
      proposedMeetingDetails,
      reason,
    } = parsed.data;

    await db.insert(locationRequests).values({
      requesterName,
      requesterEmail,
      requesterPhone: requesterPhone ?? "",
      proposedCity,
      proposedState,
      proposedMeetingDetails: proposedMeetingDetails ?? "",
      reason: reason ?? "",
    });

    // Starting a new group is a rare, significant ask — notify shepherd@
    // immediately rather than relying on someone checking the admin
    // dashboard. Non-blocking: the request is already durably stored.
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: "shepherd@acts2028sheepdogsociety.com",
        replyTo: requesterEmail,
        subject: `New group-plant request: ${proposedCity}, ${proposedState}`,
        text: `Name: ${requesterName}\nEmail: ${requesterEmail}\nPhone: ${requesterPhone || "(not given)"}\n\nProposed location: ${proposedCity}, ${proposedState}\nMeeting details: ${proposedMeetingDetails || "(none)"}\n\nReason:\n${reason || "(none)"}`,
      });
      if (error) console.error("plant-request notification rejected", error);
    } catch (err) {
      console.error("plant-request notification failed", err);
    }

    // Auto-reply to the requester — separate try/catch so a failure here
    // never blocks the shepherd@ notification above.
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: requesterEmail,
        subject: "Got your request to start a group",
        text: buildPlantRequestAutoReply(requesterName, proposedCity, proposedState),
      });
      if (error) console.error("plant-request auto-reply rejected", error);
    } catch (err) {
      console.error("plant-request auto-reply failed", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}

function buildPlantRequestAutoReply(name: string, city: string, state: string) {
  const first = name.trim().split(/\s+/)[0] ?? "brother";
  return `${first},

Got your request to start a group in ${city}, ${state}. That is no small thing, and we do not take it lightly.

Someone will reach out to talk through next steps. It may take a few days. We are grateful you are willing to lead.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Sheepdog Society
acts2028sheepdogsociety.com`;
}
