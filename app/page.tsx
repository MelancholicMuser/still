"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  BellRing,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  Circle,
  ClipboardList,
  Clock,
  Compass,
  Copy,
  Crown,
  Dumbbell,
  FastForward,
  FlagTriangleRight,
  Flame,
  Frown,
  Hammer,
  Hourglass,
  Laugh,
  Maximize2,
  Medal,
  Meh,
  Minimize2,
  Minus,
  Music,
  Package,
  Palette,
  Pause,
  PenLine,
  Play,
  Send,
  ShieldAlert,
  Shuffle,
  Siren,
  Smile,
  SmilePlus,
  Snowflake,
  Sparkles,
  Timer as TimerIcon,
  TrendingUp,
  Trees,
  Trophy,
  User,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  dayNumber,
  keyFromDayNumber,
  rollStreak,
  todayKey,
  weekResetLabel,
  weekStart,
  type Streak,
} from "@/lib/streak";

/* =====================================================
   Types
   ===================================================== */

type TabId = "quiz" | "coach" | "tracker" | "arena";
type TimerStatus = "idle" | "arming" | "running" | "paused" | "completing" | "celebrating";

type Hobby = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  blurb: string;
  matchReason: string;
  matchScore: number;
  blueprint: { title: string; minutes: 15; steps: { id: string; text: string }[]; materials: string[] };
};

type CatalogEntry = Omit<Hobby, "matchReason" | "matchScore"> & {
  interests: string[];
  cost: 0 | 1 | 2;
  social: "solo" | "friend" | "both";
  quick: boolean;
};

type Answers = { interests: string[]; time: string; budget: string; social: string };

type TimerState = {
  status: TimerStatus;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  completedStepIds: string[];
};

type LeaderRow = { id: string; name: string; avatar: string; weeklyMinutes: number; streak: number; isMe?: boolean };

type FeedItem = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  hobbyEmoji: string;
  hobbyName: string;
  minutes: number;
  streak: number;
  caption: string;
  timeAgo: string;
  reactions: Record<string, number>;
  myReactions: string[];
  manual?: boolean;
  /** Creation time (ms). When present, the relative label ("12m ago") is computed from it. */
  at?: number;
};

type RankChange = { from: number; to: number };

type Celebration = {
  fromMinutes: number;
  toMinutes: number;
  minutes: number;
  xpGain: number;
  xpFrom: number;
  xpTo: number;
  levelUp: boolean;
  level: number;
  streak: number;
  rankFrom: number;
  rankTo: number;
  reels: number;
};

type Toast = { id: number; text: string };

/* =====================================================
   Mock Data
   ===================================================== */

const RM = "motion-reduce:animate-none motion-reduce:transition-none";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";

const REACTION_KEYS = ["🔥", "👏", "💪", "😮"];

const INTERESTS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "music", label: "Music", Icon: Music },
  { id: "art", label: "Art", Icon: Palette },
  { id: "movement", label: "Movement", Icon: Dumbbell },
  { id: "outdoors", label: "Outdoors", Icon: Trees },
  { id: "building", label: "Building", Icon: Hammer },
  { id: "writing", label: "Writing", Icon: PenLine },
  { id: "cooking", label: "Cooking", Icon: ChefHat },
  { id: "mind", label: "Mind", Icon: Brain },
];

const TIME_OPTIONS = ["10 min a day", "15–30 min a day", "30–60 min a day", "Weekends only"];
const BUDGET_OPTIONS = ["Free", "Under ₹500", "₹500–2000", "I'm flexible"];
const SOCIAL_OPTIONS: { label: string; Icon: LucideIcon; sub: string }[] = [
  { label: "Solo", Icon: User, sub: "Just me and the hobby" },
  { label: "With a friend", Icon: Users, sub: "Better with company" },
  { label: "Mix of both", Icon: Shuffle, sub: "Depends on the day" },
];

const EMPTY_ANSWERS: Answers = { interests: [], time: "", budget: "", social: "" };

