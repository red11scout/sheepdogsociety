import { HeroAtmosphere } from "@/components/motion/HeroAtmosphere";

/**
 * Ambient — drops the full cinematic atmosphere (light field + drifting
 * embers + framing vignette) into a hero section. Place it as the FIRST
 * child of a `relative overflow-hidden` section and render the real
 * content in a sibling wrapped with `relative z-10`.
 *
 * `soft` (the default for interior pages) dials the whole thing down so
 * the shorter interior heroes keep the mood without ever competing with
 * the headline for legibility. A readability scrim sits just under the
 * content so text stays crisp in both themes.
 */
export function Ambient({ soft = false }: { soft?: boolean }) {
  return (
    <>
      <div
        className={`nw-hero-light${soft ? " nw-hero-light--soft" : ""}`}
        aria-hidden="true"
      />
      <HeroAtmosphere intensity={soft ? 0.55 : 1} />
      <div
        className={`nw-hero-vignette${soft ? " nw-hero-vignette--soft" : ""}`}
        aria-hidden="true"
      />
      <div className="nw-hero-scrim" aria-hidden="true" />
    </>
  );
}
