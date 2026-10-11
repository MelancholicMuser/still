/**
 * Guards for the /api/gemini route. Pure functions (no framework imports) so they
 * can be unit tested with `pnpm test` (see scripts/gemini-guard.test.mjs).
 *
 * Three jobs:
 *  1. sanitize anything the client sends before it reaches the model,
 *  2. validate and normalise anything the model sends back before it reaches the client,
 *  3. rate limit callers so the endpoint cannot be used to burn the API quota.
 */

/* ---------- 1. Input sanitising ---------- */

export const LIMITS = {
  body: 4_000, // bytes of JSON accepted by the route
  hobbyPrompt: 200,
  coachPrompt: 300,
  hobbyName: 80,
  stepText: 200,
  streak: 100_000,
} as const;

/** Trim, drop control characters, collapse whitespace and cap the length. Non-strings become "". */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanInt(input: unknown, min: number, max: number, fallback: number): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/* ---------- 2. Output validation ---------- */

export type GeneratedHobby = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  blurb: string;
  matchReason: string;
  matchScore: number;
  blueprint: { title: string; minutes: 15; steps: { id: string; text: string }[]; materials: string[] };
};

/** Models sometimes wrap JSON in ```json fences or add a sentence around it. */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const asRecord = (x: unknown): Record<string, unknown> | null =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;

/** First emoji-ish cluster of the string, or a safe default. */
function pickEmoji(x: unknown): string {
  const s = cleanText(x, 16);
  const match = s.match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u);
  return match ? match[0] : "✨";
}

/**
 * Turns whatever the model returned into a Hobby the client can trust, or null if it is unusable.
 * Structural fields are forced (step ids, 15 minutes, a slug id) rather than trusted.
 */
export function validateHobby(raw: unknown, idSuffix: string = Date.now().toString(36)): GeneratedHobby | null {
  const h = asRecord(raw);
  const bp = asRecord(h?.blueprint);
  if (!h || !bp) return null;

  const name = cleanText(h.name, 60);
  const blurb = cleanText(h.blurb, 200);
  if (!name || !blurb) return null;

  const stepsRaw = Array.isArray(bp.steps) ? bp.steps : [];
  const steps = stepsRaw
    .map((s) => cleanText(typeof s === "string" ? s : asRecord(s)?.text, 140))
    .filter(Boolean)
    .slice(0, 6)
    .map((text, i) => ({ id: `step-${i + 1}`, text }));
  if (steps.length < 3) return null;

  const materialsRaw = Array.isArray(bp.materials) ? bp.materials : [];
  const materials = materialsRaw
    .map((m) => cleanText(m, 60))
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: `${slugify(name) || "custom"}-${idSuffix}`,
    name,
    emoji: pickEmoji(h.emoji),
    category: cleanText(h.category, 24) || "Mind",
    blurb,
    matchReason: cleanText(h.matchReason, 200) || "Designed from your prompt",
    matchScore: cleanInt(h.matchScore, 60, 100, 90),
    blueprint: {
      title: cleanText(bp.title, 60) || "Today's 15-Minute Blueprint",
      minutes: 15,
      steps,
      materials: materials.length ? materials : ["Nothing special, ₹0"],
    },
  };
}

/** Coach tips are shown inside quotes in the UI, so strip quotes/markdown and cap the length. */
export function cleanAdvice(raw: unknown, fallback: string): string {
  const s = cleanText(raw, 400).replace(/^["“”']+|["“”']+$/g, "").replace(/[*_`#>]/g, "").trim();
  return s || fallback;
}

/* ---------- 3. Rate limiting ---------- */

type Bucket = { hits: number[] };

/**
 * Sliding-window limiter held in memory.
 *
 * Good enough to stop casual abuse on a single server. On serverless hosts such as Vercel each
 * instance has its own memory, so for a hard guarantee swap this for a shared store
 * (Upstash Redis, Vercel KV) behind the same `check` signature.
 */
export function createRateLimiter(rules: { limit: number; windowMs: number }[], maxKeys = 5_000) {
  const buckets = new Map<string, Bucket>();
  const longest = Math.max(...rules.map((r) => r.windowMs));

  function sweep(now: number) {
    for (const [key, b] of buckets) {
      b.hits = b.hits.filter((t) => now - t < longest);
      if (b.hits.length === 0) buckets.delete(key);
    }
  }

  return {
    /** Records a hit for `key`. Returns { ok: true } or { ok: false, retryAfterSec }. */
    check(key: string, now: number = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
      if (buckets.size > maxKeys) sweep(now);
      const b = buckets.get(key) ?? { hits: [] };
      b.hits = b.hits.filter((t) => now - t < longest);

      for (const { limit, windowMs } of rules) {
        const inWindow = b.hits.filter((t) => now - t < windowMs);
        if (inWindow.length >= limit) {
          const retryAfterSec = Math.max(1, Math.ceil((inWindow[0] + windowMs - now) / 1000));
          buckets.set(key, b);
          return { ok: false, retryAfterSec };
        }
      }
      b.hits.push(now);
      buckets.set(key, b);
      return { ok: true };
    },
  };
}

/** Best-effort client IP. On Vercel `x-forwarded-for` is set by the platform. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Browsers always send Origin on cross-site POSTs; reject when it does not match our host. */
export function isSameOrigin(headers: { get(name: string): string | null }): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin fetches and non-browser clients; the rate limit still applies
  const host = headers.get("x-forwarded-host") || headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
