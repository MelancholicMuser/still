"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FastForward,
  FlagTriangleRight,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ShieldAlert,
  Snowflake,
} from "lucide-react";
import { dayNumber, todayKey, weekStart, type Streak } from "@/lib/streak";
import { type Hobby, type TimerState } from "@/lib/types";
import { RM, FOCUS, Button, Card, Badge, Ring, Sheet, EmptyState } from "@/components/ui-kit";
import { cx, formatMMSS } from "@/lib/helpers";
import { useLater } from "@/lib/hooks";

export function ringColor(elapsedRatio: number) {
  if (elapsedRatio < 0.25) return "text-rose-400";
  if (elapsedRatio < 0.5) return "text-amber-400";
  if (elapsedRatio < 0.75) return "text-lime-500";
  return "text-emerald-500";
}

export function HoldButton({ onComplete }: { onComplete: () => void }) {
  const [holding, setHolding] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const cancel = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHolding(false);
  };
  const begin = () => {
    cancel();
    setHolding(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setHolding(false);
      completeRef.current();
    }, 600);
  };
  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-28">
      <svg width={112} height={112} className="pointer-events-none absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={56} cy={56} r={r} strokeWidth={6} fill="none" stroke="currentColor" className="text-emerald-100" />
        <circle
          cx={56}
          cy={56}
          r={r}
          strokeWidth={6}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={holding ? 0 : c}
          className="text-emerald-500"
          style={{ transition: `stroke-dashoffset ${holding ? 600 : 150}ms linear` }}
        />
      </svg>
      <button
        type="button"
        aria-label="Press and hold to start the timer"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className={cx(
          "absolute inset-3 flex touch-none select-none flex-col items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-transform",
          FOCUS,
          RM,
          holding ? "scale-95" : "scale-100",
        )}
      >
        <Play className="size-6" aria-hidden="true" />
        <span className="mt-0.5 text-xs font-bold">Hold to start</span>
      </button>
    </div>
  );
}

