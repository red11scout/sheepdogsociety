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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
