import { THEOLOGIAN_VOICES } from "@/lib/ai/voices";
import { SeriesComposer } from "./series-composer";

export const dynamic = "force-dynamic";

export default function NewSeriesPage() {
  // Strip systemAddendum before sending to client — only need labels there.
  const voices = THEOLOGIAN_VOICES.map(({ id, name, shortBio, hallmarks }) => ({
    id,
    name,
    shortBio,
    hallmarks,
  }));
  return <SeriesComposer voices={voices} />;
}
