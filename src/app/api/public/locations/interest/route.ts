import { NextResponse } from "next/server";
import { db } from "@/db";
import { locationInterests } from "@/db/schema";
import { z } from "zod/v4";

const schema = z.object({
  locationId: z.string().uuid(),
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await db.insert(locationInterests).values({
      locationId: parsed.data.locationId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? "",
      message: parsed.data.message ?? "",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
