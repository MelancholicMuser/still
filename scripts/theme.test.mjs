import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  PRESETS, PAPER_SPEC, ACCENT_SWATCHES, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY,
  accentRamp, buildVariant, buildStored, colorOf, contrast, cssToHex, hexToOklch, oklchToHex,
  matchPreset, parseSpec, parseStored, resolveMode,
} from "../lib/theme.ts";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

test("oklch <-> hex round-trips and clamps out-of-gamut chroma", () => {
  for (const hex of ["#10b981", "#6366f1", "#f97316", "#525252", "#ffffff", "#000000"]) {
    const [L, C, h] = hexToOklch(hex);
    assert.equal(oklchToHex(L, C, h), hex);
  }
  assert.match(oklchToHex(0.5, 5, 140), /^#[0-9a-f]{6}$/); // absurd chroma still yields a valid colour
  assert.equal(cssToHex("oklch(98.5% 0.001 106.423)"), "#fafaf9"); // Tailwind stone-50
  assert.equal(cssToHex("#abc"), "#aabbcc");
});

test("contrast matches known WCAG values", () => {
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01);
  assert.ok(Math.abs(contrast("#777777", "#ffffff") - 4.48) < 0.05);
});

test("paper (the original look) needs no variables at all", () => {
  const v = buildVariant(PAPER_SPEC, "light");
  assert.deepEqual(v.vars, {});
  assert.equal(v.themeColor, "#fafaf9");
  assert.equal(v.scheme, "light");
});

test("corners only add --radius when not the default", () => {
  assert.equal(buildVariant({ ...PAPER_SPEC, corners: "soft" }, "light").vars["--radius"], undefined);
  assert.equal(buildVariant({ ...PAPER_SPEC, corners: "sharp" }, "light").vars["--radius"], "0.2rem");
  assert.equal(buildVariant({ ...PAPER_SPEC, corners: "round" }, "light").vars["--radius"], "1.1rem");
});

