"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Compass,
  Hourglass,
  Sparkles,
  Timer as TimerIcon,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { dayNumber, keyFromDayNumber, rollStreak, todayKey, weekStart, type Streak } from "@/lib/streak";
import { type TabId, type Hobby, type Answers, type TimerState, type LeaderRow, type FeedItem, type RankChange, type Celebration, type Toast } from "@/lib/types";
import { RM, Button, Dialog } from "@/components/ui-kit";
import { REACTION_KEYS, EMPTY_ANSWERS, CATALOG, CATALOG_BY_ID, SEED_LEADERBOARD, SEED_ACTIVE_TODAY, zeroReactions, SEED_FEED, SEED_FEED_AGE_MIN, SIM_CAPTIONS, MOODS, INITIAL_TIMER } from "@/lib/data";
import { cx, clamp, formatHrs, rankOf, pick } from "@/lib/helpers";
import { MAX_CUSTOM_HOBBIES, MAX_FEED, isNum, isStr, loadSnapshot, saveSnapshot, normalizeTimer, freshBoard } from "@/lib/storage";
import { toHobby, scoreCatalog } from "@/lib/matching";
import { useLater } from "@/lib/hooks";
import { QuizTab } from "@/components/tabs/quiz-tab";
import { CoachTab } from "@/components/tabs/coach-tab";
import { TrackerTab } from "@/components/tabs/tracker-tab";
import { ReflectionSheet, CelebrationOverlay } from "@/components/overlays";
import { ArenaTab } from "@/components/tabs/arena-tab";

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "quiz", label: "Quiz", Icon: ClipboardList },
  { id: "coach", label: "Coach", Icon: Compass },
  { id: "tracker", label: "Tracker", Icon: TimerIcon },
  { id: "arena", label: "Arena", Icon: Trophy },
];

const TAB_TITLES: Record<TabId, string> = {
  quiz: "Find your hobby",
  coach: "Your coach",
  tracker: "Focus timer",
  arena: "Arena",
};

