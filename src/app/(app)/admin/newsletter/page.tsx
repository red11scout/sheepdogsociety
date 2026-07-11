export const dynamic = "force-dynamic";

import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { SubscriberList, type Subscriber } from "./subscriber-list";

export default async function AdminNewsletterPage() {
  // Same query the /api/admin/newsletter GET runs; dates serialized to
  // ISO strings to match the JSON shape the client previously fetched.
  const rows = await db
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.subscribedAt));

  const subscribers: Subscriber[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    subscribedAt: r.subscribedAt.toISOString(),
    isActive: r.isActive,
  }));

  return <SubscriberList initialSubscribers={subscribers} />;
}
