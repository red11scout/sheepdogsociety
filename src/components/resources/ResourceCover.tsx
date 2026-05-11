import { Icon, type IconName } from "@/components/icons/Icon";

/**
 * Deterministic SVG cover for resources that don't have a real
 * thumbnail (uploaded files / mammoth-extracted .docx, etc.).
 *
 * Why not AI image generation: gpt-image-1 collapses prompts about
 * "Christian men's ministry" into the same warm-toned bearded-man
 * photo every time. 56 cards looked identical. SVG gives us:
 *   - Same brand palette across all cards (visual consistency)
 *   - Real per-card variation via deterministic pattern + icon
 *   - Zero cost, zero latency, no Blob storage
 *   - Cluster-themed: each cluster picks a base palette + icon family
 *
 * The variation knobs (pattern shape, density, icon micro-rotation,
 * accent placement) are all hashed off the resource id, so the same
 * resource always renders the same cover.
 */

interface ResourceCoverProps {
  id: string;
  title: string;
  cluster?: string | null;
  /** Override the cluster-derived theme. Useful for sections that
   *  don't use clusters yet. */
  themeKey?: string;
  className?: string;
}

interface CoverTheme {
  bg: string;
  bgEnd: string;
  accent: string;
  ink: string;
  icon: IconName;
  /** Brief label, only shown to screen readers (alt-text). */
  alt: string;
}

// Cluster-name → theme. Keys are matched case-insensitively as
// substrings, so "Marriage & Family Leadership" matches "marriage".
// Order matters for substring overlap (more-specific keys first).
const CLUSTER_THEMES: Array<{ keywords: string[]; theme: CoverTheme }> = [
  {
    keywords: ["marriage", "family", "fatherhood", "wife", "spouse"],
    theme: {
      bg: "#5A4030", // warm sepia
      bgEnd: "#3A2A20",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "hands",
      alt: "Hands joined — marriage and family",
    },
  },
  {
    keywords: ["character", "growth", "discipline", "personal"],
    theme: {
      bg: "#1A2438", // navy
      bgEnd: "#0E1624",
      accent: "#C8932A",
      ink: "#F2EBDD",
      icon: "mountain",
      alt: "Mountain peak — character and growth",
    },
  },
  {
    keywords: ["faith", "trust", "surrender", "prayer"],
    theme: {
      bg: "#2C3D33", // deep olive
      bgEnd: "#1B2922",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "anchor",
      alt: "Anchor — faith and trust in God",
    },
  },
  {
    keywords: ["protection", "discernment", "guard", "vigilance", "wolf", "wolves"],
    theme: {
      bg: "#0E1624", // iron
      bgEnd: "#050810",
      accent: "#C8932A",
      ink: "#F2EBDD",
      icon: "shield",
      alt: "Shield — protection and discernment",
    },
  },
  {
    keywords: ["generosity", "service", "serving", "giving"],
    theme: {
      bg: "#5A6B3E", // olive
      bgEnd: "#3F4A2C",
      accent: "#F2EBDD",
      ink: "#F2EBDD",
      icon: "heart",
      alt: "Heart — generosity and service",
    },
  },
  {
    keywords: ["doctrine", "teaching", "gifts", "spiritual gifts", "scripture"],
    theme: {
      bg: "#7A1E1E", // oxblood
      bgEnd: "#4A1212",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "lamp",
      alt: "Lamp — doctrine and teaching",
    },
  },
  {
    keywords: ["leadership", "leading"],
    theme: {
      bg: "#1A2438",
      bgEnd: "#0E1624",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "compass",
      alt: "Compass — leadership",
    },
  },
  {
    keywords: ["identity", "calling", "manhood", "purpose"],
    theme: {
      bg: "#3D2C1F",
      bgEnd: "#241A12",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "oak",
      alt: "Oak — identity and calling",
    },
  },
];

// Fallback theme for resources whose cluster doesn't match any
// keyword (or that don't have a cluster set yet).
const DEFAULT_THEME: CoverTheme = {
  bg: "#1A2438",
  bgEnd: "#0E1624",
  accent: "#C8932A",
  ink: "#F2EBDD",
  icon: "scroll",
  alt: "Scroll — resource",
};

function pickTheme(cluster?: string | null, themeKey?: string): CoverTheme {
  const probe = (themeKey ?? cluster ?? "").toLowerCase();
  if (!probe) return DEFAULT_THEME;
  for (const entry of CLUSTER_THEMES) {
    if (entry.keywords.some((k) => probe.includes(k))) return entry.theme;
  }
  return DEFAULT_THEME;
}

// Deterministic 32-bit hash from a string. Fast, no crypto needed —
// we just want stable per-id variation across renders.
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// JS `>>` is the SIGNED right shift, so on a value > 2^31 the result is
// negative. Combined with `% n` that yields a negative index, and
// `positions[-3].x` throws "Cannot read properties of undefined". Use
// `>>>` (unsigned) and ((v % n) + n) % n to guarantee a non-negative
// modulus regardless of sign. Wrap once here and use everywhere.
function bucket(seed: number, divisor: number, shift = 0): number {
  const v = shift > 0 ? seed >>> shift : seed;
  return ((v % divisor) + divisor) % divisor;
}

/**
 * Six geometric pattern variants. Each takes the theme accent color
 * and renders a subtle texture across the canvas. The pattern picked
 * is determined by hash(id) % 6, so the same resource always looks
 * the same but two different resources in the same cluster look
 * meaningfully different.
 */
