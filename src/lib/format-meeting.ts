/** Meeting day/time/place are free-text admin fields; these normalize them
 *  for public display so one ledger never mixes "7AM", "5:00am", "6:00 pm". */

/** "7AM" / "5:00am" / "6:00 pm" -> "7:00 AM". Unparseable input passes through trimmed. */
export function formatMeetingTime(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p)\.?m\.?$/i);
  if (!m) return s;
  return `${Number(m[1])}:${m[2] ?? "00"} ${m[3].toUpperCase()}M`;
}

/** Joins place parts with ", ", trimming each and dropping blanks. */
export function joinPlace(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}
