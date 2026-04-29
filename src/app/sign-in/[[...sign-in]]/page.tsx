import { redirect } from "next/navigation";

// Legacy Clerk sign-in path. Auth has migrated to Auth.js v5;
// admin users now go through /admin/sign-in (magic link).
export default function LegacySignIn() {
  redirect("/admin/sign-in");
}
