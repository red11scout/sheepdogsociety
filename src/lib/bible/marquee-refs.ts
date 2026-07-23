/** The footer ticker's references. Lives in a plain module (not the
 *  "use client" marquee component) because the server footer needs the
 *  actual array — value exports from client modules reach server
 *  components as opaque client-reference proxies. */
export const MARQUEE_REFS = [
  "Acts 20:28",
  "Romans 5:3-4",
  "1 Peter 5:8",
  "Ezekiel 34:11",
  "Psalm 23",
  "John 10:11",
  "Proverbs 27:17",
  "Ephesians 6:10",
  "Joshua 1:9",
  "Matthew 7:13",
  "1 Corinthians 16:13",
  "Hebrews 12:1",
] as const;
