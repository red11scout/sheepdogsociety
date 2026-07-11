export const dynamic = "force-dynamic";

import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ContactsList, type Contact } from "./contacts-list";

export default async function AdminContactsPage() {
  // Same query the /api/admin/contacts GET runs; dates serialized to ISO
  // strings to match the JSON shape the client previously fetched.
  const rows = await db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt));

  const submissions: Contact[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    topic: r.topic,
    message: r.message,
    isRead: r.isRead,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ContactsList initialSubmissions={submissions} />;
}
