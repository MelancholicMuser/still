

export type TabId = "quiz" | "coach" | "tracker" | "arena";

export type TimerStatus = "idle" | "arming" | "running" | "paused" | "completing" | "celebrating";

export type Hobby = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  blurb: string;
  matchReason: string;
  matchScore: number;
  blueprint: { title: string; minutes: 15; steps: { id: string; text: string }[]; materials: string[] };
};

export type CatalogEntry = Omit<Hobby, "matchReason" | "matchScore"> & {
  interests: string[];
  cost: 0 | 1 | 2;
  social: "solo" | "friend" | "both";
  quick: boolean;
};

export type Answers = { interests: string[]; time: string; budget: string; social: string };

export type TimerState = {
  status: TimerStatus;
  totalSeconds: number;
  remainingSeconds: number;
  startedAt: number | null;
  completedStepIds: string[];
};

export type LeaderRow = { id: string; name: string; avatar: string; weeklyMinutes: number; streak: number; isMe?: boolean };

export type FeedItem = {
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

export type RankChange = { from: number; to: number };

export type Celebration = {
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

export type Toast = { id: number; text: string };
