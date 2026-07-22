import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationInterests, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL, FROM_SHEPHERD, SHEPHERD_EMAIL } from "@/lib/email";

const schema = z.object({
  // Optional since the /join form allows "no preference yet".
  locationId: z.uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.email(),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
  wantsNewsletter: z.boolean().optional(),
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

    const { locationId, name, email, phone, message, wantsNewsletter } =
      parsed.data;

    await db.insert(locationInterests).values({
      locationId: locationId ?? null,
      name,
      email,
      phone: phone ?? "",
      message: message ?? "",
      wantsNewsletter: wantsNewsletter ?? true,
    });

    // Look up the group once — used by the leader intro, the admin
    // notification, and the submitter's auto-reply below.
    const loc = locationId
      ? (
          await db
            .select({
              name: locations.name,
              city: locations.city,
              state: locations.state,
              contactName: locations.contactName,
              contactEmail: locations.contactEmail,
            })
            .from(locations)
            .where(eq(locations.id, locationId))
        )[0]
      : undefined;
    const groupLabel = loc
      ? `${loc.name} (${loc.city}, ${loc.state})`
      : "no particular group yet";

    // The rule: when a man picks a specific group, his information goes
    // straight to that group's leader from the admin address, reply-to set
    // to the man so the leader can welcome him with one reply. Leader
    // contact is admin-only data (migration 0013) — it is used as a
    // recipient here, never exposed to the visitor. Non-blocking.
    if (loc?.contactEmail) {
      try {
        const leaderFirst =
          loc.contactName?.trim().split(/\s+/)[0] || "brother";
        const { error } = await resend().emails.send({
          from: FROM_TRANSACTIONAL,
          to: loc.contactEmail,
          replyTo: email,
          subject: `A man wants to join ${loc.name}`,
          text: `${leaderFirst},

A man raised his hand to join ${groupLabel}.

Name: ${name}
Email: ${email}
Phone: ${phone || "(not given)"}
${message ? `\nHis note:\n${message}\n` : ""}
Reply to this email and it goes straight to him. Welcome him well.

— Sheepdog Society admin
acts2028sheepdogsociety.com/admin/location-interests`,
        });
        if (error) console.error("group interest leader intro rejected", error);
      } catch (err) {
        console.error("group interest leader intro failed", err);
      }
    }

    // Notify the shepherd inbox so the admin can approve the request into
    // the members database. Non-blocking: the interest is already stored.
    try {
      const leaderLine = loc?.contactEmail
        ? `Leader: ${loc.contactName || "(no name on file)"} <${loc.contactEmail}> (intro email sent automatically)`
        : loc
          ? "Leader: no contact email on file for this group — no intro sent."
          : "No group picked — route him by city when you follow up.";

      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: SHEPHERD_EMAIL,
        replyTo: email,
        subject: `New join request: ${loc ? groupLabel : name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "(not given)"}\nWeekly letter: ${wantsNewsletter ?? true ? "yes" : "no"}\n\nGroup: ${groupLabel}\n${leaderLine}\n\nMessage:\n${message || "(none)"}\n\nApprove it into Members: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com"}/admin/location-interests`,
      });
      if (error) console.error("group interest notification rejected", error);
    } catch (err) {
      console.error("group interest notification failed", err);
    }

    // Auto-reply FROM the shepherd, asking for the detail the leader needs
    // to welcome him well. A reply lands with Jeremy. Separate try/catch.
    try {
      const { error } = await resend().emails.send({
        from: FROM_SHEPHERD,
        to: email,
        replyTo: SHEPHERD_EMAIL,
        subject: "Got your interest. Tell us a little more.",
        text: buildInterestAutoReply(name, loc ? groupLabel : "a group near you"),
      });
      if (error) console.error("group interest auto-reply rejected", error);
    } catch (err) {
      console.error("group interest auto-reply failed", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}

function buildInterestAutoReply(name: string, groupLabel: string) {
  const first = name.trim().split(/\s+/)[0] ?? "brother";
  return `${first},

Thanks for raising your hand about ${groupLabel}.

So the leader can welcome you well, reply to this email and tell us:
  1. The best way and time to reach you.
  2. A word about what you are looking for.
  3. Anything that would help us welcome you.

Someone will be in touch soon. If you do not hear back in a few days, reply here and we will follow up ourselves.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Jeremy, Sheepdog Society
acts2028sheepdogsociety.com`;
}
