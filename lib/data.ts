import {
  Brain,
  ChefHat,
  Dumbbell,
  Frown,
  Hammer,
  Laugh,
  Meh,
  Music,
  Palette,
  PenLine,
  Shuffle,
  Smile,
  SmilePlus,
  Trees,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type Hobby, type CatalogEntry, type Answers, type TimerState, type LeaderRow, type FeedItem } from "@/lib/types";

export const REACTION_KEYS = ["🔥", "👏", "💪", "😮"];

export const INTERESTS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "music", label: "Music", Icon: Music },
  { id: "art", label: "Art", Icon: Palette },
  { id: "movement", label: "Movement", Icon: Dumbbell },
  { id: "outdoors", label: "Outdoors", Icon: Trees },
  { id: "building", label: "Building", Icon: Hammer },
  { id: "writing", label: "Writing", Icon: PenLine },
  { id: "cooking", label: "Cooking", Icon: ChefHat },
  { id: "mind", label: "Mind", Icon: Brain },
];

export const TIME_OPTIONS = ["10 min a day", "15–30 min a day", "30–60 min a day", "Weekends only"];

export const BUDGET_OPTIONS = ["Free", "Under ₹500", "₹500–2000", "I'm flexible"];

export const SOCIAL_OPTIONS: { label: string; Icon: LucideIcon; sub: string }[] = [
  { label: "Solo", Icon: User, sub: "Just me and the hobby" },
  { label: "With a friend", Icon: Users, sub: "Better with company" },
  { label: "Mix of both", Icon: Shuffle, sub: "Depends on the day" },
];

export const EMPTY_ANSWERS: Answers = { interests: [], time: "", budget: "", social: "" };

export const bp = (id: string, title: string, steps: string[], materials: string[]): Hobby["blueprint"] => ({
  title,
  minutes: 15,
  steps: steps.map((text, i) => ({ id: `${id}-s${i + 1}`, text })),
  materials,
});

export const CATALOG: CatalogEntry[] = [
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

export const CATALOG_BY_ID: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));

export const SEED_LEADERBOARD: LeaderRow[] = [
  { id: "maya", name: "Maya", avatar: "🦊", weeklyMinutes: 210, streak: 18 },
  { id: "rohan", name: "Rohan", avatar: "🐻", weeklyMinutes: 158, streak: 9 },
  { id: "me", name: "You", avatar: "🎸", weeklyMinutes: 150, streak: 11, isMe: true },
  { id: "priya", name: "Priya", avatar: "🦉", weeklyMinutes: 120, streak: 5 },
  { id: "kabir", name: "Kabir", avatar: "🐯", weeklyMinutes: 80, streak: 3 },
  { id: "ananya", name: "Ananya", avatar: "🐼", weeklyMinutes: 35, streak: 0 },
];

export const BASE_RANK: Record<string, number> = Object.fromEntries(SEED_LEADERBOARD.map((r, i) => [r.id, i + 1]));

export const SEED_ACTIVE_TODAY = ["maya", "rohan", "priya", "kabir"];

export const zeroReactions = (): Record<string, number> => ({ "🔥": 0, "👏": 0, "💪": 0, "😮": 0 });

export const SEED_FEED: FeedItem[] = [
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
export const SEED_FEED_AGE_MIN: Record<string, number> = {
  "seed-1": 12,
  "seed-2": 48,
  "seed-3": 120,
  "seed-4": 180,
  "seed-5": 1500,
};

export const SIM_CAPTIONS = [
  "Phone stayed in the other room.",
  "Small session, big mood.",
  "Thumb is free, mind is quiet.",
  "Did it before breakfast.",
  "Almost skipped it. Glad I did not.",
];

export const MOODS: { label: string; Icon: LucideIcon }[] = [
  { label: "Rough", Icon: Frown },
  { label: "Meh", Icon: Meh },
  { label: "Good", Icon: Smile },
  { label: "Great", Icon: SmilePlus },
  { label: "Amazing", Icon: Laugh },
];

export const INITIAL_TIMER: TimerState = {
  status: "idle",
  totalSeconds: 900,
  remainingSeconds: 900,
  startedAt: null,
  completedStepIds: [],
};
