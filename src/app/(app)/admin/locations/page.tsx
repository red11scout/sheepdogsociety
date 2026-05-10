import { redirect } from "next/navigation";

// /admin/locations consolidated into /admin/groups (one joined table for
// groups + their locations). Redirect for any bookmark or stale link.
export default function LegacyLocationsRedirect() {
  redirect("/admin/groups");
}
