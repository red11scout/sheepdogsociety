import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { channels, channelMembers, users } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.status !== "active") {
    return Response.json({ channels: [] });
  }

  const isLeader =
    currentUser.role === "admin" ||
    currentUser.role === "group_leader" ||
    currentUser.role === "asst_leader";

  // Get channels the user has access to
  const allChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.isArchived, false));

  // Filter by access
  const accessibleChannels = allChannels.filter((channel) => {
    if (channel.type === "org") return true;
    if (channel.type === "leaders") return isLeader;
    // Group and DM channels will be filtered by membership
    return true;
  });

  // For group and DM channels, check membership
  if (accessibleChannels.some((c) => c.type === "group" || c.type === "dm")) {
    const memberships = await db
      .select({ channelId: channelMembers.channelId })
      .from(channelMembers)
      .where(eq(channelMembers.userId, userId));

    const memberChannelIds = new Set(memberships.map((m) => m.channelId));

    const filtered = accessibleChannels.filter((channel) => {
      if (channel.type === "org") return true;
      if (channel.type === "leaders") return isLeader;
      return memberChannelIds.has(channel.id);
    });

    return Response.json({ channels: filtered });
  }

  return Response.json({ channels: accessibleChannels });
}

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["org", "leaders", "group", "dm"]),
  description: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.status !== "active") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only leaders+ can create channels
  const isLeader =
    currentUser.role === "admin" ||
    currentUser.role === "group_leader" ||
    currentUser.role === "asst_leader";

  if (!isLeader) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [channel] = await db
    .insert(channels)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description ?? "",
      groupId: parsed.data.groupId ?? null,
      createdBy: userId,
    })
    .returning();

  return Response.json({ channel }, { status: 201 });
}
