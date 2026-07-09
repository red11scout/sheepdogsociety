#!/usr/bin/env node
/**
 * WCAG AA contrast gate for the Pasture & Iron token pairs, BOTH themes.
 * Parses src/app/globals.css (top-level :root and .dark blocks only —
 * .admin-shell overrides are admin chrome, out of scope), converts
 * oklch()/hex to relative luminance, and fails (exit 1) if any declared
 * pair misses its threshold. Run: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const cssPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/app/globals.css"
);
const css = readFileSync(cssPath, "utf8");

/** Merge every top-level `selector { ... }` block's custom properties. */
function collectVars(selector) {
  const vars = {};
  // Match `:root {` / `.dark {` exactly (not `.dark .admin-shell {`).
  const re = new RegExp(
    String.raw`(^|\n)\s*${selector.replace(".", "\\.")}\s*\{([^}]*)\}`,
    "g"
  );
  for (const m of css.matchAll(re)) {
    for (const d of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars[`--${d[1]}`] = d[2].trim();
    }
  }
  return vars;
}

const light = collectVars(":root");
const dark = { ...light, ...collectVars(".dark") };

function resolve(vars, value) {
  let v = value;
  for (let i = 0; i < 4 && /^var\(/.test(v); i++) {
    const name = v.match(/^var\((--[\w-]+)\)/)?.[1];
    if (!name || !(name in vars)) return null;
    v = vars[name];
  }
  return v;
}

// 0.03928 is WCAG 2.1's published relative-luminance crossover (the IEC
// sRGB constant is 0.04045; no 8-bit value falls between them, but we
// match the spec byte-for-byte).
const srgbToLinear = (c) =>
  c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

function hexToLinear(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) =>
    srgbToLinear(parseInt(full.slice(i, i + 2), 16) / 255)
  );
}

/** oklch() -> linear sRGB (standard OKLab matrices). */
function oklchToLinear(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function toLuminance(value) {
  const v = value.trim();
  let rgb;
  if (v.startsWith("#")) rgb = hexToLinear(v);
  else {
    const m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
    if (!m) return null;
    rgb = oklchToLinear(+m[1], +m[2], +m[3]);
  }
  const [r, g, b] = rgb.map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(bg, fg) {
  const [hi, lo] = [Math.max(bg, fg), Math.min(bg, fg)];
  return (hi + 0.05) / (lo + 0.05);
}

// (bgVar, fgVar, min, label). Literal hex allowed for the ember constants.
const PAIRS = [
  ["--background", "--foreground", 4.5, "body text"],
  ["--background", "--muted-foreground", 4.5, "muted body text"],
  ["--card", "--card-foreground", 4.5, "card text"],
  ["--background", "--c-stone", 4.5, "folio small print"],
  ["--background", "--c-brass-deep", 4.5, "section marks / brass-colored text"],
  ["--background", "--c-oxblood", 3.0, "oxblood display ems (display size)"],
  ["--c-brass", "--c-iron", 4.5, "brass fill + iron text (CTA)"],
  ["--c-bone", "--c-ink", 4.5, "legacy bone/ink safety net"],
  ["#1c1610", "#efe7d5", 4.5, "ember band body"],
  ["#1c1610", "#c9834a", 4.5, "ember band copper kicker"],
];

let failed = false;
for (const [themeName, vars] of [
  ["light", light],
  ["dark", dark],
]) {
  console.log(`\n=== ${themeName} ===`);
  for (const [bgKey, fgKey, min, label] of PAIRS) {
    const bgRaw = bgKey.startsWith("#") ? bgKey : resolve(vars, vars[bgKey] ?? "");
    const fgRaw = fgKey.startsWith("#") ? fgKey : resolve(vars, vars[fgKey] ?? "");
    const bg = bgRaw ? toLuminance(bgRaw) : null;
    const fg = fgRaw ? toLuminance(fgRaw) : null;
    if (bg == null || fg == null) {
      console.log(`  ?? ${label}: could not resolve ${bgKey} / ${fgKey}`);
      failed = true;
      continue;
    }
    const r = ratio(bg, fg);
    const ok = r >= min;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? "OK " : "FAIL"} ${label}: ${r.toFixed(2)}:1 (needs ${min}:1) [${bgKey} vs ${fgKey}]`
    );
  }
}
process.exit(failed ? 1 : 0);
