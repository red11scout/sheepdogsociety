import { cn } from "@/lib/utils";

interface VersePlateProps {
  variant?: "hero" | "full";
  className?: string;
}

export function VersePlate({ variant = "hero", className }: VersePlateProps) {
  return (
    <section
      className={cn(
        "relative isolate w-full overflow-hidden bg-iron text-bone",
        variant === "full" ? "min-h-screen" : "py-28 md:py-40",
        className
      )}
    >
      <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-6 md:px-12">
        <div className="flex items-center gap-4">
          <span className="section-mark">§ I &middot; The Watch</span>
          <div className="hairline flex-1" />
        </div>

        <h2 className="display-xl mt-10 text-[clamp(2.5rem,8vw,7.5rem)] text-bone">
          <span className="text-brass">Keep watch</span>
          <br />
          over yourselves
          <br />
          and all the flock.
        </h2>

        <p className="mt-10 max-w-2xl font-pullquote text-xl italic leading-relaxed text-stone md:text-2xl">
          Be shepherds of the church of God, which he bought with his own blood.
        </p>

        <div className="mt-14 flex items-center gap-4">
          <div className="hairline flex-1" />
          <span className="section-mark text-brass">Acts 20:28 &middot; ESV</span>
        </div>
      </div>
    </section>
  );
}
