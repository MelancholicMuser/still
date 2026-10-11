"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BellRing,
  Check,
  Copy,
  Crown,
  Flame,
  Medal,
  Minus,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { weekResetLabel } from "@/lib/streak";
import { type LeaderRow, type FeedItem, type RankChange } from "@/lib/types";
import { RM, FOCUS, Button, Card, Badge, Avatar, Sheet } from "@/components/ui-kit";
import { REACTION_KEYS, BASE_RANK } from "@/lib/data";
import { cx, formatMinsToHM, sortBoard, timeAgoLabel } from "@/lib/helpers";
import { useLater } from "@/lib/hooks";

export const ROW_H = 56;

export function ReactionBar({
  item,
  onReact,
}: {
  item: FeedItem;
  onReact: (emoji: string) => void;
}) {
  const later = useLater();
  const [floats, setFloats] = useState<{ id: number; emoji: string }[]>([]);
  const counter = useRef(0);

  const react = (emoji: string) => {
    const adding = !item.myReactions.includes(emoji);
    onReact(emoji);
    if (adding) {
      const id = ++counter.current;
      setFloats((f) => [...f, { id, emoji }]);
      later(() => setFloats((f) => f.filter((x) => x.id !== id)), 600);
    }
  };

  return (
    <div className="relative mt-3 flex gap-2" role="group" aria-label="Reactions">
      {REACTION_KEYS.map((emoji) => {
        const mine = item.myReactions.includes(emoji);
        const count = item.reactions[emoji] ?? 0;
        return (
          <div key={emoji} className="relative">
            <button
              type="button"
              aria-pressed={mine}
              aria-label={`${emoji} reaction, ${count}`}
              onClick={() => react(emoji)}
              className={cx(
                "flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-full border px-3 text-sm font-semibold transition-transform duration-200 active:scale-95",
                FOCUS,
                RM,
                mine ? "scale-110 border-emerald-500 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-white text-stone-600",
              )}
            >
              <span aria-hidden="true">{emoji}</span>
              <span className="tabular-nums">{count}</span>
            </button>
            {floats
              .filter((f) => f.emoji === emoji)
              .map((f) => (
                <FloatPlus key={f.id} />
              ))}
          </div>
        );
      })}
    </div>
  );
}

export function FloatPlus() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span
      aria-hidden="true"
      className={cx("pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-sm font-bold text-emerald-600", RM)}
      style={{
        transform: `translate(-50%, ${go ? "-28px" : "0px"})`,
        opacity: go ? 0 : 1,
        transition: "transform 600ms ease-out, opacity 600ms ease-out",
      }}
    >
      +1
    </span>
  );
}

