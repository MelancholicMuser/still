import test from "node:test";
import assert from "node:assert/strict";
import { dayNumber, keyFromDayNumber, weekStart, weekResetLabel, rollStreak } from "../lib/streak.ts";

const base = { current: 11, best: 21, todayDone: false, freezes: 1, lastDone: "2026-10-08" };

test("day numbers round-trip and are consecutive across month/year/DST boundaries", () => {
  for (const k of ["2026-10-09", "2026-12-31", "2027-01-01", "2026-03-29", "2026-10-25", "2028-02-29"]) {
    assert.equal(keyFromDayNumber(dayNumber(k)), k);
  }
  assert.equal(dayNumber("2027-01-01") - dayNumber("2026-12-31"), 1);
  assert.equal(dayNumber("2028-03-01") - dayNumber("2028-02-29"), 1);
});

test("weekStart is the Monday of that week", () => {
  // 2026-10-09 is a Friday → Monday is 2026-10-05
  assert.equal(keyFromDayNumber(weekStart("2026-10-09")), "2026-10-05");
  assert.equal(keyFromDayNumber(weekStart("2026-10-05")), "2026-10-05"); // Monday itself
  assert.equal(keyFromDayNumber(weekStart("2026-10-11")), "2026-10-05"); // Sunday
  assert.equal(keyFromDayNumber(weekStart("2026-10-12")), "2026-10-12"); // next Monday
});

test("same day leaves the streak alone (including todayDone)", () => {
  const done = { ...base, lastDone: "2026-10-09", todayDone: true };
  assert.deepEqual(rollStreak(done, "2026-10-09"), done);
});

test("next day continues the streak and re-opens today", () => {
  const r = rollStreak({ ...base, todayDone: true }, "2026-10-09");
  assert.equal(r.current, 11);
  assert.equal(r.todayDone, false);
  assert.equal(r.freezes, 1);
});

test("one missed day spends a freeze and keeps the streak", () => {
  const r = rollStreak(base, "2026-10-10");
  assert.equal(r.current, 11);
  assert.equal(r.freezes, 0);
  assert.equal(r.lastDone, "2026-10-09"); // the frozen day is bridged
});

test("missing more days than freezes resets the streak but keeps best", () => {
  const r = rollStreak(base, "2026-10-12"); // missed 3, have 1
  assert.equal(r.current, 0);
  assert.equal(r.best, 21);
  assert.equal(r.freezes, 1); // nothing spent when it breaks anyway
});

test("a broken streak stays broken on later days", () => {
  const broken = rollStreak(base, "2026-10-12");
  assert.equal(rollStreak(broken, "2026-10-13").current, 0);
});

test("weekResetLabel counts down to Monday 00:00", () => {
  // Friday 2026-10-09 20:00 local → 2d 4h until Monday
  assert.equal(weekResetLabel(new Date(2026, 9, 9, 20, 0, 0)), "2d 4h");
  // Sunday 23:00 → 0d 1h
  assert.equal(weekResetLabel(new Date(2026, 9, 11, 23, 0, 0)), "0d 1h");
  // Monday morning → ~6d
  assert.match(weekResetLabel(new Date(2026, 9, 12, 8, 0, 0)), /^6d 16h$/);
});
