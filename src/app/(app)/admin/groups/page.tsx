import { listAdminGroupsLocations } from "@/server/admin-groups-locations";
import { GroupsLocationsTable } from "./groups-locations-table";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  let rows: Awaited<ReturnType<typeof listAdminGroupsLocations>> = [];
  let dbError = "";
  try {
    rows = await listAdminGroupsLocations();
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not load. Migration 0009 may not be applied.";
  }
  return <GroupsLocationsTable initialRows={rows} dbError={dbError} />;
}
