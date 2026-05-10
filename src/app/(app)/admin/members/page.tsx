import { listAdminMembers, listGroupOptions } from "@/server/admin-members";
import { MembersTable } from "./members-table";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  let rows: Awaited<ReturnType<typeof listAdminMembers>> = [];
  let groupOptions: Awaited<ReturnType<typeof listGroupOptions>> = [];
  let dbError = "";
  try {
    [rows, groupOptions] = await Promise.all([
      listAdminMembers(),
      listGroupOptions(),
    ]);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not load. Migration 0009 may not be applied.";
  }
  return (
    <MembersTable
      initialRows={rows}
      groupOptions={groupOptions}
      dbError={dbError}
    />
  );
}
