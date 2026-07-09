import { redirect } from "next/navigation";

// The full-ledger archive page lands in the letter/stories elevation
// task (Phase 2 Task 9). Until then every issue is on the index.
export default function LetterArchivePage() {
  redirect("/letter");
}