const bp = (id: string, title: string, steps: string[], materials: string[]): Hobby["blueprint"] => ({
  title,
  minutes: 15,
  steps: steps.map((text, i) => ({ id: `${id}-s${i + 1}`, text })),
  materials,
});

const CATALOG: CatalogEntry[] = [
  {
    id: "guitar",
    name: "Beginner Guitar",
    emoji: "🎸",
    category: "Music",
    blurb: "Go from silence to your first real chord.",
    interests: ["music"],
    cost: 0,
    social: "both",
    quick: false,
    blueprint: bp(
      "guitar",
      "Your first chord, today",
      [
        "Tune up with a free tuner app (3 min)",
        "Learn the Em shape: two fingers, one move (4 min)",
        "Strum Em slowly, down-strokes only (4 min)",
        "Add Am and switch between the two (4 min)",
      ],
      ["A guitar or any free chord app, ₹0", "Free tuner app, ₹0"],
    ),
  },
  {
    id: "sketching",
    name: "Sketching",
    emoji: "✏️",
    category: "Art",
    blurb: "Train your eye by drawing what is right in front of you.",
    interests: ["art", "mind"],
    cost: 0,
    social: "solo",
    quick: true,
    blueprint: bp(
      "sketching",
      "Draw what is on your desk",
      [
        "Pick one object within reach (2 min)",
        "Outline it in one continuous line (4 min)",
        "Add shadows with light hatching (5 min)",
        "Date it and sign it like an artist (4 min)",
      ],
      ["Any pen or pencil, ₹0", "Scrap paper, ₹0"],
    ),
  },
  {
    id: "bodyweight",
    name: "Bodyweight Basics",
    emoji: "💪",
    category: "Movement",
    blurb: "Squats, push-ups and planks. No gym, no excuses.",
    interests: ["movement"],
    cost: 0,
    social: "both",
    quick: true,
    blueprint: bp(
      "bodyweight",
      "The no-equipment circuit",
      [
        "Warm up: arm circles and hip rolls (3 min)",
        "3 rounds of 10 squats (4 min)",
        "3 rounds of 5 to 10 push-ups (4 min)",
        "30-second plank, then stretch (4 min)",
      ],
      ["Floor space, ₹0", "A towel or mat, ₹0"],
    ),
  },
  {
    id: "journaling",
    name: "Journaling",
    emoji: "📓",
    category: "Writing",
    blurb: "Get the noise out of your head and onto the page.",
    interests: ["writing", "mind"],
    cost: 0,
    social: "solo",
    quick: true,
    blueprint: bp(
      "journaling",
      "Brain dump and one good line",
      [
        "Write down everything on your mind (4 min)",
        "Circle the one thing that matters today (3 min)",
        "Write three things you are grateful for (4 min)",
        "End with one honest sentence about today (4 min)",
      ],
      ["Any notebook or notes app, ₹0", "A pen you like, ₹0"],
    ),
  },
  {
    id: "cooking",
    name: "Home Cooking",
    emoji: "🍳",
    category: "Kitchen",
    blurb: "Make one simple dish from scratch.",
    interests: ["cooking", "building"],
    cost: 1,
    social: "both",
    quick: false,
    blueprint: bp(
      "cooking",
      "A 15-minute masala omelette",
      [
        "Chop onion, chilli and coriander (4 min)",
        "Whisk two eggs with salt and spices (3 min)",
        "Cook on medium heat, fold once (5 min)",
        "Plate it and eat without your phone (3 min)",
      ],
      ["2 eggs, an onion and a chilli, about ₹30", "A pan and a spatula, ₹0"],
    ),
  },
  {
    id: "birding",
    name: "Urban Birding",
    emoji: "🐦",
    category: "Outdoors",
    blurb: "Spot and name the birds hiding in plain sight.",
    interests: ["outdoors", "mind"],
    cost: 0,
    social: "both",
    quick: false,
    blueprint: bp(
      "birding",
      "Meet your neighbourhood birds",
      [
        "Step outside and stand still for a minute (2 min)",
        "Listen: count how many distinct calls you hear (4 min)",
        "Spot and sketch or note one bird (5 min)",
        "Identify it with a free bird guide app (4 min)",
      ],
      ["A window, balcony or park, ₹0", "Free bird ID app, ₹0"],
    ),
  },
  {
    id: "chess",
    name: "Chess",
    emoji: "♟️",
    category: "Strategy",
    blurb: "Sharpen your focus one move at a time.",
    interests: ["mind", "building"],
    cost: 0,
    social: "friend",
    quick: true,
    blueprint: bp(
      "chess",
      "Learn the opening that never fails",
      [
        "Set up the board and name every piece (3 min)",
        "Learn the center-pawn opening idea (4 min)",
        "Solve one beginner mate-in-one puzzle (4 min)",
        "Play five quick moves against a friend or bot (4 min)",
      ],
      ["A chess board or free app, ₹0", "A friend, optional, ₹0"],
    ),
  },
  {
    id: "calisthenics",
    name: "Calisthenics-lite",
    emoji: "🤸",
    category: "Movement",
    blurb: "Playful strength work at the park bars.",
    interests: ["movement", "outdoors"],
    cost: 1,
    social: "both",
    quick: true,
    blueprint: bp(
      "calisthenics",
      "Park bar starter flow",
      [
        "Dynamic warm-up: shoulders and wrists (3 min)",
        "Assisted pull-ups or dead hangs (4 min)",
        "Dips on a bench or low bar (4 min)",
        "Hanging knee raises, then cool down (4 min)",
      ],
      ["A park bar or sturdy bench, ₹0", "Optional resistance band, about ₹400"],
    ),
  },
];

