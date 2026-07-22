import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationRequests } from "@/db/schema";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL, FROM_SHEPHERD, SHEPHERD_EMAIL } from "@/lib/email";
import { geocodeAddress } from "@/lib/geocoding";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.email(),
  requesterPhone: z.string().max(30).optional(),
  proposedGroupName: z.string().min(1).max(200),
  proposedCity: z.string().min(1).max(200),
  proposedState: z.string().min(1).max(50),
  address: z.string().min(1).max(300),
  zipCode: z.string().max(10).optional(),
  meetingPlace: z.string().max(200).optional(),
  meetingDay: z.string().max(20).optional(),
  meetingTime: z.string().max(50).optional(),
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
      proposedGroupName,
      proposedCity,
      proposedState,
      address,
      zipCode,
      meetingPlace,
      meetingDay,
      meetingTime,
      reason,
    } = parsed.data;

    // Geocode best-effort at submit time so the admin sees coordinates on
    // the request card before approving. Approval re-geocodes if this
    // missed, so a Mapbox hiccup here costs nothing.
    let latitude = "";
    let longitude = "";
    let geocodedPlace = "";
    try {
      const geo = await geocodeAddress({
        address,
        city: proposedCity,
        state: proposedState,
        zipCode,
      });
      if (geo) {
        latitude = geo.latitude.toFixed(6);
        longitude = geo.longitude.toFixed(6);
        geocodedPlace = geo.placeName;
      }
    } catch (err) {
      console.warn("plant-request geocode skipped:", err);
    }

    await db.insert(locationRequests).values({
      requesterName,
      requesterEmail,
      requesterPhone: requesterPhone ?? "",
      proposedGroupName,
      proposedCity,
      proposedState,
      address,
      zipCode: zipCode ?? "",
      meetingPlace: meetingPlace ?? "",
      meetingDay: meetingDay ?? "",
      meetingTime: meetingTime ?? "",
      latitude,
      longitude,
      reason: reason ?? "",
      // Legacy free-text column kept in sync for older admin tooling.
      proposedMeetingDetails: [meetingDay, meetingTime, meetingPlace]
        .filter(Boolean)
        .join(" · "),
    });

    // Starting a new group is a rare, significant ask — notify shepherd@
    // immediately rather than relying on someone checking the admin
    // dashboard. Non-blocking: the request is already durably stored.
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: SHEPHERD_EMAIL,
        replyTo: requesterEmail,
        subject: `New group-plant request: ${proposedGroupName} — ${proposedCity}, ${proposedState}`,
        text: [
          `Name: ${requesterName}`,
          `Email: ${requesterEmail}`,
          `Phone: ${requesterPhone || "(not given)"}`,
          ``,
          `Group name: ${proposedGroupName}`,
          `Address: ${address}, ${proposedCity}, ${proposedState} ${zipCode || ""}`.trim(),
          `Meeting: ${[meetingDay, meetingTime, meetingPlace].filter(Boolean).join(" · ") || "(not given)"}`,
          geocodedPlace
            ? `Map match: ${geocodedPlace} (${latitude}, ${longitude})`
            : `Map match: none yet — approval will geocode again`,
          ``,
          `Reason:`,
          reason || "(none)",
          ``,
          `Review it: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com"}/admin/location-requests`,
        ].join("\n"),
      });
      if (error) console.error("plant-request notification rejected", error);
    } catch (err) {
      console.error("plant-request notification failed", err);
    }

    // Auto-reply FROM the shepherd, asking for the detail needed to move a
    // plant forward. A reply lands with Jeremy. Separate try/catch.
    try {
      const { error } = await resend().emails.send({
        from: FROM_SHEPHERD,
        to: requesterEmail,
        replyTo: SHEPHERD_EMAIL,
        subject: "Got your request to start a group. A few questions.",
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

Thank you for your willingness to start a group in ${city}, ${state}. That is no small thing.

So we can move this forward, reply to this email and tell me a bit more:
  1. How many men you have in mind to start with.
  2. Where you are in your own walk right now.

I will reach out to talk through next steps. It may take a few days. We are grateful you are willing to lead.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Jeremy, Sheepdog Society
acts2028sheepdogsociety.com`;
}
