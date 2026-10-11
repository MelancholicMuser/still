"use client";

import { useMemo } from "react";
import { Check, RotateCcw } from "lucide-react";
import { ACCENT_SWATCHES, DEFAULT_ACCENT, PRESETS, buildVariant, colorOf, resolveMode, type Corners, type ModePref, type Tone } from "@/lib/theme";
import type { ThemeController } from "@/lib/use-theme";
import { cx } from "@/lib/helpers";
import { Button, FOCUS, Sheet } from "@/components/ui-kit";

const MODES: { value: ModePref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];
const TONES: { value: Tone; label: string }[] = [
  { value: "stone", label: "Classic" },
  { value: "neutral", label: "Neutral" },
  { value: "cool", label: "Cool" },
  { value: "warm", label: "Warm" },
  { value: "tinted", label: "Tinted" },
];
const CORNER_OPTIONS: { value: Corners; label: string }[] = [
  { value: "sharp", label: "Sharp" },
  { value: "soft", label: "Soft" },
  { value: "round", label: "Round" },
];
const PREVIEW_RADIUS: Record<Corners, { card: string; pill: string }> = {
  sharp: { card: "2px", pill: "2px" },
  soft: { card: "8px", pill: "999px" },
  round: { card: "14px", pill: "999px" },
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-stone-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-9 flex-1 rounded-lg px-1 text-xs font-semibold transition-colors",
              FOCUS,
              active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSheet({ open, onClose, theme }: { open: boolean; onClose: () => void; theme: ThemeController }) {
  const { id, spec, systemDark, setPreset, update, reset } = theme;

  const previews = useMemo(
    () =>
      PRESETS.map((p) => {
        const v = buildVariant(p.spec, resolveMode(p.spec.mode, false));
        return {
          preset: p,
          bg: colorOf(v, "stone", 50),
          card: colorOf(v, "stone", "white"),
          border: colorOf(v, "stone", 200),
          text: colorOf(v, "stone", 900),
          soft: colorOf(v, "emerald", 200),
          accent: colorOf(v, "emerald", 600),
        };
      }),
    [],
  );

  const isSwatch = ACCENT_SWATCHES.some((s) => s.value === spec.accent);
  const pickerValue = spec.accent === DEFAULT_ACCENT ? "#10b981" : spec.accent;
  const effectiveMode = resolveMode(spec.mode, systemDark);

  return (
    <Sheet open={open} onClose={onClose} title="Appearance">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-stone-900">Appearance</h2>
        {id !== "paper" && (
          <button
            type="button"
            onClick={reset}
            className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-stone-500 hover:text-stone-800", FOCUS)}
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Reset
          </button>
        )}
      </div>
      <p className="text-xs text-stone-500">Pick a look, or make your own below. It's saved on this device.</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {previews.map(({ preset, bg, card, border, text, soft, accent }) => {
          const active = id === preset.id;
          const r = PREVIEW_RADIUS[preset.spec.corners];
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPreset(preset.id)}
              className={cx(
                "group flex h-full flex-col justify-start rounded-2xl border bg-white p-2 text-left transition-shadow",
                FOCUS,
                active ? "border-emerald-500 ring-2 ring-emerald-500" : "border-stone-200 hover:border-stone-300",
              )}
            >
              <div className="rounded-lg border p-2" style={{ background: bg, borderColor: border }}>
                <div className="flex h-[3.25rem] flex-col gap-1 border px-2 py-1.5" style={{ background: card, borderColor: border, borderRadius: r.card }}>
                  <span className="h-1.5 w-9 rounded-full" style={{ background: text, opacity: 0.8 }} />
                  <span className="h-1.5 w-14 rounded-full" style={{ background: soft }} />
                  <span className="mt-auto h-3 w-11" style={{ background: accent, borderRadius: r.pill }} />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                <span className="text-sm font-bold text-stone-900">{preset.name}</span>
                {active && <Check className="size-4 text-emerald-600" aria-hidden="true" />}
              </div>
              <p className="px-0.5 pb-0.5 text-[11px] leading-snug text-stone-500">{preset.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <h3 className="text-sm font-bold text-stone-900">Make it yours</h3>
        {id === "custom" && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Custom</span>
        )}
      </div>

      <div className="mt-3 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-stone-700">Accent colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_SWATCHES.map((s) => {
              const active = spec.accent === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-label={s.name}
                  aria-pressed={active}
                  onClick={() => update({ accent: s.value })}
                  className={cx(
                    "grid size-8 place-items-center rounded-full border-2 border-white shadow-sm ring-1 ring-stone-300",
                    FOCUS,
                    active && "ring-2 ring-stone-900",
                  )}
                  style={{ background: s.value === DEFAULT_ACCENT ? "#10b981" : s.value }}
                >
                  {active && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
            <label
              className={cx(
                "relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-stone-300 focus-within:ring-2 focus-within:ring-emerald-500",
                !isSwatch && "ring-2 ring-stone-900",
              )}
              style={{ background: isSwatch ? "conic-gradient(#f43f5e, #f59e0b, #84cc16, #10b981, #0ea5e9, #8b5cf6, #f43f5e)" : spec.accent }}
            >
              <span className="sr-only">Pick any colour</span>
              {!isSwatch && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
              <input
                type="color"
                value={pickerValue}
                onChange={(e) => update({ accent: e.target.value.toLowerCase() })}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-stone-700">
            Mode{spec.mode === "auto" && <span className="font-normal text-stone-500"> · following your device ({effectiveMode})</span>}
          </p>
          <Segmented label="Mode" value={spec.mode} options={MODES} onChange={(mode) => update({ mode })} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-stone-700">Background tone</p>
          <Segmented label="Background tone" value={spec.tone} options={TONES} onChange={(tone) => update({ tone })} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-stone-700">Corners</p>
          <Segmented label="Corners" value={spec.corners} options={CORNER_OPTIONS} onChange={(corners) => update({ corners })} />
        </div>
      </div>

      <Button variant="soft" className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
