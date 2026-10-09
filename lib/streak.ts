/**
 * Date and streak helpers. Pure functions only, so they can be unit tested
 * (see scripts/streak.test.mjs) and reused without React.
 *
 * Days are identified by a local-time key "YYYY-MM-DD". A "day number" is the
 * count of whole days since 1970-01-01 for that calendar date; it is built from
 * UTC parts so DST changes can never skip or repeat a day.
 */

export type Streak = {
  current: number;
  best: number;
  todayDone: boolean;
  freezes: number;
  /** Local day key of the last day a session was completed (or bridged by a freeze). */
  lastDone: string | null;
};

const DAY_MS = 86_400_000;
const pad2 = (n: number) => String(n).padStart(2, "0");

export const dayKeyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayKey = () => dayKeyOf(new Date());

export function dayNumber(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS);
}

export function keyFromDayNumber(n: number) {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Day number of the Monday that starts the week containing `key`. */
export function weekStart(key: string) {
  const n = dayNumber(key);
  const mondayFirstWeekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  return n - mondayFirstWeekday;
}

/** "2d 4h" until the next Monday 00:00 (local time), when the weekly board resets. */
export function weekResetLabel(now: Date = new Date()) {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + (7 - ((now.getDay() + 6) % 7)));
  const ms = Math.max(0, next.getTime() - now.getTime());
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / 3_600_000);
  return `${d}d ${h}h`;
}

/**
 * Bring a streak up to date for `today`.
 * - Same day: unchanged.
 * - Yesterday was the last completed day: streak carries on, today is open again.
 * - Missed N days: each missed day spends one freeze; if there are not enough
 *   freezes the streak resets to 0 (best is kept).
 */
export function rollStreak(s: Streak, today: string): Streak {
  if (!s.lastDone) return { ...s, todayDone: false };
  const todayN = dayNumber(today);
  const gap = todayN - dayNumber(s.lastDone);
  if (gap <= 0) return s; // same day (or the clock moved backwards)
  if (s.current <= 0) return { ...s, todayDone: false };
  const missed = gap - 1;
  if (missed === 0) return { ...s, todayDone: false };
  if (missed <= s.freezes) {
    return { ...s, todayDone: false, freezes: s.freezes - missed, lastDone: keyFromDayNumber(todayN - 1) };
  }
  return { ...s, todayDone: false, current: 0 };
}
