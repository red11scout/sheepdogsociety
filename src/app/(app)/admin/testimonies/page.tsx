export const dynamic = "force-dynamic";

import { db } from "@/db";
import { testimonies, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { TestimoniesList, type Testimony } from "./testimonies-list";

export default async function AdminTestimoniesPage() {
  // Same query the /api/admin/testimonies GET runs (incl. the users
  // left join for author fields); dates serialized to ISO strings to
  // match the JSON shape the client previously fetched.
  const rows = await db
    .select({
      id: testimonies.id,
      title: testimonies.title,
      content: testimonies.content,
      isApproved: testimonies.isApproved,
      approvedBy: testimonies.approvedBy,
      approvedAt: testimonies.approvedAt,
      createdAt: testimonies.createdAt,
      userId: testimonies.userId,
      authorFirstName: users.firstName,
      authorEmail: users.email,
    })
    .from(testimonies)
    .leftJoin(users, eq(testimonies.userId, users.id))
    .orderBy(desc(testimonies.createdAt));

  const initialTestimonies: Testimony[] = rows.map((r) => ({
    ...r,
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <TestimoniesList initialTestimonies={initialTestimonies} />;
}