const CATALOG_BY_ID: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

const SEED_LEADERBOARD: LeaderRow[] = [
  { id: "maya", name: "Maya", avatar: "🦊", weeklyMinutes: 210, streak: 18 },
  { id: "rohan", name: "Rohan", avatar: "🐻", weeklyMinutes: 158, streak: 9 },
  { id: "me", name: "You", avatar: "🎸", weeklyMinutes: 150, streak: 11, isMe: true },
  { id: "priya", name: "Priya", avatar: "🦉", weeklyMinutes: 120, streak: 5 },
  { id: "kabir", name: "Kabir", avatar: "🐯", weeklyMinutes: 80, streak: 3 },
  { id: "ananya", name: "Ananya", avatar: "🐼", weeklyMinutes: 35, streak: 0 },
];

const BASE_RANK: Record<string, number> = Object.fromEntries(SEED_LEADERBOARD.map((r, i) => [r.id, i + 1]));

const SEED_ACTIVE_TODAY = ["maya", "rohan", "priya", "kabir"];

const zeroReactions = (): Record<string, number> => ({ "🔥": 0, "👏": 0, "💪": 0, "😮": 0 });

const SEED_FEED: FeedItem[] = [
  {
    id: "seed-1",
    userId: "maya",
    name: "Maya",
    avatar: "🦊",
    hobbyEmoji: "✏️",
    hobbyName: "Sketching",
    minutes: 30,
    streak: 18,
    caption: "Finally got the shading right on my coffee mug.",
    timeAgo: "12m ago",
    reactions: { "🔥": 6, "👏": 4, "💪": 1, "😮": 2 },
    myReactions: [],
  },
  {
    id: "seed-2",
    userId: "rohan",
    name: "Rohan",
    avatar: "🐻",
    hobbyEmoji: "♟️",
    hobbyName: "Chess",
    minutes: 25,
    streak: 9,
    caption: "Beat my brother in 14 moves. He is still upset.",
    timeAgo: "48m ago",
    reactions: { "🔥": 3, "👏": 5, "💪": 2, "😮": 4 },
    myReactions: [],
  },
  {
    id: "seed-3",
    userId: "priya",
    name: "Priya",
    avatar: "🦉",
    hobbyEmoji: "📓",
    hobbyName: "Journaling",
    minutes: 15,
    streak: 5,
    caption: "Three pages and zero scrolling. Weird feeling.",
    timeAgo: "2h ago",
    reactions: { "🔥": 2, "👏": 6, "💪": 0, "😮": 1 },
    myReactions: [],
  },
  {
    id: "seed-4",
    userId: "kabir",
    name: "Kabir",
    avatar: "🐯",
    hobbyEmoji: "💪",
    hobbyName: "Bodyweight Basics",
    minutes: 20,
    streak: 3,
    caption: "Push-ups: 12 to 15. Small win.",
    timeAgo: "3h ago",
    reactions: { "🔥": 4, "👏": 2, "💪": 7, "😮": 0 },
    myReactions: [],
  },
  {
    id: "seed-5",
    userId: "maya",
    name: "Maya",
    avatar: "🦊",
    hobbyEmoji: "🎸",
    hobbyName: "Beginner Guitar",
    minutes: 20,
    streak: 17,
    caption: "Got through the G to C change cleanly.",
    timeAgo: "Yesterday",
    reactions: { "🔥": 5, "👏": 3, "💪": 1, "😮": 1 },
    myReactions: [],
  },
];

