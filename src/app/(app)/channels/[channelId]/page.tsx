import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { channels, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { ChannelView } from "./channel-view";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { channelId } = await params;

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  if (!channel) notFound();

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!currentUser || currentUser.status !== "active") redirect("/pending");

  return (
    <ChannelView
      channelId={channelId}
      channelName={channel.name}
      channelType={channel.type}
      currentUserId={userId}
      currentUserName={`${currentUser.firstName} ${currentUser.lastName}`}
    />
  );
}