export const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function TrackerTab({
  hobby,
  timer,
  armCount,
  streak,
  todayMinutes,
  reclaimedMinutes,
  xp,
  level,
  onGoQuiz,
  onSetDuration,
  onStartTimer,
  onPause,
  onResume,
  onFinishEarly,
  onDemoFinish,
  onAddFive,
  onToggleStep,
  onLogManual,
  wakeLockActive = false,
  distractionAlert = null,
  onDismissDistraction,
  isFullscreen = false,
  onToggleFullscreen,
}: {
  hobby: Hobby | null;
  timer: TimerState;
  armCount: number;
  streak: Streak;
  todayMinutes: number;
  reclaimedMinutes: number;
  xp: number;
  level: number;
  onGoQuiz: () => void;
  onSetDuration: (minutes: number) => void;
  onStartTimer: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinishEarly: () => void;
  onDemoFinish: () => void;
  onAddFive: () => void;
  onToggleStep: (id: string) => void;
  onLogManual: (minutes: number) => void;
  wakeLockActive?: boolean;
  distractionAlert?: { seconds: number } | null;
  onDismissDistraction?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const later = useLater();
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [backlogMinutes, setBacklogMinutes] = useState(20);
  const [justDone, setJustDone] = useState<string | null>(null);
  const closeBacklog = useCallback(() => setBacklogOpen(false), []);

  const { status, totalSeconds, remainingSeconds } = timer;

  if (!hobby && status === "idle") {
    return <EmptyState title="Pick a hobby first. Your timer needs something to protect." cta="Pick a hobby first" onClick={onGoQuiz} />;
  }

  const elapsed = totalSeconds - remainingSeconds;
  const elapsedRatio = totalSeconds > 0 ? elapsed / totalSeconds : 0;
  const steps = hobby?.blueprint.steps ?? [];

  if (status === "arming" || status === "completing" || status === "celebrating") {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
        {status === "arming" ? (
          <>
            <p className="text-sm font-semibold text-stone-600">Get ready for {hobby?.name}</p>
            <div className="relative mt-6 flex size-48 items-center justify-center">
              <span key={`ping-${armCount}`} className={cx("absolute inset-6 rounded-full bg-emerald-300/50 animate-ping", RM)} />
              <span
                key={armCount}
                className={cx(
                  "relative text-9xl font-extrabold tabular-nums text-emerald-600 animate-in zoom-in-50 fade-in duration-300",
                  RM,
                )}
                role="status"
                aria-label={`Starting in ${armCount}`}
              >
                {armCount}
              </span>
            </div>
            <p className="mt-6 text-sm text-stone-600">Put the phone face down. Your thumb is about to be free.</p>
          </>
        ) : (
          <p className="text-sm text-stone-600">Wrapping up your session…</p>
        )}
      </div>
    );
  }

  if (status === "running" || status === "paused") {
    const paused = status === "paused";
    const elapsedHrs = elapsed / 3600;
    const reels = Math.round(elapsed / 30);
    return (
      <>
        <div className="flex flex-col items-center px-4 py-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Badge tone="emerald">
              <span aria-hidden="true">{hobby?.emoji}</span> {hobby?.name}
            </Badge>
            {paused && <Badge tone="amber">Paused</Badge>}
            {wakeLockActive && (
              <Badge tone="emerald" className="gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Screen Awake
              </Badge>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="rounded-full p-1 text-stone-500 hover:bg-stone-200 transition-colors"
                aria-label="Toggle Fullscreen Focus"
                title="Toggle Fullscreen Focus"
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            )}
          </div>

          {distractionAlert && (
            <div className="mt-3 w-full max-w-xs rounded-2xl border border-amber-300 bg-amber-50 p-3 text-center shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                <ShieldAlert className="size-4 text-amber-600" /> Focus Shield Alert
              </div>
              <p className="mt-1 text-xs text-amber-800">
                You navigated away from Still for <strong>{distractionAlert.seconds}s</strong>. Stay present!
              </p>
              {onDismissDistraction && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 !h-6 !px-2.5 text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={onDismissDistraction}
                >
                  I&apos;m Back
                </Button>
              )}
            </div>
          )}

          <div className={cx("mt-4 transition-opacity duration-300", RM, paused && "opacity-50")}>
            <Ring
              size={236}
              stroke={14}
              progress={remainingSeconds / totalSeconds}
              className={ringColor(elapsedRatio)}
              label="Time remaining"
            >
              <span className="text-5xl font-extrabold tabular-nums tracking-tight">{formatMMSS(remainingSeconds)}</span>
              <span className="mt-1 text-xs font-semibold text-stone-500">{paused ? "paused" : "remaining"}</span>
            </Ring>
          </div>

          <div className="mt-4 text-center" aria-live="off">
            <p className="text-sm font-semibold text-emerald-700">
              Reclaiming… <span className="tabular-nums">+{elapsedHrs.toFixed(2)} hrs</span>
            </p>
            <p className="text-xs text-stone-500">≈ {reels} reels you didn&apos;t watch</p>
          </div>

          {steps.length > 0 && (
            <div className="-mx-4 mt-4 w-[calc(100%+2rem)] snap-x snap-mandatory overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden">
              <ul className="flex gap-3">
                {steps.map((s, i) => {
                  const done = timer.completedStepIds.includes(s.id);
                  return (
                    <li key={s.id} className="w-64 shrink-0 snap-center">
                      <Card className={cx("flex h-full flex-col justify-between p-3", done && "bg-emerald-50")}>
                        <div>
                          <p className="text-xs font-semibold text-stone-500">
                            Step {i + 1} of {steps.length}
                          </p>
                          <p className={cx("mt-1 text-sm", done && "text-stone-500 line-through")}>{s.text}</p>
                        </div>
                        <Button
                          variant={done ? "soft" : "outline"}
                          size="sm"
                          className="mt-3 w-full"
                          aria-pressed={done}
                          onClick={() => {
                            if (!done) {
                              setJustDone(s.id);
                              later(() => setJustDone(null), 1200);
                            }
                            onToggleStep(s.id);
                          }}
                        >
                          {done ? (
                            <CheckCircle2
                              className={cx("size-5 text-emerald-600", justDone === s.id && "animate-bounce")}
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle className="size-5" aria-hidden="true" />
                          )}
                          {done ? "Done" : "Mark done"}
                        </Button>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-3 flex w-full items-center gap-3">
            {paused ? (
              <Button size="lg" className="flex-1" onClick={onResume}>
                <Play className="size-5" aria-hidden="true" /> Resume
              </Button>
            ) : (
              <Button variant="outline" size="lg" className="flex-1" onClick={onPause}>
                <Pause className="size-5" aria-hidden="true" /> Pause
              </Button>
            )}
            <Button variant="soft" size="lg" className="flex-1 whitespace-nowrap !px-3" onClick={onFinishEarly}>
              <FlagTriangleRight className="size-5" aria-hidden="true" /> {paused ? "Stop" : "Finish early"}
            </Button>
          </div>

          {!paused && remainingSeconds <= 30 && remainingSeconds > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 animate-in fade-in zoom-in-95 border-amber-400 text-amber-700"
              onClick={onAddFive}
            >
              +5 min
            </Button>
          )}

          <button
            type="button"
            onClick={onDemoFinish}
            className={cx(
              "mt-5 flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-stone-400 px-3 text-xs font-medium text-stone-600 hover:bg-stone-100",
              FOCUS,
            )}
          >
            <FastForward className="size-3.5" aria-hidden="true" /> Demo: finish now
          </button>
        </div>
      </>
    );
  }

  /* idle */
  const todayDone = streak.todayDone;
  // Week strip (Mon–Sun): a day is ticked when it falls inside the current streak run.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const mondayN = weekStart(todayKey());
  const lastDoneN = streak.lastDone ? dayNumber(streak.lastDone) : null;
  const runStartN = lastDoneN !== null && streak.current > 0 ? lastDoneN - (streak.current - 1) : null;
  return (
    <>
      <div className="flex flex-col items-center px-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Badge tone="emerald">
          <span aria-hidden="true">{hobby?.emoji}</span> {hobby?.name}
        </Badge>

        <div className="mt-4">
          <Ring size={196} stroke={12} progress={1} className="text-emerald-300" label="Timer ready">
            <span className="text-5xl font-extrabold tabular-nums tracking-tight">{formatMMSS(totalSeconds)}</span>
            <span className="mt-1 text-xs font-semibold text-stone-500">ready when you are</span>
          </Ring>
        </div>

        <div className="mt-4 flex gap-2" role="group" aria-label="Session length">
          {[5, 10, 15, 25].map((m) => {
            const selected = totalSeconds === m * 60;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={selected}
                onClick={() => onSetDuration(m)}
                className={cx(
                  "flex min-h-11 min-w-[72px] flex-col items-center justify-center rounded-full border px-3 text-sm font-semibold transition-all active:scale-95",
                  FOCUS,
                  RM,
                  selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-stone-700",
                )}
              >
                {m} min
                {m === 15 && <span className={cx("-mt-0.5 text-[10px] font-medium", selected ? "text-emerald-100" : "text-emerald-700")}>Recommended</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col items-center">
          <HoldButton onComplete={onStartTimer} />
          <button
            type="button"
            onClick={onStartTimer}
            className={cx("mt-1 min-h-11 rounded-lg px-3 text-sm font-medium text-stone-600 underline-offset-4 hover:underline", FOCUS)}
          >
            Tap to start
          </button>
        </div>

        <div className="mt-3 grid w-full grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <p className="text-xs font-medium text-stone-500">Today</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{todayMinutes}<span className="text-xs font-semibold text-stone-500"> min</span></p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs font-medium text-stone-500">Streak</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xl font-extrabold tabular-nums">
              <Flame className="size-5 text-amber-500" aria-hidden="true" />
              {streak.current}
            </p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-sky-700">
              <Snowflake className="size-3" aria-hidden="true" /> {streak.freezes} <span aria-hidden="true">🧊</span>
              <span className="sr-only">streak freezes</span>
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs font-medium text-stone-500">Reclaimed</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{(reclaimedMinutes / 60).toFixed(1)}<span className="text-xs font-semibold text-stone-500"> hrs</span></p>
          </Card>
        </div>

        <div className="mt-4 flex w-full items-center justify-between" aria-label="This week">
          {WEEK_LABELS.map((d, i) => {
            const isToday = i === todayIndex;
            const dayN = mondayN + i;
            const done = lastDoneN !== null && runStartN !== null && dayN >= runStartN && dayN <= lastDoneN;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="relative flex size-8 items-center justify-center">
                  {isToday && !todayDone && (
                    <span className={cx("absolute inset-0 rounded-full bg-emerald-300/60 animate-ping", RM)} />
                  )}
                  <span
                    className={cx(
                      "relative flex size-6 items-center justify-center rounded-full",
                      done ? "bg-emerald-500 text-white" : isToday ? "border-2 border-emerald-500 bg-white" : "bg-stone-200",
                    )}
                  >
                    {done && <Check className="size-3.5" aria-hidden="true" />}
                  </span>
                </span>
                <span className={cx("text-xs font-semibold", isToday ? "text-emerald-700" : "text-stone-500")}>{d}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Level {level} · {xp} XP
        </p>

        <Button variant="outline" size="lg" className="mt-3 w-full" onClick={() => setBacklogOpen(true)}>
          <Clock className="size-5" aria-hidden="true" /> Back-log a session
        </Button>
      </div>

      <Sheet open={backlogOpen} onClose={closeBacklog} title="Back-log a session">
        <h3 className="text-xl font-bold tracking-tight">Back-log a session</h3>
        <p className="mt-1 text-sm text-stone-600">Did it without the timer? Manual logs count at 80%.</p>
        <p className="mt-5 text-center text-5xl font-extrabold tabular-nums">
          {backlogMinutes}
          <span className="text-lg font-semibold text-stone-500"> min</span>
        </p>
        <input
          type="range"
          min={5}
          max={60}
          step={5}
          value={backlogMinutes}
          onChange={(e) => setBacklogMinutes(Number(e.target.value))}
          aria-label="Minutes to log"
          className="mt-4 h-11 w-full cursor-pointer accent-emerald-600"
        />
        <p className="mt-1 text-center text-sm text-stone-600">
          Counts as {Math.round(backlogMinutes * 0.8)} min
        </p>
        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={() => {
            setBacklogOpen(false);
            onLogManual(backlogMinutes);
          }}
        >
          Log session
        </Button>
      </Sheet>
    </>
  );
}

/* Overlays driven by timer state (rendered at App level) */
