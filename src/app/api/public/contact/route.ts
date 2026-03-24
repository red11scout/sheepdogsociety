import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { z } from "zod/v4";

const schema = z.object({
  name: z.string().min(1),
  email: z.email(),
  topic: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await db.insert(contactSubmissions).values({
      name: parsed.data.name,
      email: parsed.data.email,
      topic: parsed.data.topic ?? "general",
      message: parsed.data.message,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }
}
