// "Start a new letter" entry point. Creates a draft row and redirects to
// its editor. Has to be a Server Component so the createLetter() server
// action runs on first hit (no client-side handler needed).
import { createLetter } from "@/server/letters";

export const dynamic = "force-dynamic";

export default async function NewLetterPage() {
  await createLetter();
  return null; // unreachable — createLetter redirects
}
