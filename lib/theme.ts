/**
 * Theme engine. Pure functions (no React, no aliases) so it can be unit tested with `pnpm test`.
 *
 * How it works
 * ------------
 * The app is styled with Tailwind palette classes (bg-emerald-600, text-stone-500, ...). In
 * app/palette.css every palette colour is routed through a runtime variable:
 *
 *     --color-emerald-600: var(--c-emerald-600, <tailwind default>);
 *
 * A theme is therefore nothing more than a set of `--c-*` variables on <html>. No theme set means
 * Tailwind's defaults, so "Paper" (the original look) needs no variables at all.
 *
 *  - `emerald` (+ `teal`) is the ACCENT palette, `stone` (+ `slate`) is the NEUTRAL palette.
 *  - Dark mode flips both ramps (shade 50 becomes the darkest) and also flips the small
 *    amber/rose/sky/orange/lime/red palettes, so existing classes keep their meaning: bg-*-50 is
 *    always "the lightest tint of the theme", text-*-900 is always "the strongest text".
 *  - A theme is described by a tiny ThemeSpec (mode, accent, tone, corners). Presets and the custom
 *    editor both produce a spec, and `buildVariant` turns it into variables.
 */
import { DEFAULT_PALETTES, SHADES } from "./palette-defaults.ts";

/* ---------- Types ---------- */

export type Mode = "light" | "dark";
export type ModePref = Mode | "auto";
export type Tone = "stone" | "neutral" | "cool" | "warm" | "tinted";
export type Corners = "sharp" | "soft" | "round";

export type ThemeSpec = {
  mode: ModePref;
  /** "emerald" = the original Tailwind green, otherwise a #rrggbb colour. */
  accent: string;
  tone: Tone;
  corners: Corners;
};

export type Variant = { vars: Record<string, string>; scheme: Mode; themeColor: string };

export type StoredTheme = {
  v: 1;
  /** A preset id, or "custom". */
  id: string;
  spec: ThemeSpec;
  /** Precomputed so the boot script can paint before React loads. `auto` stores both. */
  variants: Partial<Record<Mode, Variant>>;
};

export const THEME_STORAGE_KEY = "still:theme";
export const TONES: Tone[] = ["stone", "neutral", "cool", "warm", "tinted"];
export const CORNERS: Corners[] = ["sharp", "soft", "round"];
const RADIUS: Record<Corners, string> = { sharp: "0.2rem", soft: "0.625rem", round: "1.1rem" };

/* ---------- Colour maths (OKLCH <-> sRGB) ---------- */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

type Rgb = [number, number, number];

function linearToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH -> hex. If the colour is outside sRGB, chroma is reduced until it fits (hue and lightness are kept). */
export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const at = (c: number) => oklabToLinear([L, c * Math.cos(h), c * Math.sin(h)]);
  let rgb = at(C);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
    rgb = at(lo);
  }
  return (
    "#" +
    rgb
      .map((v) => Math.round(clamp(fromLinear(clamp(v, 0, 1)), 0, 1) * 255))
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** [L (0-1), C, hue (deg)] of a #rrggbb colour. */
export function hexToOklch(hex: string): [number, number, number] {
  const [L, a, b] = linearToOklab(hexToRgb(hex).map((v) => toLinear(v / 255)) as Rgb);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** Accepts "#rrggbb" or Tailwind's "oklch(97.9% 0.021 166.113)" and returns "#rrggbb". */
export function cssToHex(css: string): string {
  if (css.startsWith("#")) return css.length === 4 ? "#" + [...css.slice(1)].map((c) => c + c).join("") : css;
  const m = css.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`Unsupported colour: ${css}`);
  return oklchToHex(parseFloat(m[1]) / (m[2] ? 100 : 1), parseFloat(m[3]), parseFloat(m[4]));
}

/** WCAG contrast ratio between two colours (hex or Tailwind oklch strings). */
export function contrast(a: string, b: string): number {
  const lum = (css: string) => {
    const [r, g, bl] = hexToRgb(cssToHex(css)).map((v) => toLinear(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- Ramp generation ---------- */

const reversed = <T>(a: readonly T[]) => [...a].reverse();

// Lightness / chroma per shade (50 -> 950), modelled on Tailwind's own emerald and stone ramps.
const ACCENT_L = [0.979, 0.95, 0.905, 0.845, 0.765, 0.696, 0.596, 0.508, 0.432, 0.378, 0.262];
const MONO_L = [0.985, 0.965, 0.92, 0.86, 0.7, 0.5, 0.36, 0.3, 0.24, 0.19, 0.13]; // near-grey accents get strong, dark steps
const ACCENT_C = [0.12, 0.26, 0.53, 0.88, 1, 1, 0.85, 0.7, 0.56, 0.47, 0.3];
const NEUTRAL_L_LIGHT = [0.985, 0.97, 0.923, 0.869, 0.709, 0.553, 0.444, 0.374, 0.268, 0.216, 0.147];
const NEUTRAL_L_DARK = [0.145, 0.185, 0.255, 0.335, 0.52, 0.66, 0.75, 0.82, 0.89, 0.95, 0.985];
const NEUTRAL_C_LIGHT = [0.4, 0.6, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const DARK_SURFACE_L = 0.205;

/** Accent ramp (shade 50 = lightest) from one colour. Hue and vividness come from the colour; lightness is fixed. */
export function accentRamp(hex: string, hueShift = 0, chromaScale = 1): string[] {
  const [, c, h] = hexToOklch(hex);
  const grey = c < 0.025;
  const peak = (grey ? c : clamp(c, 0.06, 0.2)) * chromaScale;
  const Ls = [...(grey ? MONO_L : ACCENT_L)];

  const make = (i: number) => oklchToHex(Ls[i], peak * ACCENT_C[i], h + hueShift);
  // Keep text-*-700 readable on white (4.5:1) and bg-*-600 usable behind white text (3.5:1).
  const floors: [number, number][] = [
    [6, 3.5],
    [7, 4.5],
  ];
  for (const [i, min] of floors) {
    while (contrast(make(i), "#ffffff") < min && Ls[i] > 0.15) Ls[i] -= 0.01;
  }
  for (let i = 7; i < Ls.length; i++) Ls[i] = Math.min(Ls[i], Ls[i - 1] - 0.03); // stay monotonic
  return Ls.map((_, i) => make(i));
}

function toneParams(tone: Tone, accentHue: number, dark: boolean): { h: number; c: number } {
  switch (tone) {
    case "neutral":
      return { h: 0, c: 0 };
    case "cool":
      return { h: 258, c: dark ? 0.018 : 0.012 };
    case "warm":
      return { h: 70, c: dark ? 0.014 : 0.012 };
    case "tinted":
      return { h: accentHue, c: dark ? 0.02 : 0.013 };
    default:
      return { h: 60, c: dark ? 0.009 : 0.009 }; // "stone"
  }
}

function neutralRamp(tone: Tone, accentHue: number, dark: boolean): string[] {
  const { h, c } = toneParams(tone, accentHue, dark);
  const Ls = dark ? NEUTRAL_L_DARK : NEUTRAL_L_LIGHT;
  return Ls.map((L, i) => oklchToHex(L, c * (dark ? 1 : NEUTRAL_C_LIGHT[i]), h));
}

/* ---------- Variants ---------- */

export const DEFAULT_ACCENT = "emerald";
export const PAPER_SPEC: ThemeSpec = { mode: "light", accent: DEFAULT_ACCENT, tone: "stone", corners: "soft" };


/** Inverted tints (shades 50 and 100) start out very saturated and read as muddy brown or red; keep them faint. */
function softenTints(steps: string[]): string[] {
  return steps.map((hex, i) => {
    if (i > 1) return hex;
    const [L, C, h] = hexToOklch(hex);
    return oklchToHex(L, C * (i === 0 ? 0.45 : 0.7), h);
  });
}

const OTHER_PALETTES = ["amber", "rose", "sky", "orange", "lime", "red"];

function emit(vars: Record<string, string>, palette: string, steps: readonly string[]) {
  SHADES.forEach((s, i) => (vars[`--c-${palette}-${s}`] = cssToHex(steps[i])));
}

/** Turns a spec into the CSS variables for one concrete mode. */
export function buildVariant(spec: ThemeSpec, mode: Mode): Variant {
  const dark = mode === "dark";
  const vars: Record<string, string> = {};
  const customAccent = spec.accent !== DEFAULT_ACCENT;
  const [, , accentHue] = customAccent ? hexToOklch(spec.accent) : hexToOklch("#10b981");

  const neutral = spec.tone === "stone" && !dark ? DEFAULT_PALETTES.stone : neutralRamp(spec.tone, accentHue, dark);
  const slate = spec.tone === "stone" && !dark ? DEFAULT_PALETTES.slate : neutral;
  const accent = customAccent ? accentRamp(spec.accent) : DEFAULT_PALETTES.emerald;
  const teal = customAccent ? accentRamp(spec.accent, 25, 0.8) : DEFAULT_PALETTES.teal;

  if (!dark) {
    if (customAccent) {
      emit(vars, "emerald", accent);
      emit(vars, "teal", teal);
    }
    if (spec.tone !== "stone") {
      emit(vars, "stone", neutral);
      emit(vars, "slate", slate);
    }
    if (customAccent || spec.tone !== "stone") vars["--c-white"] = "#ffffff";
  } else {
    emit(vars, "emerald", reversed(accent));
    emit(vars, "teal", reversed(teal));
    emit(vars, "stone", neutral);
    emit(vars, "slate", slate);
    for (const p of OTHER_PALETTES) emit(vars, p, softenTints(reversed(DEFAULT_PALETTES[p].map(cssToHex))));
    const { h, c } = toneParams(spec.tone, accentHue, true);
    vars["--c-white"] = oklchToHex(DARK_SURFACE_L, c, h); // card surface sits between the page and bg-stone-100
  }

  if (spec.corners !== "soft") vars["--radius"] = RADIUS[spec.corners];
  const bg = vars["--c-stone-50"] ?? cssToHex(DEFAULT_PALETTES.stone[0]);
  return { vars, scheme: mode, themeColor: cssToHex(bg) };
}

export function resolveMode(pref: ModePref, systemDark: boolean): Mode {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

/** The variants worth precomputing for a spec: both for "auto", otherwise just the one. */
export function buildVariants(spec: ThemeSpec): StoredTheme["variants"] {
  return spec.mode === "auto"
    ? { light: buildVariant(spec, "light"), dark: buildVariant(spec, "dark") }
    : { [spec.mode]: buildVariant(spec, spec.mode) };
}

export function buildStored(id: string, spec: ThemeSpec): StoredTheme {
  return { v: 1, id, spec, variants: buildVariants(spec) };
}

/** Looks up one colour of a variant, falling back to Tailwind's default (for swatches and previews). */
export function colorOf(variant: Variant, palette: string, shade: (typeof SHADES)[number] | "white"): string {
  if (shade === "white") return variant.vars["--c-white"] ?? "#ffffff";
  const i = SHADES.indexOf(shade);
  return variant.vars[`--c-${palette}-${shade}`] ?? cssToHex(DEFAULT_PALETTES[palette][i]);
}

/* ---------- Presets ---------- */

export type Preset = { id: string; name: string; blurb: string; spec: ThemeSpec };

export const PRESETS: Preset[] = [
  { id: "paper", name: "Paper", blurb: "The original: soft green on warm paper", spec: PAPER_SPEC },
  { id: "sunrise", name: "Sunrise", blurb: "Warm orange on cream", spec: { mode: "light", accent: "#f97316", tone: "warm", corners: "soft" } },
  { id: "ocean", name: "Ocean", blurb: "Cool sky blue, crisp and calm", spec: { mode: "light", accent: "#0ea5e9", tone: "cool", corners: "soft" } },
  { id: "blossom", name: "Blossom", blurb: "Rosy pink, extra round", spec: { mode: "light", accent: "#ec4899", tone: "tinted", corners: "round" } },
  { id: "mono", name: "Mono", blurb: "Quiet black and white, sharp edges", spec: { mode: "light", accent: "#525252", tone: "neutral", corners: "sharp" } },
  { id: "midnight", name: "Midnight", blurb: "Indigo glow on deep blue-grey", spec: { mode: "dark", accent: "#818cf8", tone: "cool", corners: "soft" } },
  { id: "forest", name: "Forest", blurb: "Deep green dusk", spec: { mode: "dark", accent: DEFAULT_ACCENT, tone: "tinted", corners: "soft" } },
  { id: "ember", name: "Ember", blurb: "Amber on warm charcoal", spec: { mode: "dark", accent: "#f59e0b", tone: "warm", corners: "soft" } },
];

/** Accent swatches offered in the custom editor ("emerald" is the original). */
export const ACCENT_SWATCHES: { name: string; value: string }[] = [
  { name: "Emerald", value: DEFAULT_ACCENT },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Graphite", value: "#525252" },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

/** Which preset (if any) a spec exactly equals. */
export function matchPreset(spec: ThemeSpec): Preset | undefined {
  return PRESETS.find((p) => JSON.stringify(p.spec) === JSON.stringify(spec));
}

/* ---------- Validation (anything from localStorage is untrusted) ---------- */

const HEX = /^#[0-9a-f]{6}$/i;

export function isValidAccent(x: unknown): x is string {
  return x === DEFAULT_ACCENT || (typeof x === "string" && HEX.test(x));
}

export function parseSpec(raw: unknown): ThemeSpec | null {
  const s = raw as Partial<ThemeSpec> | null;
  if (!s || typeof s !== "object") return null;
  if (s.mode !== "light" && s.mode !== "dark" && s.mode !== "auto") return null;
  if (!isValidAccent(s.accent)) return null;
  if (!TONES.includes(s.tone as Tone)) return null;
  if (!CORNERS.includes(s.corners as Corners)) return null;
  return { mode: s.mode, accent: s.accent.toLowerCase() === DEFAULT_ACCENT ? DEFAULT_ACCENT : s.accent.toLowerCase(), tone: s.tone as Tone, corners: s.corners as Corners };
}

/** Returns { id, spec } from stored JSON, or null. Variants are always rebuilt from the spec, never trusted. */
export function parseStored(raw: unknown): { id: string; spec: ThemeSpec } | null {
  const s = raw as Partial<StoredTheme> | null;
  if (!s || typeof s !== "object" || s.v !== 1 || typeof s.id !== "string") return null;
  const spec = parseSpec(s.spec);
  return spec ? { id: s.id === "custom" || presetById(s.id) ? s.id : "custom", spec } : null;
}

/* ---------- Applying to the page ---------- */

/** Sets a variant on <html>, replacing whatever theme variables were set before. Browser only. */
export function applyVariant(v: Variant) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (let i = root.style.length - 1; i >= 0; i--) {
    const name = root.style[i];
    if (name.startsWith("--c-") || name === "--radius") root.style.removeProperty(name);
  }
  for (const [k, val] of Object.entries(v.vars)) root.style.setProperty(k, val);
  root.style.colorScheme = v.scheme;
  root.dataset.theme = v.scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", v.themeColor);
}

/**
 * Runs in <head> before first paint so a saved theme never flashes the default one.
 * Plain ES5 on purpose: it is inlined as a string and must never throw.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})||"null");if(!s||s.v!==1||!s.variants||!s.spec)return;var p=s.spec.mode;var m=p==="auto"?(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var v=s.variants[m];if(!v||!v.vars)return;var r=document.documentElement,k;for(k in v.vars){if(k.indexOf("--c-")===0||k==="--radius")r.style.setProperty(k,String(v.vars[k]))}r.style.colorScheme=v.scheme;r.setAttribute("data-theme",v.scheme);var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content",v.themeColor)}catch(e){}})();`;