test("generated accent ramps are monotonic, valid hex, and meet contrast floors for ANY colour", () => {
  const colours = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#ffffff", "#000000", "#808080", "#fde047", "#a3e635"];
  for (const c of colours) {
    const r = accentRamp(c);
    assert.equal(r.length, 11);
    r.forEach((x) => assert.match(x, /^#[0-9a-f]{6}$/));
    for (let i = 1; i < r.length; i++) assert.ok(hexToOklch(r[i])[0] < hexToOklch(r[i - 1])[0] + 0.005, `${c}: step ${i} not darker`);
    assert.ok(contrast(r[6], "#ffffff") >= 3.5, `${c}: 600 vs white ${contrast(r[6], "#ffffff").toFixed(2)}`);
    assert.ok(contrast(r[7], "#ffffff") >= 4.5, `${c}: 700 vs white ${contrast(r[7], "#ffffff").toFixed(2)}`);
  }
});

/** Resolves the semantic pairs the UI actually uses, for one concrete variant. */
function checks(v, label) {
  const c = (p, s) => colorOf(v, p, s);
  const white = colorOf(v, "stone", "white");
  const rows = [
    ["body text stone-900 on page stone-50", c("stone", 900), c("stone", 50), 7],
    ["body text stone-900 on card", c("stone", 900), white, 7],
    ["secondary stone-600 on card", c("stone", 600), white, 4.5],
    ["secondary stone-500 on card", c("stone", 500), white, 4.5],
    ["secondary stone-500 on page", c("stone", 500), c("stone", 50), 4.5],
    ["accent text emerald-700 on card", c("emerald", 700), white, 4.5],
    ["accent text emerald-700 on emerald-50", c("emerald", 700), c("emerald", 50), 4.2],
    ["accent text emerald-900 on emerald-50", c("emerald", 900), c("emerald", 50), 7],
    ["button: white-slot text on emerald-600", white, c("emerald", 600), 3.5],
    ["button hover: white-slot text on emerald-700", white, c("emerald", 700), 4.5],
    ["toast: white-slot text on stone-900", white, c("stone", 900), 7],
    ["card is distinguishable from page", white, c("stone", 50), 1.04],
    ["border stone-200 visible on card", c("stone", 200), white, 1.1],
  ];
  for (const [name, fg, bg, min] of rows) {
    const r = contrast(fg, bg);
    assert.ok(r >= min, `${label}: ${name} = ${r.toFixed(2)} (< ${min})`);
  }
}

test("every preset meets contrast requirements", () => {
  for (const p of PRESETS) {
    const modes = p.spec.mode === "auto" ? ["light", "dark"] : [p.spec.mode];
    for (const m of modes) checks(buildVariant(p.spec, m), `${p.id}/${m}`);
  }
});

test("every accent swatch works in light AND dark with every tone", () => {
  for (const a of ACCENT_SWATCHES)
    for (const tone of ["stone", "neutral", "cool", "warm", "tinted"])
      for (const m of ["light", "dark"]) checks(buildVariant({ mode: m, accent: a.value, tone, corners: "soft" }, m), `${a.name}/${tone}/${m}`);
});

test("extreme custom colours still meet contrast (yellow, pure blue, near-white, near-black)", () => {
  for (const hex of ["#ffff00", "#0000ff", "#fefefe", "#010101", "#00ff88"])
    for (const m of ["light", "dark"]) checks(buildVariant({ mode: m, accent: hex, tone: "tinted", corners: "soft" }, m), `${hex}/${m}`);
});

test("dark mode flips: page is dark, text is light, small palettes are inverted", () => {
  const v = buildVariant({ ...PAPER_SPEC, mode: "dark" }, "dark");
  assert.equal(v.scheme, "dark");
  assert.ok(hexToOklch(colorOf(v, "stone", 50))[0] < 0.2);
  assert.ok(hexToOklch(colorOf(v, "stone", 900))[0] > 0.9);
  assert.ok(hexToOklch(colorOf(v, "amber", 50))[0] < 0.4); // amber tint backgrounds become dark
  assert.ok(hexToOklch(colorOf(v, "amber", 900))[0] > 0.8);
  assert.ok(hexToOklch(colorOf(v, "amber", 50))[1] < 0.04, "dark amber-50 tint stays faint"); // no muddy brown washes
  assert.equal(v.themeColor, colorOf(v, "stone", 50));
  assert.ok(contrast(v.vars["--c-white"], colorOf(v, "stone", 50)) > 1.04); // cards sit above the page
});

test("auto mode precomputes both variants; fixed modes only one", () => {
  assert.deepEqual(Object.keys(buildStored("custom", { ...PAPER_SPEC, mode: "auto" }).variants).sort(), ["dark", "light"]);
  assert.deepEqual(Object.keys(buildStored("paper", PAPER_SPEC).variants), ["light"]);
  assert.equal(resolveMode("auto", true), "dark");
  assert.equal(resolveMode("light", true), "light");
});

test("variables only contain safe --c-* / --radius keys with plain colour values", () => {
  for (const p of PRESETS) for (const m of ["light", "dark"]) {
    if (p.spec.mode !== m) continue;
    for (const [k, val] of Object.entries(buildVariant(p.spec, m).vars)) {
      assert.ok(k.startsWith("--c-") || k === "--radius", k);
      assert.match(val, /^(#[0-9a-f]{6}|[\d.]+rem)$/);
    }
  }
});

test("presets are unique, valid specs and matchPreset finds them", () => {
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
  for (const p of PRESETS) {
    assert.deepEqual(parseSpec(p.spec), p.spec);
    assert.equal(matchPreset(p.spec)?.id, p.id);
  }
  assert.equal(matchPreset({ ...PAPER_SPEC, accent: "#123456" }), undefined);
});

test("parseSpec / parseStored reject garbage and normalise", () => {
  assert.equal(parseSpec(null), null);
  assert.equal(parseSpec({}), null);
  assert.equal(parseSpec({ ...PAPER_SPEC, accent: "red" }), null);
  assert.equal(parseSpec({ ...PAPER_SPEC, accent: "url(javascript:alert(1))" }), null);
  assert.equal(parseSpec({ ...PAPER_SPEC, mode: "sepia" }), null);
  assert.equal(parseSpec({ ...PAPER_SPEC, tone: "x" }), null);
  assert.equal(parseSpec({ ...PAPER_SPEC, accent: "#ABCDEF" }).accent, "#abcdef");
  assert.equal(parseStored("nope"), null);
  assert.equal(parseStored({ v: 2, id: "paper", spec: PAPER_SPEC }), null);
  assert.equal(parseStored({ v: 1, id: "paper", spec: { ...PAPER_SPEC, accent: "x" } }), null);
  assert.equal(parseStored({ v: 1, id: "removed-preset", spec: PAPER_SPEC }).id, "custom");
  assert.equal(parseStored({ v: 1, id: "midnight", spec: PRESETS[5].spec }).id, "midnight");
});

/* ---- boot script, run in a fake browser ---- */
function runBoot(stored, { systemDark = false } = {}) {
  const props = {};
  const attrs = {};
  const meta = { content: "#fafaf9", setAttribute(k, v) { if (k === "content") this.content = v; } };
  const style = { setProperty: (k, v) => (props[k] = v), colorScheme: "" };
  const ctx = {
    localStorage: { getItem: (k) => (k === THEME_STORAGE_KEY ? stored : null) },
    matchMedia: () => ({ matches: systemDark }),
    document: {
      documentElement: { style, setAttribute: (k, v) => (attrs[k] = v) },
      querySelector: () => meta,
    },
  };
  ctx.window = ctx;
  vm.runInNewContext(THEME_BOOT_SCRIPT, ctx);
  return { props, attrs, meta, style };
}

test("boot script applies the saved variant before paint", () => {
  const spec = PRESETS.find((p) => p.id === "midnight").spec;
  const r = runBoot(JSON.stringify(buildStored("midnight", spec)));
  assert.equal(r.attrs["data-theme"], "dark");
  assert.equal(r.style.colorScheme, "dark");
  assert.equal(r.props["--c-stone-50"], buildVariant(spec, "dark").vars["--c-stone-50"]);
  assert.equal(r.meta.content, buildVariant(spec, "dark").themeColor);
});

test("boot script follows the OS for auto and never throws on bad data", () => {
  const stored = JSON.stringify(buildStored("custom", { ...PAPER_SPEC, mode: "auto", accent: "#6366f1" }));
  assert.equal(runBoot(stored, { systemDark: true }).attrs["data-theme"], "dark");
  assert.equal(runBoot(stored, { systemDark: false }).attrs["data-theme"], "light");
  for (const bad of ["{", "null", "[]", '{"v":1}', '{"v":1,"spec":{"mode":"dark"},"variants":{}}', '{"v":1,"spec":{"mode":"dark"},"variants":{"dark":{"vars":{"color":"red","--c-x":"1"}}}}'])
    assert.doesNotThrow(() => runBoot(bad));
  // non-theme keys in stored vars are ignored
  const sneaky = runBoot('{"v":1,"spec":{"mode":"dark"},"variants":{"dark":{"vars":{"background":"red","--c-x":"1"},"scheme":"dark","themeColor":"#000"}}}');
  assert.equal(sneaky.props.background, undefined);
  assert.equal(sneaky.props["--c-x"], "1");
});
