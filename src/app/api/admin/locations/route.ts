import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users, locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allLocations = await db
    .select()
    .from(locations)
    .orderBy(locations.createdAt);

  return NextResponse.json({ locations: allLocations });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  latitude: z.string(),
  longitude: z.string(),
  address: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().optional(),
  meetingDay: z.string().optional(),
  meetingTime: z.string().optional(),
  meetingPlace: z.string().optional(),
  maxSize: z.number().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  status: z.enum(["active", "pending", "inactive"]).optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [newLocation] = await db
    .insert(locations)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      address: parsed.data.address ?? "",
      city: parsed.data.city,
      state: parsed.data.state,
      zipCode: parsed.data.zipCode ?? "",
      meetingDay: parsed.data.meetingDay ?? "",
      meetingTime: parsed.data.meetingTime ?? "",
      meetingPlace: parsed.data.meetingPlace ?? "",
      maxSize: parsed.data.maxSize ?? 12,
      contactName: parsed.data.contactName ?? "",
      contactEmail: parsed.data.contactEmail ?? "",
      status: parsed.data.status ?? "active",
      approvedBy: admin.id,
      approvedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ location: newLocation });
}