export function FeedCard({ item, onReact }: { item: FeedItem; onReact: (emoji: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const endPress = () => {
    if (pressRef.current !== null) {
      window.clearTimeout(pressRef.current);
      pressRef.current = null;
    }
  };
  const startPress = () => {
    endPress();
    pressRef.current = window.setTimeout(() => {
      pressRef.current = null;
      setMenuOpen(true);
    }, 500);
  };
  useEffect(() => endPress, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  return (
    <Card
      className="relative select-none p-4 animate-in fade-in slide-in-from-top-4 duration-500"
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
    >
      <div className="flex items-center gap-3">
        <Avatar emoji={item.avatar} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <span className="font-bold">{item.name}</span> completed{" "}
            <span className="font-semibold">
              <span aria-hidden="true">{item.hobbyEmoji}</span> {item.hobbyName}
            </span>
          </p>
          <p className="text-xs text-stone-500">{timeAgoLabel(item)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="emerald">{item.minutes} min</Badge>
          <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
            <Flame className="size-3.5" aria-hidden="true" /> {item.streak}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-700">&ldquo;{item.caption}&rdquo;</p>
      {item.manual && (
        <Badge tone="stone" className="mt-2">
          Logged manually
        </Badge>
      )}
      <ReactionBar item={item} onReact={onReact} />

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Quick react"
          className={cx(
            "absolute right-3 top-3 z-10 flex gap-1 rounded-full bg-white p-1 shadow-lg ring-1 ring-stone-200 animate-in zoom-in-90 fade-in duration-150",
            RM,
          )}
        >
          {REACTION_KEYS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              aria-label={`React ${emoji}`}
              onClick={() => {
                onReact(emoji);
                setMenuOpen(false);
              }}
              className={cx("flex size-11 items-center justify-center rounded-full text-xl transition-transform hover:bg-stone-100 active:scale-90", FOCUS, RM)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ArenaTab({
  leaderboard,
  feed,
  lastRankChange,
  activeIds,
  nudged,
  flashIds,
  onNudge,
  onReact,
  onLogRankSeen,
}: {
  leaderboard: LeaderRow[];
  feed: FeedItem[];
  lastRankChange: RankChange | null;
  activeIds: string[];
  nudged: string[];
  flashIds: string[];
  onNudge: (row: LeaderRow) => void;
  onReact: (feedId: string, emoji: string) => void;
  onLogRankSeen?: () => void;
}) {
  void onLogRankSeen;
  const later = useLater();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  const ranked = useMemo(() => sortBoard(leaderboard), [leaderboard]);
  const friends = leaderboard.filter((r) => !r.isMe);
  const myRank = ranked.findIndex((r) => r.isMe) + 1;
  const podium = [ranked[1], ranked[0], ranked[2]];
  const podiumHeights = [72, 104, 56];
  const podiumRanks = [2, 1, 3];

  const copyCode = async () => {
    try {
      await navigator.clipboard?.writeText("ARJ-7K3Q");
    } catch {
      /* clipboard may be unavailable in the preview */
    }
    setCopied(true);
    later(() => setCopied(false), 1500);
  };

  const showBanner = lastRankChange && lastRankChange.to === myRank;

  return (
    <>
      <div className="space-y-5 px-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Friends</h2>
          <Badge tone="rose">
            <span className="relative flex size-2">
              <span className={cx("absolute inline-flex size-full rounded-full bg-rose-500 opacity-75 animate-ping", RM)} />
              <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
            </span>
            Live
          </Badge>
        </div>

        <div className="-mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-1 pt-3 [&::-webkit-scrollbar]:hidden" aria-label="Friend streaks">
          {friends.map((f) => {
            const active = activeIds.includes(f.id);
            const wasNudged = nudged.includes(f.id);
            return (
              <div key={f.id} className="flex w-[68px] shrink-0 flex-col items-center">
                <div className="relative">
                  <Avatar
                    emoji={f.avatar}
                    className={cx(
                      "size-14 text-2xl ring-offset-2 transition-all duration-500",
                      RM,
                      active ? "ring-2 ring-emerald-500 shadow-[0_0_14px_color-mix(in_oklab,var(--color-emerald-500)_45%,transparent)]" : "ring-2 ring-stone-300",
                    )}
                  />
                  <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-amber-600 shadow ring-1 ring-stone-200">
                    <Flame className="size-3" aria-hidden="true" /> {f.streak}
                  </span>
                </div>
                <span className="mt-2 text-xs font-semibold">{f.name}</span>
                {!active && (
                  <button
                    type="button"
                    disabled={wasNudged}
                    onClick={() => onNudge(f)}
                    className={cx(
                      "mt-1 flex min-h-11 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-rose-600 disabled:text-stone-500",
                      FOCUS,
                    )}
                  >
                    {wasNudged ? (
                      "Nudged ✓"
                    ) : (
                      <>
                        <BellRing className="size-3.5" aria-hidden="true" /> Nudge
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight">This Week</h3>
              <p className="text-xs text-stone-500">Resets in {weekResetLabel()}</p>
            </div>
            <Badge tone="stone">
              <Medal className="size-3.5 text-stone-500" aria-hidden="true" /> Silver League
            </Badge>
          </div>

          {showBanner && lastRankChange && (
            <p
              key={`${lastRankChange.from}-${lastRankChange.to}`}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 animate-in fade-in slide-in-from-top-2"
              role="status"
            >
              <TrendingUp className="size-4" aria-hidden="true" />
              {lastRankChange.to < lastRankChange.from
                ? `You climbed from #${lastRankChange.from} to #${lastRankChange.to}`
                : lastRankChange.to > lastRankChange.from
                  ? `You slipped from #${lastRankChange.from} to #${lastRankChange.to}`
                  : `You are holding #${lastRankChange.to}`}
            </p>
          )}

          <div className="mt-4 flex items-end justify-center gap-2">
            {podium.map((row, i) => (
              <div key={row.id} className="flex w-1/3 flex-col items-center">
                {podiumRanks[i] === 1 && <Crown className="mb-1 size-5 text-amber-500" fill="currentColor" aria-hidden="true" />}
                <Avatar emoji={row.avatar} className={cx("size-11", row.isMe && "ring-2 ring-emerald-500")} />
                <p className="mt-1 text-xs font-bold">{row.name}</p>
                <p className="text-[11px] tabular-nums text-stone-500">{formatMinsToHM(row.weeklyMinutes)}</p>
                <div
                  className={cx(
                    "mt-1 flex w-full items-start justify-center rounded-t-xl pt-2 text-lg font-extrabold transition-all duration-500",
                    RM,
                    podiumRanks[i] === 1 ? "bg-amber-200 text-amber-800" : podiumRanks[i] === 2 ? "bg-stone-200 text-stone-700" : "bg-orange-100 text-orange-800",
                  )}
                  style={{ height: podiumHeights[i] }}
                >
                  {podiumRanks[i]}
                </div>
              </div>
            ))}
          </div>

          <ol className="relative mt-4" style={{ height: ranked.length * ROW_H }} aria-label="Weekly leaderboard">
            {ranked.map((row, idx) => {
              const delta = BASE_RANK[row.id] - (idx + 1);
              const flashing = flashIds.includes(row.id);
              return (
                <li
                  key={row.id}
                  className={cx(
                    "absolute left-0 right-0 flex items-center gap-3 rounded-xl px-3 transition-all duration-500",
                    RM,
                    flashing ? "bg-amber-100 ring-2 ring-amber-400" : row.isMe ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-stone-50",
                  )}
                  style={{ top: idx * ROW_H, height: ROW_H - 4 }}
                >
                  <span className="w-5 text-sm font-extrabold tabular-nums text-stone-600">{idx + 1}</span>
                  <Avatar emoji={row.avatar} className="size-9 text-lg" />
                  <span className={cx("flex-1 truncate text-sm font-semibold", row.isMe && "text-emerald-800")}>{row.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatMinsToHM(row.weeklyMinutes)}</span>
                  <span className="flex w-9 items-center gap-0.5 text-xs font-bold text-amber-600">
                    <Flame className="size-3.5" aria-hidden="true" /> {row.streak}
                  </span>
                  {delta > 0 ? (
                    <ArrowUp className="size-4 text-emerald-600" aria-label="Moved up" />
                  ) : delta < 0 ? (
                    <ArrowDown className="size-4 text-rose-500" aria-label="Moved down" />
                  ) : (
                    <Minus className="size-4 text-stone-400" aria-label="No change" />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        <section aria-label="Live activity">
          <h3 className="mb-2 text-base font-bold tracking-tight">Live Activity</h3>
          <ul className="space-y-3">
            {feed.map((item) => (
              <li key={item.id}>
                <FeedCard item={item} onReact={(emoji) => onReact(item.id, emoji)} />
              </li>
            ))}
          </ul>
        </section>

        <Button variant="outline" size="lg" className="w-full" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-5" aria-hidden="true" /> Invite a friend
        </Button>
      </div>

      <Sheet open={inviteOpen} onClose={closeInvite} title="Invite a friend">
        <h3 className="text-xl font-bold tracking-tight">Invite a friend</h3>
        <p className="mt-1 text-sm text-stone-600">Share your code. Habits stick better together.</p>
        <div className="mt-5 flex items-center justify-between rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-4">
          <span className="font-mono text-2xl font-bold tracking-widest text-emerald-800">ARJ-7K3Q</span>
          <Button variant="primary" size="sm" onClick={copyCode} aria-label={copied ? "Copied" : "Copy invite code"}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-stone-700">You both get a streak freeze 🧊</p>
      </Sheet>
    </>
  );
}
