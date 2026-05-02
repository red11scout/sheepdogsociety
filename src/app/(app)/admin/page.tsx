import { redirect } from "next/navigation";

// /admin → /admin/dashboard. Middleware bounces unauthenticated requests to
// /admin/sign-in before this redirect runs, so this is the authenticated
// entry point. Saves admins from typing the full /admin/dashboard.
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
