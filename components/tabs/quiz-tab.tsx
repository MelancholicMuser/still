"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Clock,
  Package,
  Sparkles,
} from "lucide-react";
import { type Hobby, type Answers } from "@/lib/types";
import { RM, FOCUS, Button, Card, Badge, Progress, Avatar } from "@/components/ui-kit";
import { INTERESTS, TIME_OPTIONS, BUDGET_OPTIONS, SOCIAL_OPTIONS } from "@/lib/data";
import { cx } from "@/lib/helpers";
import { useLater } from "@/lib/hooks";
import { GeminiCustomHobbySection } from "@/components/gemini";

export function GeneratingView({ onDone }: { onDone: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fill, setFill] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const msg = window.setInterval(() => setMsgIdx((i) => (i + 1) % 3), 700);
    const kick = window.setTimeout(() => setFill(100), 50);
    const done = window.setTimeout(() => doneRef.current(), 2200);
    return () => {
      window.clearInterval(msg);
      window.clearTimeout(kick);
      window.clearTimeout(done);
    };
  }, []);

  const messages = ["Reading your vibe…", "Matching hobbies…", "Building your first 15 minutes…"];
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-8 flex size-28 items-center justify-center">
        <span className={cx("absolute inset-0 rounded-full bg-emerald-200/70 animate-ping", RM)} />
        <span className="relative flex size-24 items-center justify-center rounded-full bg-emerald-100">
          <Sparkles className={cx("size-10 text-emerald-600 animate-pulse", RM)} aria-hidden="true" />
        </span>
      </div>
      <p key={msgIdx} className="text-lg font-bold tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300" role="status">
        {messages[msgIdx]}
      </p>
      <div
        role="progressbar"
        aria-label="Generating your matches"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext="In progress"
        className="mt-6 h-2 w-full max-w-[240px] overflow-hidden rounded-full bg-stone-200"
      >
        <div
          className={cx("h-full rounded-full bg-emerald-500 animate-pulse", RM)}
          style={{ width: `${fill}%`, transition: "width 2200ms linear" }}
        />
      </div>
    </div>
  );
}

export function QuizTab({
  quizStep,
  setQuizStep,
  answers,
  setAnswers,
  matches,
  onGenerated,
  onPick,
  onRetake,
  onCustomHobbyCreated,
}: {
  quizStep: number;
  setQuizStep: (n: number) => void;
  answers: Answers;
  setAnswers: (fn: (a: Answers) => Answers) => void;
  matches: Hobby[];
  onGenerated: () => void;
  onPick: (h: Hobby) => void;
  onRetake: () => void;
  onCustomHobbyCreated: (h: Hobby) => void;
}) {
  const later = useLater();

  const toggleInterest = (id: string) =>
    setAnswers((a) => {
      if (a.interests.includes(id)) return { ...a, interests: a.interests.filter((x) => x !== id) };
      if (a.interests.length >= 3) return a;
      return { ...a, interests: [...a.interests, id] };
    });

  const choose = (key: "time" | "budget" | "social", value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    const next = quizStep + 1;
    later(() => setQuizStep(next), 250);
  };

  if (quizStep === 4) return <GeneratingView onDone={onGenerated} />;

  if (quizStep === 5) {
    return (
      <div className="px-4 py-5 animate-in fade-in slide-in-from-right-8 duration-300">
        <h2 className="text-2xl font-bold tracking-tight text-balance">Your 3 best matches</h2>
        <p className="mt-1 text-sm text-stone-600">Pick one. You can swap anytime and your streak stays.</p>
        <ul className="mt-5 space-y-3">
          {matches.map((h, i) => (
            <li
              key={h.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar emoji={h.emoji} className="size-14 bg-emerald-50 text-3xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold tracking-tight">{h.name}</h3>
                      <Badge tone="emerald">{h.matchScore}%</Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{h.matchReason}</p>
                  </div>
                </div>
                <Button className="mt-4 w-full" onClick={() => onPick(h)}>
                  Start with this one
                </Button>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={onRetake}>
            Retake quiz
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((quizStep + 1) / 4) * 100;

  return (
    <div className="px-4 py-4">
      <GeminiCustomHobbySection onHobbyCreated={onCustomHobbyCreated} />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous question"
          className={cx(quizStep === 0 && "invisible")}
          disabled={quizStep === 0}
          onClick={() => setQuizStep(quizStep - 1)}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <Progress value={progress} label="Quiz progress" />
        </div>
        <span className="w-24 text-right text-xs font-semibold text-stone-600">Question {quizStep + 1} of 4</span>
      </div>

      <div key={quizStep} className={cx("mt-5 animate-in fade-in slide-in-from-right-8 duration-300", RM)}>
        {quizStep === 0 && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-balance">What pulls you in?</h2>
            <p className="mt-1 text-sm text-stone-600">
              Still swaps your scroll for something real. Pick 1 to 3 interests.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {INTERESTS.map(({ id, label, Icon }) => {
                const selected = answers.interests.includes(id);
                const locked = !selected && answers.interests.length >= 3;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    disabled={locked}
                    onClick={() => toggleInterest(id)}
                    className={cx(
                      "relative flex min-h-24 flex-col items-start justify-between rounded-2xl border bg-white p-4 text-left transition-all active:scale-95 disabled:opacity-40",
                      FOCUS,
                      RM,
                      selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500" : "border-stone-200 hover:shadow-md",
                    )}
                  >
                    <Icon className={cx("size-6", selected ? "text-emerald-600" : "text-stone-500")} aria-hidden="true" />
                    <span className="text-sm font-semibold">{label}</span>
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white animate-in zoom-in duration-150">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="sticky bottom-3 mt-6">
              <Button
                size="lg"
                className="w-full shadow-lg"
                disabled={answers.interests.length === 0}
                onClick={() => setQuizStep(1)}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {quizStep === 1 && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-balance">How much time can you spare?</h2>
            <p className="mt-1 text-sm text-stone-600">Be honest. Tiny and consistent beats big and abandoned.</p>
            <div className="mt-5 space-y-3">
              {TIME_OPTIONS.map((t) => (
                <OptionCard key={t} selected={answers.time === t} onClick={() => choose("time", t)}>
                  <Clock className="size-5 text-stone-500" aria-hidden="true" />
                  <span className="font-semibold">{t}</span>
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {quizStep === 2 && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-balance">What is your budget?</h2>
            <p className="mt-1 text-sm text-stone-600">Most great hobbies start at zero.</p>
            <div className="mt-5 space-y-3">
              {BUDGET_OPTIONS.map((b) => (
                <OptionCard key={b} selected={answers.budget === b} onClick={() => choose("budget", b)}>
                  <Package className="size-5 text-stone-500" aria-hidden="true" />
                  <span className="font-semibold">{b}</span>
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {quizStep === 3 && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-balance">Solo or social?</h2>
            <p className="mt-1 text-sm text-stone-600">Last one. Then we build your first 15 minutes.</p>
            <div className="mt-5 space-y-3">
              {SOCIAL_OPTIONS.map(({ label, Icon, sub }) => (
                <OptionCard
                  key={label}
                  selected={answers.social === label}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, social: label }));
                    later(() => setQuizStep(4), 250);
                  }}
                >
                  <Icon className="size-5 text-stone-500" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-stone-500">{sub}</span>
                  </span>
                </OptionCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-sm transition-all active:scale-95",
        FOCUS,
        RM,
        selected ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500" : "border-stone-200 hover:shadow-md",
      )}
    >
      {children}
      {selected && <Check className="ml-auto size-5 text-emerald-600" aria-hidden="true" />}
    </button>
  );
}
