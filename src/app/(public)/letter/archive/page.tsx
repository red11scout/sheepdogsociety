import { redirect } from "next/navigation";

// Legacy /letter/archive → /encouragements (the new home for the
// weekly post archive).
export default function LegacyLetterArchiveRedirect() {
  redirect("/encouragements");
}
