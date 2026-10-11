import { type Hobby, type CatalogEntry, type Answers } from "@/lib/types";
import { INTERESTS, CATALOG } from "@/lib/data";
import { clamp } from "@/lib/helpers";

export function toHobby(entry: CatalogEntry, matchReason: string, matchScore: number): Hobby {
  const { interests: _i, cost: _c, social: _s, quick: _q, ...rest } = entry;
  void _i;
  void _c;
  void _s;
  void _q;
  return { ...rest, matchReason, matchScore };
}

export function buildReason(entry: CatalogEntry, hits: string[], a: Answers) {
  const labels = hits.map((h) => INTERESTS.find((i) => i.id === h)?.label.toLowerCase() ?? h);
  const lead = labels.length ? `You picked ${labels.join(" + ")}` : "A fresh pick to stretch your usual taste";
  let tail = "fits into 15 minutes";
  if (entry.cost === 0) tail = "costs ₹0 to start";
  else if (a.time === "10 min a day") tail = "fits your 10-minute window";
  else if (a.social === "Solo") tail = "works well solo";
  else if (a.social === "With a friend" && entry.social !== "solo") tail = "pairs well with a friend";
  return `${lead}, and it ${tail}.`;
}

export function scoreCatalog(a: Answers): Hobby[] {
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
