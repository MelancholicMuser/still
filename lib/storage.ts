import { type Streak } from "@/lib/streak";
import { type Hobby, type TabId, type TimerStatus, type Answers, type TimerState, type LeaderRow, type FeedItem } from "@/lib/types";
import { SEED_LEADERBOARD, INITIAL_TIMER } from "@/lib/data";

export const STORAGE_KEY = "still:v1";

export const MAX_FEED = 40;

export type Snapshot = {
  v: 1;
  dayKey: string;
  weekKey: number;
  activeTab: TabId;
  answers: Answers;
  quizStep: number;
  matches: { id: string; matchReason: string; matchScore: number }[];
  selectedHobbyId: string | null;
  timer: TimerState;
  sessionMinutes: number;
  reclaimedMinutes: number;
  streak: Streak;
  xp: number;
  sessionsToday: number;
  todayMinutes: number;
  leaderboard: LeaderRow[];
  feed: FeedItem[];
  activeIds: string[];
  nudged: string[];
  /** AI-generated hobbies. Optional so snapshots saved before this field existed still load. */
  custom?: Hobby[];
};

export const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export const isStr = (x: unknown): x is string => typeof x === "string";

export const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);

export const MAX_CUSTOM_HOBBIES = 10;

/** Shape check for a saved AI-generated hobby (it came from localStorage, so nothing is trusted). */
function isHobby(x: unknown): x is Hobby {
  const h = x as Hobby | null;
  const bp = h?.blueprint;
  return (
    !!h &&
    isStr(h.id) &&
    isStr(h.name) &&
    isStr(h.emoji) &&
    isStr(h.category) &&
    isStr(h.blurb) &&
    isStr(h.matchReason) &&
    isNum(h.matchScore) &&
    !!bp &&
    isStr(bp.title) &&
    bp.minutes === 15 &&
    Array.isArray(bp.steps) &&
    bp.steps.length > 0 &&
    bp.steps.every((st) => !!st && isStr(st.id) && isStr(st.text)) &&
    isStrArr(bp.materials)
  );
}

const TIMER_STATUSES: TimerStatus[] = ["idle", "arming", "running", "paused", "completing", "celebrating"];

/** Reads and validates the saved state. Anything malformed is ignored so bad data can never brick the app. */
export function loadSnapshot(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = JSON.parse(raw);
    const ok =
      s?.v === 1 &&
      isStr(s.dayKey) &&
      isNum(s.weekKey) &&
      isStr(s.activeTab) &&
      isNum(s.quizStep) &&
      isNum(s.sessionMinutes) &&
      isNum(s.reclaimedMinutes) &&
      isNum(s.xp) &&
      isNum(s.sessionsToday) &&
      isNum(s.todayMinutes) &&
      (s.selectedHobbyId === null || isStr(s.selectedHobbyId)) &&
      isStrArr(s.activeIds) &&
      isStrArr(s.nudged) &&
      isStrArr(s.answers?.interests) &&
      isStr(s.answers?.time) &&
      isStr(s.answers?.budget) &&
      isStr(s.answers?.social) &&
      Array.isArray(s.matches) &&
      s.matches.every((m: unknown) => isStr((m as { id?: unknown })?.id)) &&
      isNum(s.streak?.current) &&
      isNum(s.streak?.best) &&
      isNum(s.streak?.freezes) &&
      typeof s.streak?.todayDone === "boolean" &&
      (s.streak?.lastDone === null || isStr(s.streak?.lastDone)) &&
      TIMER_STATUSES.includes(s.timer?.status) &&
      isNum(s.timer?.totalSeconds) &&
      s.timer.totalSeconds > 0 &&
      isNum(s.timer?.remainingSeconds) &&
      (s.timer?.startedAt === null || isNum(s.timer?.startedAt)) &&
      isStrArr(s.timer?.completedStepIds) &&
      Array.isArray(s.leaderboard) &&
      s.leaderboard.some((r: LeaderRow) => r?.isMe) &&
      s.leaderboard.every(
        (r: LeaderRow) => r && isStr(r.id) && isStr(r.name) && isStr(r.avatar) && isNum(r.weeklyMinutes) && isNum(r.streak),
      ) &&
      Array.isArray(s.feed) &&
      s.feed.every(
        (f: FeedItem) =>
          f && isStr(f.id) && isStr(f.name) && isNum(f.minutes) && f.reactions && typeof f.reactions === "object" && Array.isArray(f.myReactions),
      );
    if (!ok) return null;
    const custom: Hobby[] = Array.isArray(s.custom) ? s.custom.filter(isHobby).slice(0, MAX_CUSTOM_HOBBIES) : [];
    return { ...(s as Snapshot), custom };
  } catch {
    return null;
  }
}

export function saveSnapshot(snap: Snapshot) {
  try {
    const json = JSON.stringify(snap);
    if (window.localStorage.getItem(STORAGE_KEY) === json) return; // nothing changed (e.g. a running timer ticking)
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* storage full or blocked (private mode): the app keeps working, it just won't persist */
  }
}

/** States that only make sense while the app is open are turned into something safe to resume. */
export function normalizeTimer(t: TimerState): TimerState {
  if (t.status === "arming") return { ...t, status: "idle", remainingSeconds: t.totalSeconds, startedAt: null };
  if (t.status === "celebrating") return { ...INITIAL_TIMER, completedStepIds: [] };
  if (t.status === "running" && t.startedAt === null) return { ...t, status: "paused" };
  return t;
}

/** A fresh weekly board: friends keep their (mock) totals, the player starts at zero. */
export function freshBoard(myStreak: number): LeaderRow[] {
  return SEED_LEADERBOARD.map((r) => (r.isMe ? { ...r, weeklyMinutes: 0, streak: myStreak } : r));
}