export default function App() {
  const later = useLater();

  const [activeTab, setActiveTab] = useState<TabId>("quiz");
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [matches, setMatches] = useState<Hobby[]>([]);
  const [selectedHobbyId, setSelectedHobbyId] = useState<string | null>(null);
  const [timer, setTimer] = useState<TimerState>(INITIAL_TIMER);
  const [armCount, setArmCount] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [stopOpen, setStopOpen] = useState(false);
  const [reclaimedMinutes, setReclaimedMinutes] = useState(1260);
  const [streak, setStreak] = useState<Streak>({ current: 11, best: 21, todayDone: false, freezes: 1, lastDone: null });
  const [xp, setXp] = useState(460);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>(SEED_LEADERBOARD);
  const [feed, setFeed] = useState<FeedItem[]>(SEED_FEED);
  const [lastRankChange, setLastRankChange] = useState<RankChange | null>(null);
  const [hasUnseenArena, setHasUnseenArena] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>(SEED_ACTIVE_TODAY);
  const [nudged, setNudged] = useState<string[]>([]);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [customHobbies, setCustomHobbies] = useState<Record<string, Hobby>>({});
  const [distractionAlert, setDistractionAlert] = useState<{ seconds: number } | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const level = Math.floor(xp / 500) + 1;
  void sessionsToday;

  const toastId = useRef(0);
  const committedRef = useRef(false);
  const firedMilestones = useRef<Set<number>>(new Set());
  const simCount = useRef(0);
  const feedRef = useRef(feed);
  const leaderboardRef = useRef(leaderboard);
  const activeIdsRef = useRef(activeIds);
  const streakRef = useRef(streak);
  const dayRef = useRef("");
  const weekRef = useRef(0);
  useEffect(() => {
    feedRef.current = feed;
    leaderboardRef.current = leaderboard;
    activeIdsRef.current = activeIds;
    streakRef.current = streak;
  }, [feed, leaderboard, activeIds, streak]);

  /* ---------- Persistence: restore on launch ---------- */
  useEffect(() => {
    const today = todayKey();
    dayRef.current = today;
    weekRef.current = weekStart(today);

    const snap = loadSnapshot();
    if (!snap) {
      // First launch: keep the seeded demo data, anchor its streak to yesterday and give the
      // seeded feed real timestamps so "12m ago" keeps ageing correctly.
      const now = Date.now();
      setStreak((s) => ({ ...s, lastDone: keyFromDayNumber(dayNumber(today) - 1) }));
      setFeed((f) => f.map((x) => ({ ...x, at: now - (SEED_FEED_AGE_MIN[x.id] ?? 60) * 60_000 })));
      setHydrated(true);
      return;
    }

    const sameDay = snap.dayKey === today;
    const sameWeek = snap.weekKey === weekRef.current;
    const streakNow = rollStreak(snap.streak, today);
    const timerNow = normalizeTimer(snap.timer);
    const savedCustom = snap.custom ?? [];
    const customById: Record<string, Hobby> = Object.fromEntries(savedCustom.map((h) => [h.id, h]));
    const hobbyId =
      snap.selectedHobbyId && (CATALOG_BY_ID[snap.selectedHobbyId] || customById[snap.selectedHobbyId])
        ? snap.selectedHobbyId
        : null;
    const restoredMatches = snap.matches.flatMap((m) => {
      if (!isStr(m.matchReason) || !isNum(m.matchScore)) return [];
      const custom = customById[m.id];
      if (custom) return [{ ...custom, matchReason: m.matchReason, matchScore: m.matchScore }];
      const entry = CATALOG_BY_ID[m.id];
      return entry ? [toHobby(entry, m.matchReason, m.matchScore)] : [];
    });
    const timerActive = timerNow.status === "running" || timerNow.status === "paused" || timerNow.status === "completing";
    const savedTab: TabId = TABS.some((t) => t.id === snap.activeTab) ? snap.activeTab : "quiz";

    // Don't re-fire milestone toasts for marks a resumed session has already passed.
    if (timerNow.status === "running" || timerNow.status === "paused") {
      const elapsed =
        timerNow.status === "running" && timerNow.startedAt !== null
          ? (Date.now() - timerNow.startedAt) / 1000
          : timerNow.totalSeconds - timerNow.remainingSeconds;
      const ratio = elapsed / timerNow.totalSeconds;
      firedMilestones.current = new Set([0.25, 0.5, 0.75].filter((m) => ratio >= m));
    }

    setAnswers(snap.answers);
    setCustomHobbies(customById);
    setMatches(restoredMatches);
    setQuizStep(snap.quizStep === 5 && restoredMatches.length === 0 ? 0 : clamp(Math.round(snap.quizStep), 0, 5));
    setSelectedHobbyId(hobbyId);
    setTimer(timerNow);
    setSessionMinutes(snap.sessionMinutes > 0 ? snap.sessionMinutes : Math.max(1, Math.round(timerNow.totalSeconds / 60)));
    setReclaimedMinutes(snap.reclaimedMinutes);
    setStreak(streakNow);
    setXp(snap.xp);
    setSessionsToday(sameDay ? snap.sessionsToday : 0);
    setTodayMinutes(sameDay ? snap.todayMinutes : 0);
    setLeaderboard(
      sameWeek
        ? snap.leaderboard.map((r) => (r.isMe ? { ...r, streak: streakNow.current } : r))
        : freshBoard(streakNow.current),
    );
    setFeed(snap.feed.slice(0, MAX_FEED));
    setActiveIds(sameDay ? snap.activeIds : SEED_ACTIVE_TODAY);
    setNudged(sameDay ? snap.nudged : []);
    setActiveTab(timerActive ? "tracker" : savedTab);
    setHydrated(true);
  }, []);

  /* ---------- Persistence: save on change ---------- */
  useEffect(() => {
    if (!hydrated) return;
    saveSnapshot({
      v: 1,
      dayKey: dayRef.current,
      weekKey: weekRef.current,
      activeTab,
      answers,
      quizStep,
      matches: matches.map((m) => ({ id: m.id, matchReason: m.matchReason, matchScore: m.matchScore })),
      selectedHobbyId,
      // While running, remainingSeconds is derived from startedAt, so it is pinned here to avoid
      // rewriting storage every second.
      timer: timer.status === "running" ? { ...timer, remainingSeconds: timer.totalSeconds } : timer,
      sessionMinutes,
      reclaimedMinutes,
      streak,
      xp,
      sessionsToday,
      todayMinutes,
      leaderboard,
      feed: feed.slice(0, MAX_FEED),
      activeIds,
      nudged,
      custom: Object.values(customHobbies).slice(-MAX_CUSTOM_HOBBIES),
    });
  }, [
    hydrated,
    activeTab,
    answers,
    quizStep,
    matches,
    selectedHobbyId,
    timer,
    sessionMinutes,
    reclaimedMinutes,
    streak,
    xp,
    sessionsToday,
    todayMinutes,
    leaderboard,
    feed,
    activeIds,
    nudged,
    customHobbies,
  ]);

  /* ---------- New day / new week while the app stays open (or resumes from the background) ---------- */
  useEffect(() => {
    if (!hydrated) return;
    const check = () => {
      const today = todayKey();
      if (today === dayRef.current) return;
      dayRef.current = today;
      const nextStreak = rollStreak(streakRef.current, today);
      const week = weekStart(today);
      const weekChanged = week !== weekRef.current;
      weekRef.current = week;
      setStreak(nextStreak);
      setTodayMinutes(0);
      setSessionsToday(0);
      setActiveIds(SEED_ACTIVE_TODAY);
      setNudged([]);
      setLastRankChange(null);
      setLeaderboard((b) =>
        weekChanged ? freshBoard(nextStreak.current) : b.map((r) => (r.isMe ? { ...r, streak: nextStreak.current } : r)),
      );
    };
    const id = window.setInterval(check, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated]);

  const selectedHobby = useMemo<Hobby | null>(() => {
    if (!selectedHobbyId) return null;
    if (customHobbies[selectedHobbyId]) return customHobbies[selectedHobbyId];
    const fromMatches = matches.find((m) => m.id === selectedHobbyId);
    if (fromMatches) return fromMatches;
    const entry = CATALOG_BY_ID[selectedHobbyId];
    return entry ? toHobby(entry, "Picked from your last quiz.", 90) : null;
  }, [matches, selectedHobbyId, customHobbies]);

  const pushToast = useCallback(
    (text: string) => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, text }]);
      later(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
    },
    [later],
  );

  const flashRow = useCallback(
    (id: string) => {
      setFlashIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      later(() => setFlashIds((ids) => ids.filter((x) => x !== id)), 1600);
    },
    [later],
  );

  /* ---------- Focus Shield: Screen Wake Lock ---------- */
  useEffect(() => {
    if (timer.status !== "running" || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setWakeLockActive(false);
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (!cancelled) {
          sentinel = lock;
          setWakeLockActive(true);
        } else {
          lock.release().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setWakeLockActive(false);
      sentinel?.release().catch(() => {});
    };
  }, [timer.status]);

  /* ---------- Focus Shield: Distraction / Abandonment Detector ---------- */
  useEffect(() => {
    if (timer.status !== "running") return;
    let hiddenAt: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (document.visibilityState === "visible" && hiddenAt !== null) {
        const awaySec = Math.round((Date.now() - hiddenAt) / 1000);
        if (awaySec >= 3) {
          setDistractionAlert({ seconds: awaySec });
          pushToast(`⚠️ Focus shield alert: You switched away for ${awaySec}s!`);
        }
        hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [timer.status, pushToast]);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  /* ---------- Arena tab opened ---------- */
  useEffect(() => {
    if (activeTab === "arena") setHasUnseenArena(false);
  }, [activeTab]);

  /* ---------- Timer: arming countdown ---------- */
  useEffect(() => {
    if (timer.status !== "arming") return;
    const id = window.setTimeout(() => {
      if (armCount > 1) setArmCount((c) => c - 1);
      else setTimer((t) => (t.status === "arming" ? { ...t, status: "running", startedAt: Date.now() } : t));
    }, 800);
    return () => window.clearTimeout(id);
  }, [timer.status, armCount]);

  /* ---------- Timer: running tick (derived from Date.now) ---------- */
  useEffect(() => {
    if (timer.status !== "running" || timer.startedAt === null) return;
    const { startedAt, totalSeconds } = timer;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(totalSeconds - elapsed));
      setTimer((t) => (t.status === "running" && t.remainingSeconds !== remaining ? { ...t, remainingSeconds: remaining } : t));
    };
    tick(); // resync immediately (e.g. after resuming a saved session) instead of waiting for the first interval
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [timer.status, timer.startedAt, timer.totalSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Timer: natural completion ---------- */
  useEffect(() => {
    if (timer.status === "running" && timer.remainingSeconds <= 0) {
      committedRef.current = false;
      setSessionMinutes(Math.round(timer.totalSeconds / 60));
      setTimer((t) => ({ ...t, status: "completing" }));
    }
  }, [timer.status, timer.remainingSeconds, timer.totalSeconds]);

  /* ---------- Timer: milestone toasts ---------- */
  useEffect(() => {
    if (timer.status !== "running" || timer.totalSeconds <= 0) return;
    const ratio = (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds;
    const marks: [number, string][] = [
      [0.25, "A quarter in. The feed can wait."],
      [0.5, "Halfway. Your thumb is free."],
      [0.75, "Three quarters done. Almost there."],
    ];
    for (const [m, text] of marks) {
      if (ratio >= m && !firedMilestones.current.has(m)) {
        firedMilestones.current.add(m);
        pushToast(text);
      }
    }
  }, [timer.status, timer.remainingSeconds, timer.totalSeconds, pushToast]);

  /* ---------- Arena: simulated live events ---------- */
  useEffect(() => {
    if (activeTab !== "arena") return;
    const id = window.setInterval(() => {
      if (simCount.current >= 6) return;
      simCount.current += 1;

      const mine = feedRef.current.filter((f) => f.userId === "me");
      if (mine.length > 0 && Math.random() < 0.5) {
        const target = pick(mine);
        const emoji = pick(REACTION_KEYS);
        const friend = pick(leaderboardRef.current.filter((r) => !r.isMe && r.id !== "ananya"));
        setFeed((f) =>
          f.map((x) => (x.id === target.id ? { ...x, reactions: { ...x.reactions, [emoji]: (x.reactions[emoji] ?? 0) + 1 } } : x)),
        );
        pushToast(`${friend.name} ${emoji}'d your session`);
        return;
      }

      const board = leaderboardRef.current;
      const friend = pick(board.filter((r) => !r.isMe));
      const entry = pick(CATALOG);
      const minutes = pick([10, 15, 20, 25]);
      const wasActive = activeIdsRef.current.includes(friend.id);
      const newStreak = wasActive ? friend.streak : friend.streak + 1;
      const myBefore = rankOf(board, "me");
      const nextBoard = board.map((r) =>
        r.id === friend.id ? { ...r, weeklyMinutes: r.weeklyMinutes + minutes, streak: newStreak } : r,
      );
      const myAfter = rankOf(nextBoard, "me");

      setLeaderboard(nextBoard);
      setActiveIds((ids) => (ids.includes(friend.id) ? ids : [...ids, friend.id]));
      setFeed((f) => [
        {
          id: `sim-${Date.now()}`,
          at: Date.now(),
          userId: friend.id,
          name: friend.name,
          avatar: friend.avatar,
          hobbyEmoji: entry.emoji,
          hobbyName: entry.name,
          minutes,
          streak: newStreak,
          caption: pick(SIM_CAPTIONS),
          timeAgo: "just now",
          reactions: zeroReactions(),
          myReactions: [],
        },
        ...f,
      ]);
      flashRow(friend.id);
      if (myAfter !== myBefore) setLastRankChange({ from: myBefore, to: myAfter });
    }, 12000);
    return () => window.clearInterval(id);
  }, [activeTab, pushToast, flashRow]);

  /* ---------- Handlers ---------- */

  const startArming = (seconds: number) => {
    firedMilestones.current = new Set();
    setArmCount(3);
    setTimer((t) => ({ ...t, status: "arming", totalSeconds: seconds, remainingSeconds: seconds, startedAt: null }));
  };

  const startFromCoach = () => {
    if (timer.status === "idle") startArming(900);
    setActiveTab("tracker");
  };

  const resetTimer = (clearSteps: boolean) =>
    setTimer((t) => ({ ...INITIAL_TIMER, completedStepIds: clearSteps ? [] : t.completedStepIds }));

  const toggleStep = (id: string) =>
    setTimer((t) => ({
      ...t,
      completedStepIds: t.completedStepIds.includes(id) ? t.completedStepIds.filter((x) => x !== id) : [...t.completedStepIds, id],
    }));

  const setDuration = (minutes: number) =>
    setTimer((t) => (t.status === "idle" ? { ...t, totalSeconds: minutes * 60, remainingSeconds: minutes * 60 } : t));

  const pauseTimer = () => setTimer((t) => (t.status === "running" ? { ...t, status: "paused", startedAt: null } : t));

  const resumeTimer = () =>
    setTimer((t) =>
      t.status === "paused"
        ? { ...t, status: "running", startedAt: Date.now() - (t.totalSeconds - t.remainingSeconds) * 1000 }
        : t,
    );

  const beginCompleting = (minutes: number) => {
    committedRef.current = false;
    setSessionMinutes(Math.max(1, minutes));
    setTimer((t) => ({ ...t, status: "completing" }));
  };

  const finishEarly = () => {
    const elapsed = timer.totalSeconds - timer.remainingSeconds;
    if (elapsed >= 300) beginCompleting(Math.round(elapsed / 60));
    else setStopOpen(true);
  };

  const demoFinish = () => {
    beginCompleting(Math.round(timer.totalSeconds / 60));
    setTimer((t) => ({ ...t, remainingSeconds: 0 }));
  };

  const addFiveMinutes = () =>
    setTimer((t) => ({ ...t, totalSeconds: t.totalSeconds + 300, remainingSeconds: t.remainingSeconds + 300 }));

  /* One atomic commit for a finished (or manually logged) session */
  const applySession = (opts: { minutes: number; caption: string; manual: boolean }) => {
    const hobby = selectedHobby;
    if (!hobby) return null;
    const { minutes, manual } = opts;
    const xpGain = Math.round(minutes * 3);
    const newXp = xp + xpGain;
    const levelUp = Math.floor(newXp / 500) > Math.floor(xp / 500);
    const newStreakValue = streak.todayDone ? streak.current : streak.current + 1;
    const rankFrom = rankOf(leaderboard, "me");
    const nextBoard = leaderboard.map((r) =>
      r.isMe ? { ...r, weeklyMinutes: r.weeklyMinutes + minutes, streak: newStreakValue } : r,
    );
    const rankTo = rankOf(nextBoard, "me");
    const caption = opts.caption || `${minutes} minutes of ${hobby.name}. Zero reels.`;

    setReclaimedMinutes((m) => m + minutes);
    setXp((x) => x + xpGain);
    setStreak((s) =>
      s.todayDone
        ? s
        : { ...s, current: s.current + 1, best: Math.max(s.best, s.current + 1), todayDone: true, lastDone: todayKey() },
    );
    setSessionsToday((n) => n + 1);
    setTodayMinutes((m) => m + minutes);
    setLeaderboard((board) =>
      board.map((r) => (r.isMe ? { ...r, weeklyMinutes: r.weeklyMinutes + minutes, streak: newStreakValue } : r)),
    );
    setLastRankChange({ from: rankFrom, to: rankTo });
    setFeed((f) => [
      {
        id: `me-${Date.now()}`,
        at: Date.now(),
        userId: "me",
        name: "You",
        avatar: "🎸",
        hobbyEmoji: hobby.emoji,
        hobbyName: hobby.name,
        minutes,
        streak: newStreakValue,
        caption,
        timeAgo: "just now",
        reactions: zeroReactions(),
        myReactions: [],
        manual,
      },
      ...f,
    ]);
    setHasUnseenArena(true);
    flashRow("me");

    const result: Celebration = {
      fromMinutes: reclaimedMinutes,
      toMinutes: reclaimedMinutes + minutes,
      minutes,
      xpGain,
      xpFrom: xp,
      xpTo: newXp,
      levelUp,
      level: Math.floor(newXp / 500) + 1,
      streak: newStreakValue,
      rankFrom,
      rankTo,
      reels: Math.round(minutes * 2),
    };
    return result;
  };

  const commitSession = (caption: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const result = applySession({ minutes: sessionMinutes, caption, manual: false });
    if (!result) {
      // No hobby to credit the session to: close the session instead of waiting on an overlay that never appears.
      resetTimer(true);
      return;
    }
    setCelebration(result);
    setTimer((t) => ({ ...t, status: "celebrating" }));
  };

  const logManual = (minutes: number) => {
    const effective = Math.max(1, Math.round(minutes * 0.8));
    const result = applySession({ minutes: effective, caption: "", manual: true });
    if (result) pushToast(`Logged ${effective} min. Streak updated.`);
  };

  const toggleReaction = (feedId: string, emoji: string) =>
    setFeed((f) =>
      f.map((item) => {
        if (item.id !== feedId) return item;
        const mine = item.myReactions.includes(emoji);
        return {
          ...item,
          reactions: { ...item.reactions, [emoji]: Math.max(0, (item.reactions[emoji] ?? 0) + (mine ? -1 : 1)) },
          myReactions: mine ? item.myReactions.filter((e) => e !== emoji) : [...item.myReactions, emoji],
        };
      }),
    );

  const nudgeFriend = (row: LeaderRow) => {
    setNudged((n) => (n.includes(row.id) ? n : [...n, row.id]));
    pushToast(`Nudge sent to ${row.name}`);
  };

  const pickHobby = (h: Hobby) => {
    setSelectedHobbyId(h.id);
    setTimer((t) => (t.status === "idle" ? { ...t, completedStepIds: [] } : t));
    setActiveTab("coach");
    pushToast("Great pick! Your 15-minute blueprint is ready.");
  };

  const handleCustomHobbyCreated = (h: Hobby) => {
    setCustomHobbies((prev) => ({ ...prev, [h.id]: h }));
    setMatches((m) => [h, ...m.filter((x) => x.id !== h.id)]);
    setSelectedHobbyId(h.id);
    setTimer((t) => (t.status === "idle" ? { ...t, completedStepIds: [] } : t));
    setActiveTab("coach");
    pushToast(`✨ Gemini created ${h.name}! 15-minute blueprint ready.`);
  };

  const swapHobby = (h: Hobby) => {
    setSelectedHobbyId(h.id);
    setTimer((t) => ({ ...t, completedStepIds: [] }));
    pushToast(`Switched to ${h.name}. Streak kept.`);
  };

  const retakeQuiz = () => {
    setQuizStep(0);
    setAnswers(EMPTY_ANSWERS);
    setMatches([]);
  };

  const finishGenerating = useCallback(() => {
    setMatches(scoreCatalog(answersRef.current));
    setQuizStep(5);
  }, []);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const otherMatches = matches.filter((m) => m.id !== selectedHobbyId);
  const timerRunning = timer.status === "running";

  /* ---------- Render ---------- */
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 text-stone-900">
      <div
        className={cx(
          "relative flex h-dvh w-full flex-col overflow-hidden bg-stone-50",
          "sm:h-[812px] sm:max-h-[100dvh] sm:max-w-[375px] sm:rounded-[2.5rem] sm:border sm:border-stone-200 sm:shadow-2xl",
          !hydrated && "invisible",
        )}
      >
        {/* Header */}
        <header className="flex h-[calc(3.5rem_+_env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-stone-200/80 bg-white/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase leading-none tracking-widest text-emerald-700">Still</p>
              <h1 className="text-base font-bold leading-tight tracking-tight">{TAB_TITLES[activeTab]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-2.5 pr-3 ring-1 ring-emerald-200">
            <Hourglass className="size-4 text-emerald-700" aria-hidden="true" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">Hours Reclaimed</span>
              <span className="mt-0.5 text-xs font-bold tabular-nums text-emerald-900">{formatHrs(reclaimedMinutes)}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-6 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {activeTab === "quiz" && (
            <QuizTab
              quizStep={quizStep}
              setQuizStep={setQuizStep}
              answers={answers}
              setAnswers={setAnswers}
              matches={matches}
              onGenerated={finishGenerating}
              onPick={pickHobby}
              onRetake={retakeQuiz}
              onCustomHobbyCreated={handleCustomHobbyCreated}
            />
          )}
          {activeTab === "coach" && (
            <CoachTab
              hobby={selectedHobby}
              otherMatches={otherMatches}
              completedStepIds={timer.completedStepIds}
              currentStreak={streak.current}
              onToggleStep={toggleStep}
              onStart={startFromCoach}
              onSwap={swapHobby}
              onGoQuiz={() => setActiveTab("quiz")}
            />
          )}
          {activeTab === "tracker" && (
            <TrackerTab
              hobby={selectedHobby}
              timer={timer}
              armCount={armCount}
              streak={streak}
              todayMinutes={todayMinutes}
              reclaimedMinutes={reclaimedMinutes}
              xp={xp}
              level={level}
              wakeLockActive={wakeLockActive}
              distractionAlert={distractionAlert}
              onDismissDistraction={() => setDistractionAlert(null)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onGoQuiz={() => setActiveTab("quiz")}
              onSetDuration={setDuration}
              onStartTimer={() => startArming(timer.totalSeconds)}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onFinishEarly={finishEarly}
              onDemoFinish={demoFinish}
              onAddFive={addFiveMinutes}
              onToggleStep={toggleStep}
              onLogManual={logManual}
            />
          )}
          {activeTab === "arena" && (
            <ArenaTab
              leaderboard={leaderboard}
              feed={feed}
              lastRankChange={lastRankChange}
              activeIds={activeIds}
              nudged={nudged}
              flashIds={flashIds}
              onNudge={nudgeFriend}
              onReact={toggleReaction}
            />
          )}
        </main>

        {/* Bottom navigation */}
        <nav
          aria-label="Main"
          className="relative z-20 flex h-[calc(5rem_+_env(safe-area-inset-bottom))] shrink-0 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]"
        >
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveTab(id)}
                className={cx(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 pb-2 transition-all duration-200 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500",
                  RM,
                  active ? "text-emerald-700" : "text-stone-500",
                )}
              >
                <span
                  className={cx(
                    "absolute top-0 h-1 rounded-b-full bg-emerald-600 transition-all duration-200",
                    RM,
                    active ? "w-10 opacity-100" : "w-0 opacity-0",
                  )}
                />
                <span className="relative">
                  <Icon className={cx("size-6 transition-transform duration-200", RM, active && "scale-110")} aria-hidden="true" />
                  {id === "arena" && hasUnseenArena && (
                    <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-white bg-rose-500">
                      <span className="sr-only">New friend activity</span>
                    </span>
                  )}
                  {id === "tracker" && timerRunning && (
                    <span className="absolute -right-1 -top-0.5 flex size-2.5">
                      <span className={cx("absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 animate-ping", RM)} />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                      <span className="sr-only">Timer running</span>
                    </span>
                  )}
                </span>
                <span className={cx("text-xs", active ? "font-bold" : "font-medium")}>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Toasts */}
        <div
          className="pointer-events-none absolute inset-x-0 top-[calc(4rem_+_env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4"
          role="status"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cx(
                "max-w-full rounded-full bg-stone-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-300",
                RM,
              )}
            >
              {t.text}
            </div>
          ))}
        </div>

        {/* Timer-driven overlays */}
        {timer.status === "completing" && (
          <ReflectionSheet
            key={`reflect-${sessionMinutes}`}
            minutes={sessionMinutes}
            onLog={(mood, caption) => {
              const moodNote = mood !== null && mood >= 3 && !caption ? `Felt ${MOODS[mood].label.toLowerCase()}. Phone stayed down.` : caption;
              commitSession(moodNote);
            }}
            onSkip={() => commitSession("")}
          />
        )}

        {timer.status === "celebrating" && celebration && (
          <CelebrationOverlay
            data={celebration}
            onArena={() => {
              resetTimer(true);
              setActiveTab("arena");
            }}
            onDone={() => resetTimer(true)}
          />
        )}

        <Dialog open={stopOpen} onClose={() => setStopOpen(false)} title="Stop session">
          <h3 className="text-lg font-bold tracking-tight">Stop now?</h3>
          <p className="mt-1 text-sm text-stone-600">Sessions under 5 minutes don&apos;t count.</p>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setStopOpen(false)}>
              Keep going
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={() => {
                setStopOpen(false);
                resetTimer(false);
              }}
            >
              Stop anyway
            </Button>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
