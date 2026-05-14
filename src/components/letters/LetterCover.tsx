import { Icon, type IconName } from "@/components/icons/Icon";

/**
 * Deterministic SVG cover for The Letter (weekly encouragement).
 *
 * Same approach as ResourceCover: cluster-themed palette + per-id
 * geometric pattern. AI photo gen produced near-identical bearded-men
 * scenes for every letter, which made the archive look like a stock
 * photo catalog. SVG covers give us:
 *   - Visual consistency across the archive (same brand, same shape)
 *   - Real per-letter variation via deterministic pattern + theme tag
 *   - Zero cost, zero latency, no Blob storage
 *   - Renders even when admin hasn't uploaded a cover yet
 *
 * The admin can still upload or AI-generate a real photo per letter
 * via the editor; that wins over the SVG when present (see public
 * encouragement page render branch).
 */

interface LetterCoverProps {
  id: string;
  title: string;
  /** Series theme or per-letter theme — drives palette + icon. */
  theme?: string | null;
  className?: string;
}

interface CoverTheme {
  bg: string;
  bgEnd: string;
  accent: string;
  ink: string;
  icon: IconName;
  alt: string;
}

// Letter-theme → palette mapping. Substring-matched against the theme
// string (case-insensitive). Order matters — more-specific keys first.
const THEME_PALETTES: Array<{ keywords: string[]; theme: CoverTheme }> = [
  {
    keywords: ["endurance", "perseverance", "long", "watch"],
    theme: {
      bg: "#1A2438",
      bgEnd: "#0E1624",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "watchtower",
      alt: "Watchtower — endurance",
    },
  },
  {
    keywords: ["marriage", "family", "wife", "fatherhood", "household"],
    theme: {
      bg: "#5A4030",
      bgEnd: "#3A2A20",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "heart",
      alt: "Heart — marriage and family",
    },
  },
  {
    keywords: ["faith", "trust", "surrender", "prayer", "good news", "gospel"],
    theme: {
      bg: "#2C3D33",
      bgEnd: "#1B2922",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "anchor",
      alt: "Anchor — faith and trust",
    },
  },
  {
    keywords: ["protection", "discernment", "guard", "wolf", "wolves", "watch"],
    theme: {
      bg: "#0E1624",
      bgEnd: "#050810",
      accent: "#C8932A",
      ink: "#F2EBDD",
      icon: "shield",
      alt: "Shield — protection",
    },
  },
  {
    keywords: ["spirit", "holy spirit", "filled", "fire", "flame"],
    theme: {
      bg: "#7A1E1E",
      bgEnd: "#4A1212",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "flame",
      alt: "Flame — Spirit",
    },
  },
  {
    keywords: ["leadership", "leading", "lead", "shepherd"],
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
    keywords: ["service", "serving", "generosity", "giving"],
    theme: {
      bg: "#5A6B3E",
      bgEnd: "#3F4A2C",
      accent: "#F2EBDD",
      ink: "#F2EBDD",
      icon: "hands",
      alt: "Open hands — service",
    },
  },
  {
    keywords: ["doctrine", "teaching", "scripture", "word", "bible"],
    theme: {
      bg: "#7A1E1E",
      bgEnd: "#4A1212",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "scroll",
      alt: "Scroll — the word",
    },
  },
  {
    keywords: ["identity", "calling", "purpose", "manhood", "called"],
    theme: {
      bg: "#3D2C1F",
      bgEnd: "#241A12",
      accent: "#DBAA48",
      ink: "#F2EBDD",
      icon: "oak",
      alt: "Oak — identity",
    },
  },
  {
    keywords: ["mountain", "growth", "strength", "character"],
    theme: {
      bg: "#1A2438",
      bgEnd: "#0E1624",
      accent: "#C8932A",
      ink: "#F2EBDD",
      icon: "mountain",
      alt: "Mountain — character",
    },
  },
];

const DEFAULT_THEME: CoverTheme = {
  bg: "#1A2438",
  bgEnd: "#0E1624",
  accent: "#DBAA48",
  ink: "#F2EBDD",
  icon: "watchtower",
  alt: "The Letter from the Watch",
};

function pickTheme(theme?: string | null): CoverTheme {
  const probe = (theme ?? "").toLowerCase();
  if (!probe) return DEFAULT_THEME;
  for (const entry of THEME_PALETTES) {
    if (entry.keywords.some((k) => probe.includes(k))) return entry.theme;
  }
  return DEFAULT_THEME;
}

// Deterministic FNV-1a hash, returns unsigned 32-bit.
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// Always non-negative modulus from a (possibly large) hash. Critical:
// JS `>>` is signed; use `>>>` (unsigned) and `((v % n) + n) % n` to
// guarantee a result in [0, divisor). See ResourceCover for the bug
// this guards against.
function bucket(seed: number, divisor: number, shift = 0): number {
  const v = shift > 0 ? seed >>> shift : seed;
  return ((v % divisor) + divisor) % divisor;
}

function renderPattern(variant: number, accent: string, opacity: number, seed: number) {
  const o = opacity.toFixed(2);
  const stroke = accent;
  switch (bucket(variant, 6)) {
    case 0: {
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
      const cols = 6 + bucket(seed, 5);
      const rects = [];
      for (let i = 0; i < cols; i++) {
        const x = (400 / cols) * i + 4;
        const w = 400 / cols - 8;
        const h = 60 + bucket(Math.imul(seed, i + 1), 140);
        const y = 240 - h;
        rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${stroke}" opacity="${(opacity * 0.5).toFixed(2)}" />`);
      }
      return rects.join("");
    }
    case 4: {
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

export function LetterCover({ id, title, theme, className }: LetterCoverProps) {
  const palette = pickTheme(theme);
  const seed = hash32(id || title);
  const variant = bucket(seed, 6);
  const patternOpacity = 0.08 + bucket(seed, 5, 5) * 0.015;
  const iconRotation = bucket(seed, 17, 8) - 8;
  const cornerVariant = bucket(seed, 4, 11);

  const patternSvg = renderPattern(variant, palette.accent, patternOpacity, seed);

  const cornerMark = (() => {
    const size = 24;
    const m = 20;
    const positions = [
      { x: m, y: m },
      { x: 400 - m - size, y: m },
      { x: m, y: 240 - m - size },
      { x: 400 - m - size, y: 240 - m - size },
    ];
    const p = positions[cornerVariant] ?? positions[0];
    return `<rect x="${p.x}" y="${p.y}" width="${size}" height="${size}" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.55" />`;
  })();

  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgEnd} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
      role="img"
      aria-label={`${title} — ${palette.alt}`}
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
          name={palette.icon}
          size={104}
          style={{ color: palette.accent, opacity: 0.9 }}
        />
      </div>
    </div>
  );
}