function renderPattern(variant: number, accent: string, opacity: number, seed: number) {
  const o = opacity.toFixed(2);
  const stroke = accent;
  switch (bucket(variant, 6)) {
    case 0: {
      // Grid of dots, density varies with seed
      const r = 2 + bucket(seed, 2);
      const gap = 28 + bucket(seed, 12, 3);
      const dots = [];
      for (let y = gap / 2; y < 240; y += gap) {
        for (let x = gap / 2; x < 400; x += gap) {
          dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${stroke}" opacity="${o}" />`);
        }
      }
      return dots.join("");
    }
    case 1: {
      // Diagonal hatch lines
      const gap = 14 + bucket(seed, 10, 1);
      const lines = [];
      for (let x = -240; x < 480; x += gap) {
        lines.push(
          `<line x1="${x}" y1="0" x2="${x + 240}" y2="240" stroke="${stroke}" stroke-width="1" opacity="${o}" />`
        );
      }
      return lines.join("");
    }
    case 2: {
      // Concentric arcs from a corner
      const corner = bucket(seed, 4);
      const cx = corner === 0 || corner === 3 ? 0 : 400;
      const cy = corner < 2 ? 0 : 240;
      const arcs = [];
      for (let r = 60; r < 520; r += 40 + bucket(seed, 20, 2)) {
        arcs.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="${o}" />`
        );
      }
      return arcs.join("");
    }
    case 3: {
      // Vertical bars, irregular
      const cols = 6 + bucket(seed, 5);
      const rects = [];
      for (let i = 0; i < cols; i++) {
        const x = (400 / cols) * i + 4;
        const w = 400 / cols - 8;
        // Math.imul keeps the multiply within 32-bit signed range, then
        // bucket() ensures non-negative modulus.
        const h = 60 + bucket(Math.imul(seed, i + 1), 140);
        const y = 240 - h;
        rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${stroke}" opacity="${(opacity * 0.5).toFixed(2)}" />`);
      }
      return rects.join("");
    }
    case 4: {
      // Triangular tessellation, single row
      const tri = [];
      const w = 36 + bucket(seed, 14, 4);
      for (let x = -w; x < 400 + w; x += w) {
        const flip = (Math.floor(x / w) + bucket(seed, 2)) % 2;
        const points = flip
          ? `${x},240 ${x + w},240 ${x + w / 2},${240 - w}`
          : `${x + w / 2},240 ${x + w},${240 - w} ${x},${240 - w}`;
        tri.push(`<polygon points="${points}" fill="${stroke}" opacity="${(opacity * 0.6).toFixed(2)}" />`);
      }
      return tri.join("");
    }
    case 5:
    default: {
      // Crosshatch grid
      const gap = 22 + bucket(seed, 10, 2);
      const lines = [];
      for (let x = 0; x < 400; x += gap) {
        lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="240" stroke="${stroke}" stroke-width="0.6" opacity="${o}" />`);
      }
      for (let y = 0; y < 240; y += gap) {
        lines.push(`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="${stroke}" stroke-width="0.6" opacity="${o}" />`);
      }
      return lines.join("");
    }
  }
}

export function ResourceCover({
  id,
  title,
  cluster,
  themeKey,
  className,
}: ResourceCoverProps) {
  const theme = pickTheme(cluster, themeKey);
  const seed = hash32(id || title);
  const variant = bucket(seed, 6);
  // Pattern opacity varies slightly to keep texture distinct.
  const patternOpacity = 0.08 + bucket(seed, 5, 5) * 0.015;
  // Icon micro-rotation: -8 to +8 degrees, deterministic.
  const iconRotation = bucket(seed, 17, 8) - 8;
  // Accent corner motif: which corner gets the small geometric mark.
  const cornerVariant = bucket(seed, 4, 11);

  // Build the pattern as a static SVG fragment. We render this via
  // dangerouslySetInnerHTML inside an inline <svg> wrapper so we don't
  // pay React reconciliation cost on dozens of <line>/<rect> children.
  const patternSvg = renderPattern(variant, theme.accent, patternOpacity, seed);

  // Corner accent: small filled square or angle bracket. Adds a hand-
  // crafted feel without overwhelming the icon. Defensive: cornerVariant
  // is bucketed to [0,3] but if anything ever drifts out of range we
  // clamp to 0 instead of crashing the page (`positions[bad].x` would
  // throw "Cannot read properties of undefined").
  const cornerMark = (() => {
    const size = 20;
    const m = 16;
    const positions = [
      { x: m, y: m },
      { x: 400 - m - size, y: m },
      { x: m, y: 240 - m - size },
      { x: 400 - m - size, y: 240 - m - size },
    ];
    const p = positions[cornerVariant] ?? positions[0];
    return `<rect x="${p.x}" y="${p.y}" width="${size}" height="${size}" fill="none" stroke="${theme.accent}" stroke-width="1.5" opacity="0.6" />`;
  })();

  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bgEnd} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
      role="img"
      aria-label={`${title} — ${theme.alt}`}
    >
      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        dangerouslySetInnerHTML={{ __html: patternSvg + cornerMark }}
      />
      {/* Icon, brass, dramatically scaled up */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${iconRotation}deg)`,
        }}
      >
        <Icon
          name={theme.icon}
          size={92}
          style={{ color: theme.accent, opacity: 0.92 }}
        />
      </div>
    </div>
  );
}
