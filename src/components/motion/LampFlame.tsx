/**
 * LampFlame — the signature moment of "The Night Watch."
 *
 * A single living candle flame in pure SVG + CSS. NO canvas, NO JS
 * animation loop: every motion is a CSS keyframe (see globals.css
 * `.nw-flame*`), lit only in dark mode (at first light the lamp is
 * trimmed to a static brass mark), and stilled under
 * prefers-reduced-motion. The whole thing is aria-hidden and rendered
 * inline-block so a parent can absolutely-position it without ever
 * shifting layout (CLS 0).
 *
 * Layers: an ambient radial glow behind, then three teardrop paths —
 * outer flame (--flame), inner flame (--flame-bright), and a blue-white
 * core that only shows at night. Flicker/sway run on prime-number
 * durations (2.1s / 3.3s / 5.7s / 4s) so the loop never visibly repeats.
 */
interface LampFlameProps {
  /** Flame height in px (width scales to ~0.62×). Default 34. */
  size?: number;
  /** Adds the hero entrance "ignite" — fades up as the last beat. */
  ignite?: boolean;
  /** Lit but motionless (the six outer flames of the Letter echo). */
  still?: boolean;
  /** Position/utility classes for the wrapper. */
  className?: string;
}

export function LampFlame({
  size = 34,
  ignite = false,
  still = false,
  className = "",
}: LampFlameProps) {
  const width = Math.round(size * 0.62);
  const classes = [
    "nw-flame",
    ignite ? "nw-flame--ignite" : "",
    still ? "nw-flame--still" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <span className="nw-flame__glow" />
      <svg
        className="nw-flame__svg"
        width={width}
        height={size}
        viewBox="0 0 24 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer flame — the full teardrop. */}
        <path
          className="nw-flame__outer"
          d="M12 1C13.5 8 19 11 19 20.5C19 28.4 16 34 12 34C8 34 5 28.4 5 20.5C5 11 10.5 8 12 1Z"
        />
        {/* Inner flame. */}
        <path
          className="nw-flame__inner"
          d="M12 9C13 13.5 15.5 15.5 15.5 21.5C15.5 27 14 31 12 31C10 31 8.5 27 8.5 21.5C8.5 15.5 11 13.5 12 9Z"
        />
        {/* Blue-white core — night only. */}
        <path
          className="nw-flame__core"
          d="M12 16C12.6 18.6 13.5 20 13.5 23.5C13.5 27 12.8 29 12 29C11.2 29 10.5 27 10.5 23.5C10.5 20 11.4 18.6 12 16Z"
        />
      </svg>
    </span>
  );
}
