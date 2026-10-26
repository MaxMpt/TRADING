import assert from "node:assert/strict";
import test from "node:test";
import { findSetup, stageOf, withEntry, type Bar } from "./playbook.ts";

function rise(n: number, start: number, end: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const c = start + ((end - start) * i) / (n - 1);
    out.push({ h: c + 0.4, l: c - 0.4, c, v: 100 });
  }
  return out;
}

test("rising year qualifies as stage two", () => {
  const stage = stageOf(rise(260, 100, 220));
  assert.equal(stage.side, "long");
  assert.ok(stage.aboveLow >= 0.3);
  assert.ok(stage.offHigh <= 0.25);
});

test("false break without a falling stage is not a short", () => {
  const daily = rise(40, 100, 110);
  const intra: Bar[] = [
    { h: 104, l: 101, c: 103 },
    { h: 107, l: 103, c: 104 },
    { h: 104, l: 101.5, c: 102.4 },
    { h: 103, l: 101, c: 102 },
  ];
  const played = findSetup({
    daily,
    intra,
    price: 102,
    levelHigh: 105,
    levelLow: 96,
    volRatio: 1,
  });
  assert.equal(played.stage.side, "flat");
  assert.equal(played.setup, null);
});

function fall(n: number, start: number, end: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const c = start + ((end - start) * i) / (n - 1);
    out.push({ h: c + 0.4, l: c - 0.4, c, v: 100 });
  }
  return out;
}

test("a real failed break in a falling stage still plans three to one", () => {
  const daily = fall(260, 220, 100);
  const intra: Bar[] = [
    { h: 100.2, l: 99.2, c: 99.6 },
    { h: 102.2, l: 99.4, c: 100.2 },
    { h: 100.4, l: 98.6, c: 99.2 },
    { h: 99.6, l: 98.2, c: 98.8 },
  ];
  const played = findSetup({
    daily,
    intra,
    price: 98.8,
    levelHigh: 101,
    levelLow: 90,
    volRatio: 1,
  });
  assert.equal(played.stage.side, "short");
  assert.equal(played.setup?.side, "short");
  assert.equal(played.setup?.model, "ложный пробой");
  const plan = played.setup ? withEntry("short", 98.8, played.setup.stop) : null;
  assert.ok(plan);
  if (plan) {
    const risk = plan.stop - 98.8;
    const reward = 98.8 - plan.target;
    assert.ok(risk / 98.8 >= 0.01);
    assert.ok(Math.abs(reward / risk - 3) < 0.001);
  }
});

test("stop inside one percent is refused", () => {
  assert.equal(withEntry("short", 57.34, 57.5), null);
});

test("stop wider than eight percent is refused", () => {
  assert.equal(withEntry("long", 100, 90), null);
});
