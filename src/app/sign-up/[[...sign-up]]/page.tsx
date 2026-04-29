import { redirect } from "next/navigation";

// Legacy Clerk sign-up path. Member sign-up via the public site is
// disabled during the auth migration; admin sign-in is at /admin/sign-in.
export default function LegacySignUp() {
  redirect("/admin/sign-in");
}
