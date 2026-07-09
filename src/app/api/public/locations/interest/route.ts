import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationInterests, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";

const schema = z.object({
  locationId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.email(),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
  // No .max(0) here — that would make schema validation itself reject a
  // filled honeypot, so the runtime check below never runs and bots get
  // a visible 400 instead of a silent fake-success.
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

    const { locationId, name, email, phone, message } = parsed.data;

    await db.insert(locationInterests).values({
      locationId,
      name,
      email,
      phone: phone ?? "",
      message: message ?? "",
    });

    // Notify a human — this table previously had no downstream reader,
    // so every submission vanished silently. We route to shepherd@ (not
    // directly to the group's contactEmail, which is admin-only per
    // migration 0013) and include the leader's contact info in the body
    // so an admin can forward or make the introduction. Non-blocking:
    // the interest is already durably stored above.
    try {
      const [loc] = await db
        .select({
          name: locations.name,
          city: locations.city,
          state: locations.state,
          contactName: locations.contactName,
          contactEmail: locations.contactEmail,
        })
        .from(locations)
        .where(eq(locations.id, locationId));

      const groupLabel = loc ? `${loc.name} (${loc.city}, ${loc.state})` : locationId;
      const leaderLine = loc?.contactEmail
        ? `Leader: ${loc.contactName || "(no name on file)"} <${loc.contactEmail}>`
        : "Leader: no contact email on file for this group.";

      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: "shepherd@acts2028sheepdogsociety.com",
        replyTo: email,
        subject: `New group interest: ${groupLabel}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "(not given)"}\n\nGroup: ${groupLabel}\n${leaderLine}\n\nMessage:\n${message || "(none)"}`,
      });
      if (error) console.error("group interest notification rejected", error);
    } catch (err) {
      console.error("group interest notification failed", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