/** How long ago (in minutes) each seeded feed item "happened", so labels age correctly once real time passes. */
const SEED_FEED_AGE_MIN: Record<string, number> = {
  "seed-1": 12,
  "seed-2": 48,
  "seed-3": 120,
  "seed-4": 180,
  "seed-5": 1500,
};

const SIM_CAPTIONS = [
  "Phone stayed in the other room.",
  "Small session, big mood.",
  "Thumb is free, mind is quiet.",
  "Did it before breakfast.",
  "Almost skipped it. Glad I did not.",
];

const MOODS: { label: string; Icon: LucideIcon }[] = [
  { label: "Rough", Icon: Frown },
  { label: "Meh", Icon: Meh },
  { label: "Good", Icon: Smile },
  { label: "Great", Icon: SmilePlus },
  { label: "Amazing", Icon: Laugh },
];

const INITIAL_TIMER: TimerState = {
  status: "idle",
  totalSeconds: 900,
  remainingSeconds: 900,
  startedAt: null,
  completedStepIds: [],
};

/* =====================================================
   Helpers
   ===================================================== */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function formatMMSS(seconds: number) {
  const t = Math.max(0, Math.round(seconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHrs(minutes: number) {
  return `${(minutes / 60).toFixed(1)} hrs`;
}

function formatMinsToHM(minutes: number) {
  const r = Math.round(minutes);
  const h = Math.floor(r / 60);
  const m = r % 60;
  return `${h}h ${m}m`;
}

function sortBoard(rows: LeaderRow[]) {
  return [...rows].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes || b.streak - a.streak);
}

function rankOf(rows: LeaderRow[], id: string) {
  return sortBoard(rows).findIndex((r) => r.id === id) + 1;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timeAgoLabel(item: FeedItem) {
  if (!item.at) return item.timeAgo;
  const mins = Math.max(0, Math.floor((Date.now() - item.at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/* ---------- Persistence (localStorage) ---------- */

const STORAGE_KEY = "still:v1";
const MAX_FEED = 40;

type Snapshot = {
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
};

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string";
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);
const TIMER_STATUSES: TimerStatus[] = ["idle", "arming", "running", "paused", "completing", "celebrating"];

/** Reads and validates the saved state. Anything malformed is ignored so bad data can never brick the app. */
function loadSnapshot(): Snapshot | null {
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
    return ok ? (s as Snapshot) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(snap: Snapshot) {
  try {
    const json = JSON.stringify(snap);
    if (window.localStorage.getItem(STORAGE_KEY) === json) return; // nothing changed (e.g. a running timer ticking)
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* storage full or blocked (private mode): the app keeps working, it just won't persist */
  }
}

/** States that only make sense while the app is open are turned into something safe to resume. */
function normalizeTimer(t: TimerState): TimerState {
  if (t.status === "arming") return { ...t, status: "idle", remainingSeconds: t.totalSeconds, startedAt: null };
  if (t.status === "celebrating") return { ...INITIAL_TIMER, completedStepIds: [] };
  if (t.status === "running" && t.startedAt === null) return { ...t, status: "paused" };
  return t;
}

/** A fresh weekly board: friends keep their (mock) totals, the player starts at zero. */
function freshBoard(myStreak: number): LeaderRow[] {
  return SEED_LEADERBOARD.map((r) => (r.isMe ? { ...r, weeklyMinutes: 0, streak: myStreak } : r));
}

function toHobby(entry: CatalogEntry, matchReason: string, matchScore: number): Hobby {
  const { interests: _i, cost: _c, social: _s, quick: _q, ...rest } = entry;
  void _i;
  void _c;
  void _s;
  void _q;
  return { ...rest, matchReason, matchScore };
}

function buildReason(entry: CatalogEntry, hits: string[], a: Answers) {
  const labels = hits.map((h) => INTERESTS.find((i) => i.id === h)?.label.toLowerCase() ?? h);
  const lead = labels.length ? `You picked ${labels.join(" + ")}` : "A fresh pick to stretch your usual taste";
  let tail = "fits into 15 minutes";
  if (entry.cost === 0) tail = "costs ₹0 to start";
  else if (a.time === "10 min a day") tail = "fits your 10-minute window";
  else if (a.social === "Solo") tail = "works well solo";
  else if (a.social === "With a friend" && entry.social !== "solo") tail = "pairs well with a friend";
  return `${lead}, and it ${tail}.`;
}

function scoreCatalog(a: Answers): Hobby[] {
  const maxCost = a.budget === "Free" ? 0 : a.budget === "Under ₹500" ? 1 : 2;
  return CATALOG.map((entry, i) => {
    const hits = entry.interests.filter((x) => a.interests.includes(x));
    let s = 48 + Math.min(hits.length, 2) * 20;
    s += entry.cost <= maxCost ? 8 : -8;
    const socialOk =
      a.social === "Mix of both" ||
      a.social === "" ||
      (a.social === "Solo" && entry.social !== "friend") ||
      (a.social === "With a friend" && entry.social !== "solo");
    s += socialOk ? 6 : -4;
    if (a.time === "10 min a day" && entry.quick) s += 4;
    if (a.time === "30–60 min a day" && !entry.quick) s += 3;
    s -= i * 0.1;
    return { entry, hits, score: clamp(s, 58, 98) };
  })
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map(({ entry, hits, score }) => toHobby(entry, buildReason(entry, hits, a), Math.round(score)));
}

function useLater() {
  const ids = useRef<Set<number>>(new Set());
  useEffect(() => {
    const set = ids.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
    return id;
  }, []);
}

function useCountUp(from: number, to: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to, duration]);
  return active ? value : from;
}

/* =====================================================
   Small UI Primitives
   ===================================================== */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
};

function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    ghost: "text-stone-600 hover:bg-stone-100",
    danger: "border-2 border-rose-500 bg-white text-rose-600 hover:bg-rose-50",
    soft: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  };
  const sizes = {
    sm: "min-h-11 px-3 text-sm",
    md: "min-h-12 px-5 text-sm",
    lg: "min-h-14 px-6 text-base",
    icon: "size-11",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        FOCUS,
        RM,
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-shadow hover:shadow-md",
        RM,
        className,
      )}
      {...props}
    />
  );
}

