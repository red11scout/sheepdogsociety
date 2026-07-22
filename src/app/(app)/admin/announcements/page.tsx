export const dynamic = "force-dynamic";

import {
  getAudienceCounts,
  listAnnouncements,
  type AnnouncementHistoryRow,
} from "@/server/announcements";
import { AnnouncementsComposer } from "./announcements-composer";

export default async function AdminAnnouncementsPage() {
  let counts = { all: 0, leaders: 0, groups: 0 };
  let history: AnnouncementHistoryRow[] = [];
  let dbError = "";
  try {
    [counts, history] = await Promise.all([
      getAudienceCounts(),
      listAnnouncements(),
    ]);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Could not load. Migration 0025 may not be applied.";
  }
  return (
    <AnnouncementsComposer counts={counts} history={history} dbError={dbError} />
  );
}
