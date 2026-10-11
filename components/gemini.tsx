"use client";

import { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
} from "lucide-react";
import { type Hobby } from "@/lib/types";
import { Button, Card } from "@/components/ui-kit";

export function GeminiCustomHobbySection({ onHobbyCreated }: { onHobbyCreated: (h: Hobby) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_hobby", prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.hobby) {
        throw new Error(data.error || "Failed to generate hobby");
      }
      onHobbyCreated(data.hobby);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't reach the AI. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">Gemini AI Studio</h3>
            <p className="text-[11px] text-stone-600">Design an instant 15-min micro-hobby</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="!h-7 !px-2.5 text-xs font-semibold text-emerald-800"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Custom Hobby"}
        </Button>
      </div>

      {open && (
        <form onSubmit={handleGenerate} className="mt-3 space-y-2 animate-in fade-in duration-200">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={200}
            placeholder="e.g. Origami with sticky notes, Coffee brewing, Haiku..."
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={loading || !prompt.trim()}
            className="w-full text-xs font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 animate-spin" /> Gemini is designing blueprint…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Generate with Gemini
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export function GeminiCoachCard({ hobby, currentStreak }: { hobby: Hobby; currentStreak: number }) {
  const [query, setQuery] = useState("");
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceIsError, setAdviceIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "coach_advice",
          hobbyName: hobby.name,
          currentStreak,
          prompt: customPrompt || query,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.advice) {
        setAdvice(data.advice);
        setAdviceIsError(false);
        setQuery("");
      } else {
        setAdvice(data.error || "Coach is unavailable right now. Take a steady breath and enjoy the process.");
        setAdviceIsError(true);
      }
    } catch {
      setAdvice("Couldn't reach the coach. Take a steady breath and enjoy the process.");
      setAdviceIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-emerald-700" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">Ask Gemini Coach</h3>
      </div>
      <p className="mt-1 text-xs text-stone-600">Need practical tips or advice during your 15 minutes?</p>

      {advice && (
        <div
          role={adviceIsError ? "alert" : "status"}
          className={
            adviceIsError
              ? "mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-stone-700 animate-in fade-in"
              : "mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-stone-800 italic animate-in fade-in"
          }
        >
          {adviceIsError ? advice : `“${advice}”`}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => fetchAdvice("Give me a practical micro-tip to make this 15-minute session enjoyable.")}
          disabled={loading}
          className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          💡 Practical tip
        </button>
        <button
          type="button"
          onClick={() => fetchAdvice("How do I stay present if my urge to check my phone kicks in?")}
          disabled={loading}
          className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          🧘 Resist phone urge
        </button>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={300}
          placeholder="Ask your coach anything…"
          className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim()) fetchAdvice();
            }
          }}
        />
        <Button
          size="sm"
          className="!h-8 !px-3 text-xs"
          disabled={loading || !query.trim()}
          onClick={() => fetchAdvice()}
        >
          {loading ? <Sparkles className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </Button>
      </div>
    </Card>
  );
}
