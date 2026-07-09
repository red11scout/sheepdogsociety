import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { z } from "zod/v4";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";

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
        to: "shepherd@acts2028sheepdogsociety.com",
        replyTo: parsed.data.email,
        subject: `New contact: ${topic} from ${parsed.data.name}`,
        text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nTopic: ${topic}\n\n${parsed.data.message}`,
      });
      if (error) console.error("contact notification email rejected", error);
    } catch (err) {
      console.error("contact notification email failed", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}
