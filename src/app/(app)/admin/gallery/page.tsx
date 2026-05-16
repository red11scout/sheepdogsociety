import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { listAllEventsForAdminGallery } from "@/server/gallery";
import { GalleryManager } from "./manager";

export const dynamic = "force-dynamic";

/**
 * Unified admin gallery — every event in one list, drag-drop uploads,
 * inline captions, per-event description editor. Reuses events.photos
 * jsonb (no migration). The public /gallery surface reads the same.
 */
export default async function AdminGalleryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") redirect("/admin/sign-in");

  const rows = await listAllEventsForAdminGallery();

  return (
    <GalleryManager
      initial={rows.map((r) => ({
        id: r.id,
        title: r.title,
        startTime: r.startTime.toISOString(),
        location: r.location ?? "",
        eventType: r.eventType ?? "",
        description: r.description ?? "",
        photoCount: r.photoCount,
      }))}
    />
  );
}
