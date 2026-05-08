import { THEOLOGIAN_VOICES } from "@/lib/ai/voices";
import { Composer } from "./composer";

export const dynamic = "force-dynamic";

export default function NewEncouragementPage() {
  // Strip the long systemAddendum before sending voices to the client — the
  // browser only needs the picker labels. The addendum stays server-side.
  const voices = THEOLOGIAN_VOICES.map(({ id, name, shortBio, hallmarks }) => ({
    id,
    name,
    shortBio,
    hallmarks,
  }));
  return <Composer voices={voices} />;
}
