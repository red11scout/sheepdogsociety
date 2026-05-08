import {
  listSections,
  listResourcesForAdmin,
} from "@/server/resources-admin";
import { ResourcesAdmin } from "./admin";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";

export const dynamic = "force-dynamic";

export default async function ResourcesAdminPage() {
  let sections: Awaited<ReturnType<typeof listSections>> = [];
  let resources: Awaited<ReturnType<typeof listResourcesForAdmin>> = [];
  let dbError = "";
  try {
    [sections, resources] = await Promise.all([
      listSections(),
      listResourcesForAdmin(),
    ]);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not load. Migration 0002 may not be applied yet.";
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
      <AdminPageIntro
        kicker="Resources"
        title="PDFs and guides, organized by section."
        description="Pick a section first (Bible Studies, Leader Guides, Workout Plans, Sermons, Devotional Series). Then add a resource: title, file, optional cover image. Sections seed the public /resources page navigation."
        hint="A section is the category. A resource is the file inside it. Sections were seeded for you; add new ones at the bottom of the section tab list."
      />
      <ResourcesAdmin
        initialSections={sections}
        initialResources={resources}
        dbError={dbError}
      />
    </div>
  );
}
