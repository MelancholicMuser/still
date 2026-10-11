import { type LeaderRow, type FeedItem } from "@/lib/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function formatMMSS(seconds: number) {
  const t = Math.max(0, Math.round(seconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHrs(minutes: number) {
  return `${(minutes / 60).toFixed(1)} hrs`;
}

export function formatMinsToHM(minutes: number) {
  const r = Math.round(minutes);
  const h = Math.floor(r / 60);
  const m = r % 60;
  return `${h}h ${m}m`;
}

export function sortBoard(rows: LeaderRow[]) {
  return [...rows].sort((a, b) => b.weeklyMinutes - a.weeklyMinutes || b.streak - a.streak);
}

export function rankOf(rows: LeaderRow[], id: string) {
  return sortBoard(rows).findIndex((r) => r.id === id) + 1;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function timeAgoLabel(item: FeedItem) {
  if (!item.at) return item.timeAgo;
  const mins = Math.max(0, Math.floor((Date.now() - item.at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}
