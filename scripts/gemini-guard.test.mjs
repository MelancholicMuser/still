import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanText,
  cleanInt,
  extractJson,
  validateHobby,
  cleanAdvice,
  createRateLimiter,
  clientIp,
  isSameOrigin,
} from "../lib/gemini-guard.ts";

const hdr = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });

test("cleanText strips control chars, collapses whitespace and caps length", () => {
  assert.equal(cleanText("  hello\n\n\tworld\u0000  ", 50), "hello world");
  assert.equal(cleanText("x".repeat(500), 10), "xxxxxxxxxx");
  assert.equal(cleanText({ a: 1 }, 10), "");
  assert.equal(cleanText(undefined, 10), "");
});

test("cleanInt clamps and falls back", () => {
  assert.equal(cleanInt("7", 0, 100, 1), 7);
  assert.equal(cleanInt(-5, 0, 100, 1), 0);
  assert.equal(cleanInt(1e9, 0, 100, 1), 100);
  assert.equal(cleanInt("abc", 0, 100, 1), 1);
  assert.equal(cleanInt(3.9, 0, 100, 1), 3);
});

test("extractJson handles fences, chatter and garbage", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! Here you go: {"a":1} Enjoy'), { a: 1 });
  assert.equal(extractJson("no json here"), null);
  assert.equal(extractJson("{broken"), null);
});

const good = {
  name: "Pocket Sketching",
  emoji: "✏️",
  category: "Art",
  blurb: "Fill one page with quick sketches.",
  matchReason: "You like drawing",
  matchScore: 95,
  blueprint: {
    title: "Today's 15-Minute Blueprint",
    minutes: 99,
    steps: [{ id: "evil", text: "Set up, 3 min" }, { text: "Outline, 4 min" }, { text: "Shade, 5 min" }, { text: "Wrap up, 3 min" }],
    materials: ["Pencil, ₹0"],
  },
};

test("validateHobby normalises a good hobby and forces structural fields", () => {
  const h = validateHobby(good, "abc");
  assert.ok(h);
  assert.equal(h.id, "pocket-sketching-abc");
  assert.equal(h.blueprint.minutes, 15);
  assert.deepEqual(h.blueprint.steps.map((s) => s.id), ["step-1", "step-2", "step-3", "step-4"]);
  assert.equal(h.emoji, "✏️");
});

test("validateHobby rejects unusable shapes", () => {
  assert.equal(validateHobby(null), null);
  assert.equal(validateHobby({}), null);
  assert.equal(validateHobby({ ...good, name: "" }), null);
  assert.equal(validateHobby({ ...good, blueprint: { ...good.blueprint, steps: [{ text: "only one" }] } }), null);
  assert.equal(validateHobby({ ...good, blueprint: "nope" }), null);
});

test("validateHobby clamps score, defaults emoji, trims oversized fields", () => {
  const h = validateHobby({ ...good, emoji: "not an emoji", matchScore: 5000, blurb: "b".repeat(999) }, "x");
  assert.equal(h.emoji, "✨");
  assert.equal(h.matchScore, 100);
  assert.equal(h.blurb.length, 200);
  assert.equal(validateHobby({ ...good, matchScore: "nan" }, "x").matchScore, 90);
});

test("validateHobby caps steps at 6 and materials at 6", () => {
  const steps = Array.from({ length: 12 }, (_, i) => ({ text: `step ${i}` }));
  const materials = Array.from({ length: 12 }, (_, i) => `m${i}`);
  const h = validateHobby({ ...good, blueprint: { ...good.blueprint, steps, materials } }, "x");
  assert.equal(h.blueprint.steps.length, 6);
  assert.equal(h.blueprint.materials.length, 6);
});

test("cleanAdvice strips quotes/markdown and falls back when empty", () => {
  assert.equal(cleanAdvice('"**Breathe** in. `Slow` down."', "fb"), "Breathe in. Slow down.");
  assert.equal(cleanAdvice("", "fb"), "fb");
  assert.equal(cleanAdvice(undefined, "fb"), "fb");
});

test("rate limiter enforces each window and recovers", () => {
  const rl = createRateLimiter([{ limit: 2, windowMs: 1000 }, { limit: 3, windowMs: 10_000 }]);
  assert.ok(rl.check("a", 0).ok);
  assert.ok(rl.check("a", 100).ok);
  const blocked = rl.check("a", 200);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSec, 1);
  assert.ok(rl.check("b", 200).ok); // other keys unaffected
  assert.ok(rl.check("a", 1200).ok); // short window recovered (3rd hit overall)
  assert.equal(rl.check("a", 1300).ok, false); // long window: 3 hits in 10s
  assert.ok(rl.check("a", 10_500).ok); // everything aged out
});

test("clientIp and isSameOrigin", () => {
  assert.equal(clientIp(hdr({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIp(hdr({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
  assert.equal(clientIp(hdr({})), "unknown");
  assert.equal(isSameOrigin(hdr({ host: "still.app", origin: "https://still.app" })), true);
  assert.equal(isSameOrigin(hdr({ host: "still.app", origin: "https://evil.com" })), false);
  assert.equal(isSameOrigin(hdr({ host: "still.app" })), true);
  assert.equal(isSameOrigin(hdr({ host: "still.app", origin: "not a url" })), false);
});
