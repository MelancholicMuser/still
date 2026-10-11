"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Play,
  Siren,
  Zap,
} from "lucide-react";
import { type Hobby } from "@/lib/types";
import { RM, FOCUS, Button, Card, Badge, Progress, Avatar, Sheet, EmptyState } from "@/components/ui-kit";
import { cx } from "@/lib/helpers";
import { GeminiCoachCard } from "@/components/gemini";

export function BreathingCircle() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const kick = window.setTimeout(() => setExpanded(true), 50);
    const id = window.setInterval(() => setExpanded((e) => !e), 4000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(id);
    };
  }, []);
  return (
    <div className="flex h-56 flex-col items-center justify-center">
      <div
        className={cx(
          "flex size-28 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 transition-transform ease-in-out",
          RM,
          expanded ? "scale-150" : "scale-100",
        )}
        style={{ transitionDuration: "4000ms" }}
        aria-hidden="true"
      >
        <span className="text-sm font-semibold">{expanded ? "Breathe in" : "Breathe out"}</span>
      </div>
      <p className="sr-only" aria-live="polite">
        {expanded ? "Breathe in" : "Breathe out"}
      </p>
    </div>
  );
}

export function CoachTab({
  hobby,
  otherMatches,
  completedStepIds,
  currentStreak = 1,
  onToggleStep,
  onStart,
  onSwap,
  onGoQuiz,
}: {
  hobby: Hobby | null;
  otherMatches: Hobby[];
  completedStepIds: string[];
  currentStreak?: number;
  onToggleStep: (id: string) => void;
  onStart: () => void;
  onSwap: (h: Hobby) => void;
  onGoQuiz: () => void;
}) {
  const [urgeOpen, setUrgeOpen] = useState(false);
  const closeUrge = useCallback(() => setUrgeOpen(false), []);

  if (!hobby) {
    return (
      <EmptyState
        title="Take the 4-question quiz to get your first 15-minute blueprint"
        cta="Go to Quiz"
        onClick={onGoQuiz}
      />
    );
  }

  const steps = hobby.blueprint.steps;
  const doneCount = steps.filter((s) => completedStepIds.includes(s.id)).length;

  return (
    <>
      <div key={hobby.id} className="space-y-4 px-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar emoji={hobby.emoji} className="size-16 bg-emerald-50 text-4xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight">{hobby.name}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone="emerald">{hobby.category}</Badge>
                <Badge tone="amber">{hobby.matchScore}% match</Badge>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-600">{hobby.blurb}</p>
          <p className="mt-2 text-sm text-stone-600">{hobby.matchReason}</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-base font-bold tracking-tight">Your 15-Minute Blueprint</h3>
          <p className="mt-0.5 text-sm text-stone-600">{hobby.blueprint.title}</p>
          <div className="mt-3 flex gap-2">
            <Badge tone="stone">
              <Clock className="size-3.5" aria-hidden="true" /> 15 min
            </Badge>
            <Badge tone="amber">
              <Zap className="size-3.5" aria-hidden="true" /> Zero friction
            </Badge>
          </div>
          <ul className="mt-4 space-y-2">
            {hobby.blueprint.materials.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm text-stone-700">
                <Package className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden="true" />
                {m}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight">Steps</h3>
            <span className="text-xs font-semibold text-stone-600" aria-live="polite">
              {doneCount} of {steps.length} steps done
            </span>
          </div>
          <Progress className="mt-2 h-1.5" value={(doneCount / steps.length) * 100} label="Steps completed" />
          <ul className="mt-3 space-y-2">
            {steps.map((s) => {
              const done = completedStepIds.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => onToggleStep(s.id)}
                    className={cx(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all active:scale-[0.98]",
                      FOCUS,
                      RM,
                      done ? "bg-emerald-50 text-stone-500" : "bg-stone-50 text-stone-800 hover:bg-stone-100",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-6 shrink-0 text-emerald-600 animate-in zoom-in duration-200" aria-hidden="true" />
                    ) : (
                      <Circle className="size-6 shrink-0 text-stone-400" aria-hidden="true" />
                    )}
                    <span className={cx(done && "line-through")}>{s.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <GeminiCoachCard hobby={hobby} currentStreak={currentStreak} />

        <div className="sticky bottom-3 z-10">
          <Button size="lg" className="w-full shadow-lg" onClick={onStart}>
            <Play className="size-5" aria-hidden="true" /> Start 15 minutes
          </Button>
        </div>

        {otherMatches.length > 0 && (
          <section aria-label="Swap hobby">
            <h3 className="text-sm font-bold tracking-tight">Swap hobby</h3>
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
              {otherMatches.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onSwap(h)}
                  className={cx(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold transition-transform active:scale-95",
                    FOCUS,
                    RM,
                  )}
                >
                  <span aria-hidden="true">{h.emoji}</span> {h.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">Your streak follows you, not the hobby.</p>
          </section>
        )}

        <Button variant="danger" size="lg" className="w-full" onClick={() => setUrgeOpen(true)}>
          <Siren className="size-5" aria-hidden="true" /> Doomscroll Urge?
        </Button>
      </div>

      <Sheet open={urgeOpen} onClose={closeUrge} title="Doomscroll urge">
        <h3 className="text-xl font-bold tracking-tight">Pause. That urge will pass.</h3>
        <p className="mt-1 text-sm text-stone-600">
          Breathe with the circle for a few cycles. Cravings peak and fade in about a minute.
        </p>
        <BreathingCircle />
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setUrgeOpen(false);
            onStart();
          }}
        >
          Replace it with 15 minutes
        </Button>
      </Sheet>
    </>
  );
}
