"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Flame,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { type Celebration } from "@/lib/types";
import { RM, FOCUS, Button, Badge, Progress, Ring, Sheet, Reveal } from "@/components/ui-kit";
import { MOODS } from "@/lib/data";
import { cx } from "@/lib/helpers";
import { useCountUp } from "@/lib/hooks";

export function ReflectionSheet({
  minutes,
  onLog,
  onSkip,
}: {
  minutes: number;
  onLog: (mood: number | null, caption: string) => void;
  onSkip: () => void;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const noop = useCallback(() => {}, []);
  return (
    <Sheet open onClose={noop} dismissible={false} title="Session reflection">
      <h3 className="text-xl font-bold tracking-tight">How do you feel?</h3>
      <p className="mt-1 text-sm text-stone-600">{minutes} focused minutes. Not a single reel.</p>
      <div className="mt-4 flex justify-between" role="radiogroup" aria-label="Mood">
        {MOODS.map(({ label, Icon }, i) => {
          const selected = mood === i;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onClick={() => setMood(i)}
              className={cx(
                "flex size-14 items-center justify-center rounded-2xl border transition-all active:scale-95",
                FOCUS,
                RM,
                selected ? "scale-110 border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500" : "border-stone-200 bg-white text-stone-500",
              )}
            >
              <Icon className="size-7" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="reflection-caption">
        One line about it (optional)
      </label>
      <input
        id="reflection-caption"
        type="text"
        maxLength={80}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Finally nailed that chord change"
        className={cx("mt-1 min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 text-sm placeholder:text-stone-400", FOCUS)}
      />
      <div className="mt-5 flex gap-3">
        <Button
          variant="ghost"
          size="lg"
          className="flex-1"
          disabled={busy}
          onClick={() => {
            if (busy) return;
            setBusy(true);
            onSkip();
          }}
        >
          Skip
        </Button>
        <Button
          size="lg"
          className="flex-[2]"
          disabled={busy}
          onClick={() => {
            if (busy) return;
            setBusy(true);
            onLog(mood, caption.trim());
          }}
        >
          Log it
        </Button>
      </div>
    </Sheet>
  );
}

export const CONFETTI_COLORS = ["bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-sky-400", "bg-lime-400"];

export function CelebrationOverlay({
  data,
  onArena,
  onDone,
}: {
  data: Celebration;
  onArena: () => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState(1);
  const confetti = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 60,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 1.2,
      duration: 0.8 + Math.random() * 0.9,
      pulse: i % 3 === 0,
      size: i % 2 === 0 ? "size-2" : "h-3 w-1.5",
    })),
  )[0];

  useEffect(() => {
    if (stage >= 6) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), 600);
    return () => window.clearTimeout(id);
  }, [stage]);

  const hours = useCountUp(data.fromMinutes, data.toMinutes, stage >= 2);
  const hoursText = (hours / 60).toFixed(1);
  const xpPct = stage >= 4 ? (data.levelUp ? 100 : ((data.xpTo % 500) / 500) * 100) : ((data.xpFrom % 500) / 500) * 100;

  const rankLine =
    data.rankTo < data.rankFrom
      ? `You moved up to #${data.rankTo}`
      : data.rankTo > data.rankFrom
        ? `You are now #${data.rankTo}`
        : `You are holding #${data.rankTo}`;

  return (
    <div
      className="absolute inset-0 z-40 flex cursor-pointer flex-col overflow-y-auto bg-gradient-to-b from-emerald-50 via-stone-50 to-amber-50 animate-in fade-in duration-300 [&::-webkit-scrollbar]:hidden"
      onClick={() => setStage(6)}
      role="dialog"
      aria-modal="true"
      aria-label="Session complete"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {stage >= 1 &&
          confetti.map((p) => (
            <div
              key={p.id}
              className={cx("absolute rounded-sm", p.color, p.size, p.pulse ? "animate-pulse" : "animate-bounce", RM)}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
      </div>

      <div className="relative flex flex-1 flex-col items-center px-6 pb-6 pt-10 text-center">
        <div className="relative">
          {stage === 1 && <span className={cx("absolute inset-0 rounded-full bg-emerald-300/60 animate-ping", RM)} />}
          <Ring size={128} stroke={10} progress={1} className="text-emerald-500" label="Session complete">
            <Check className="size-12 text-emerald-600 animate-in zoom-in duration-300" aria-hidden="true" />
          </Ring>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Session complete</h2>
        <p className="text-sm text-stone-600">{data.minutes} minutes reclaimed</p>

        <Reveal show={stage >= 2} className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Hours Reclaimed</p>
          <div className="mt-1 flex items-end justify-center gap-0.5" aria-label={`${hoursText} hours reclaimed`}>
            {hoursText.split("").map((ch, i) => (
              <span
                key={i}
                className={cx(
                  "inline-block rounded-lg bg-white text-5xl font-extrabold tabular-nums text-emerald-700 shadow-sm",
                  ch === "." ? "px-0.5" : "px-2",
                )}
              >
                {ch}
              </span>
            ))}
            <span className="pb-1.5 pl-1 text-lg font-bold text-stone-500">hrs</span>
          </div>
        </Reveal>

        <Reveal show={stage >= 3} className="mt-5">
          <div className="flex items-center justify-center gap-2">
            <Flame
              className={cx(
                "size-12 text-amber-500 transition-transform duration-500",
                RM,
                stage >= 3 ? "scale-110" : "scale-50",
              )}
              fill="currentColor"
              aria-hidden="true"
            />
            <div className="text-left">
              <p className="text-4xl font-extrabold tabular-nums leading-none">{data.streak}</p>
              <p className="text-xs font-semibold text-stone-600">day streak</p>
            </div>
          </div>
        </Reveal>

        <Reveal show={stage >= 4} className="mt-5 w-full max-w-[260px]">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>+{data.xpGain} XP</span>
            {data.levelUp ? <Badge tone="amber">Level Up! Lv {data.level}</Badge> : <span className="text-stone-500">Lv {data.level}</span>}
          </div>
          <Progress className="mt-1.5 h-3" value={xpPct} label="Experience progress" />
        </Reveal>

        <Reveal show={stage >= 5} className="mt-5">
          <p className="flex items-center justify-center gap-2 text-base font-bold text-emerald-700">
            <TrendingUp className="size-5" aria-hidden="true" /> {rankLine}
          </p>
        </Reveal>

        <Reveal show={stage >= 6} className="mt-3">
          <p className="text-sm text-stone-600">That&apos;s ~{data.reels} reels you didn&apos;t watch.</p>
        </Reveal>

        <div className="mt-auto w-full space-y-2 pt-8">
          <Reveal show={stage >= 6}>
            <Button
              size="lg"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onArena();
              }}
            >
              <Trophy className="size-5" aria-hidden="true" /> See it in the Arena
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="mt-2 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onDone();
              }}
            >
              Done
            </Button>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
