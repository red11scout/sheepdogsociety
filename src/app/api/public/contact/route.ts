import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL, FROM_SHEPHERD, SHEPHERD_EMAIL } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  topic: z.string().max(100).optional(),
  message: z.string().min(1).max(5000),
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

    const topic = parsed.data.topic ?? "general";

    await db.insert(contactSubmissions).values({
      name: parsed.data.name,
      email: parsed.data.email,
      topic,
      message: parsed.data.message,
    });

    // Send notification email to shepherd (non-blocking). Resend only
    // throws on network/key errors; API rejections come back as `error`.
    try {
      const { error } = await resend().emails.send({
        from: FROM_TRANSACTIONAL,
        to: SHEPHERD_EMAIL,
        replyTo: parsed.data.email,
        subject: `New contact: ${topic} from ${parsed.data.name}`,
        text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nTopic: ${topic}\n\n${parsed.data.message}`,
      });
      if (error) console.error("contact notification email rejected", error);
    } catch (err) {
      console.error("contact notification email failed", err);
    }

    // Auto-reply FROM the shepherd, asking for the detail Jeremy needs to
    // help — a reply goes straight to shepherd@. Separate try/catch so a
    // failure here never blocks the notification above or the response.
    try {
      const { error } = await resend().emails.send({
        from: FROM_SHEPHERD,
        to: parsed.data.email,
        replyTo: SHEPHERD_EMAIL,
        subject: "Got your message. Tell me a little more.",
        text: buildContactAutoReply(parsed.data.name),
      });
      if (error) console.error("contact auto-reply rejected", error);
    } catch (err) {
      console.error("contact auto-reply failed", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}

function buildContactAutoReply(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "brother";
  return `${first},

Thanks for reaching out. I read every message myself.

So I can help you well, reply to this email with a few details:
  1. What is on your heart, in a sentence or two.
  2. The best way and time to reach you.
  3. Anything else you want me to know.

I will get back to you soon.

Acts 20:28
"Pay careful attention to yourselves and to all the flock, in which the Holy Spirit has made you overseers, to care for the church of God, which he obtained with his own blood."

— Jeremy, Sheepdog Society
acts2028sheepdogsociety.com`;
}
