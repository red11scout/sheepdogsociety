import { cn } from "@/lib/utils";

const REFS = [
  "Acts 20:28",
  "Romans 5:3—4",
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
];

interface ScriptureMarqueeProps {
  className?: string;
}

export function ScriptureMarquee({ className }: ScriptureMarqueeProps) {
  return (
    <div
      className={cn(
        "marquee group/m relative w-full overflow-hidden border-y border-stone/15",
        className
      )}
      aria-hidden
    >
      <div className="marquee-track flex shrink-0 items-center gap-12 py-5">
        {[...REFS, ...REFS, ...REFS].map((r, i) => (
          <span
            key={i}
            className="section-mark inline-flex shrink-0 items-center gap-12 whitespace-nowrap text-stone/60"
          >
            {r}
            <span className="inline-block h-1 w-1 bg-brass" />
          </span>
        ))}
      </div>
    </div>
  );
}
