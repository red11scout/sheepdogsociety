import {
  listSections,
  listResourcesForAdmin,
} from "@/server/resources-admin";
import { ResourcesAdmin } from "./admin";

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
    <ResourcesAdmin
      initialSections={sections}
      initialResources={resources}
      dbError={dbError}
    />
  );
}
