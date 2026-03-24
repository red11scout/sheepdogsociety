import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationRequests } from "@/db/schema";
import { z } from "zod/v4";

const schema = z.object({
  requesterName: z.string().min(1),
  requesterEmail: z.email(),
  requesterPhone: z.string().optional(),
  proposedCity: z.string().min(1),
  proposedState: z.string().min(1),
  proposedMeetingDetails: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await db.insert(locationRequests).values({
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      requesterPhone: parsed.data.requesterPhone ?? "",
      proposedCity: parsed.data.proposedCity,
      proposedState: parsed.data.proposedState,
      proposedMeetingDetails: parsed.data.proposedMeetingDetails ?? "",
      reason: parsed.data.reason ?? "",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}