function Badge({
  tone = "stone",
  className,
  children,
}: {
  tone?: "stone" | "emerald" | "amber" | "rose";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function Progress({
  value,
  label,
  className,
  barClassName,
}: {
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const v = clamp(value, 0, 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cx("h-2 w-full overflow-hidden rounded-full bg-stone-200", className)}
    >
      <div
        className={cx("h-full rounded-full bg-emerald-500 transition-all duration-500", RM, barClassName)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function Avatar({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl", className)}
    >
      {emoji}
    </span>
  );
}

function Ring({
  size,
  stroke,
  progress,
  className,
  label,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  className?: string;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(progress, 0, 1);
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke="currentColor" className="text-stone-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cx("transition-[stroke-dashoffset,color] duration-1000 ease-linear", RM, className)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function Sheet({
  open,
  onClose,
  title,
  dismissible = true,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  dismissible?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end">
      <button
        type="button"
        aria-label="Close sheet"
        tabIndex={-1}
        onClick={dismissible ? onClose : undefined}
        className={cx("absolute inset-0 bg-stone-900/40 animate-in fade-in duration-200", RM)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative max-h-[88%] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(2rem_+_env(safe-area-inset-bottom))] shadow-2xl outline-none animate-in slide-in-from-bottom duration-300 [&::-webkit-scrollbar]:hidden",
          RM,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200" />
        {children}
      </div>
    </div>
  );
}

function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6">
      <div className={cx("absolute inset-0 bg-stone-900/50 animate-in fade-in duration-200", RM)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={cx("relative w-full rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 fade-in duration-200", RM)}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  cta,
  onClick,
}: {
  title: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="flex size-28 items-center justify-center rounded-full bg-emerald-100">
          <div className="flex size-20 items-center justify-center rounded-full bg-emerald-200">
            <Compass className="size-10 text-emerald-700" aria-hidden="true" />
          </div>
        </div>
        <Sparkles className={cx("absolute -right-1 top-1 size-6 text-amber-500 animate-pulse", RM)} aria-hidden="true" />
      </div>
      <p className="text-lg font-bold tracking-tight text-stone-900 text-balance">{title}</p>
      <Button size="lg" className="mt-6 w-full" onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}

function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "transition-all duration-500",
        RM,
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* =====================================================
   Tab: Quiz
   ===================================================== */

function GeneratingView({ onDone }: { onDone: () => void }) {
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

function GeminiCustomHobbySection({ onHobbyCreated }: { onHobbyCreated: (h: Hobby) => void }) {
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
    } catch (err: any) {
      setError(err.message || "Failed to contact Gemini");
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

function QuizTab({
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

function OptionCard({
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

/* =====================================================
   Tab: Coach
   ===================================================== */

function BreathingCircle() {
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

function GeminiCoachCard({ hobby, currentStreak }: { hobby: Hobby; currentStreak: number }) {
  const [query, setQuery] = useState("");
  const [advice, setAdvice] = useState<string | null>(null);
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
      const data = await res.json();
      if (data.advice) {
        setAdvice(data.advice);
        setQuery("");
      }
    } catch {
      setAdvice("Take a steady breath, eliminate distractions, and enjoy the process.");
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
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-stone-800 italic animate-in fade-in">
          “{advice}”
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

function CoachTab({
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

/* =====================================================
   Tab: Tracker
   ===================================================== */

function ringColor(elapsedRatio: number) {
  if (elapsedRatio < 0.25) return "text-rose-400";
  if (elapsedRatio < 0.5) return "text-amber-400";
  if (elapsedRatio < 0.75) return "text-lime-500";
  return "text-emerald-500";
}

function HoldButton({ onComplete }: { onComplete: () => void }) {
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

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function TrackerTab({
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

function ReflectionSheet({
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

const CONFETTI_COLORS = ["bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-sky-400", "bg-lime-400"];

function CelebrationOverlay({
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

/* =====================================================
   Tab: Arena
   ===================================================== */

const ROW_H = 56;

function ReactionBar({
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

function FloatPlus() {
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

function FeedCard({ item, onReact }: { item: FeedItem; onReact: (emoji: string) => void }) {
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

function ArenaTab({
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
                      active ? "ring-2 ring-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]" : "ring-2 ring-stone-300",
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

/* =====================================================
   App
   ===================================================== */

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
    const hobbyId = snap.selectedHobbyId && CATALOG_BY_ID[snap.selectedHobbyId] ? snap.selectedHobbyId : null;
    const restoredMatches = snap.matches.flatMap((m) => {
      const entry = CATALOG_BY_ID[m.id];
      return entry && isStr(m.matchReason) && isNum(m.matchScore) ? [toHobby(entry, m.matchReason, m.matchScore)] : [];
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
    let sentinel: any = null;
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
