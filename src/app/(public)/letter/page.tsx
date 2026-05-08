import { redirect } from "next/navigation";

// /letter is consolidated into /encouragements. Both surfaces were "the
// weekly post"; users were getting the dual-name confusion. Old data in
// the `letters` table is preserved at the DB level — surfacing it again
// is a future migration task.
export default function LegacyLetterRedirect() {
  redirect("/encouragements");
}
