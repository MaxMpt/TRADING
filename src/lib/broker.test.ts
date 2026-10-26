import assert from "node:assert/strict";
import test from "node:test";
import { agentLossesToday, brackets, decide, sizeOrder, tradePnl } from "./broker.ts";
test("four agent losses in one Moscow day stop the count at four", () => {
  const day = Date.parse("2026-10-26T10:00:00+03:00");
  const closed = [
    { via: "agent", pnl: -10, closedAt: day },
    { via: "agent", pnl: -2, closedAt: day + 1000 },
    { via: "hand", pnl: -50, closedAt: day },
    { via: "agent", pnl: 20, closedAt: day },
    { via: "agent", pnl: -1, closedAt: day - 86_400_000 },
  ];
  assert.equal(agentLossesToday(closed, day + 60_000), 2);
});


test("short take-profit is three times the stop distance", () => {
  const { stop, target } = brackets("short", 6000, 0.6);
  const risk = stop - 6000;
  const reward = 6000 - target;
  assert.ok(Math.abs(reward / risk - 3) < 0.001);
});

test("round trip commission is deducted from pnl", () => {
  const result = tradePnl("short", 10, 1000, 970, 0.05);
  const gross = (1000 - 970) * 10;
  const fees = 1000 * 10 * 0.0005 + 970 * 10 * 0.0005;
  assert.ok(Math.abs(result.pnl - (gross - fees)) < 0.001);
  assert.ok(result.pnl > 0);
});

test("size respects lot and capital room", () => {
  const sized = sizeOrder({
    cash: 1_000_000,
    reserved: 900_000,
    capital: 1_000_000,
    sizePct: 20,
    price: 6000,
    lot: 1,
    commissionPct: 0.05,
  });
  assert.ok("qty" in sized);
  if ("qty" in sized) {
    assert.equal(sized.qty, 16);
    assert.ok(sized.amount <= 100_000);
  }
});

test("fractional crypto lot still fits a small budget", () => {
  const sized = sizeOrder({
    cash: 1_000_000,
    reserved: 0,
    capital: 1_000_000,
    sizePct: 1,
    price: 100_000,
    lot: 0.001,
    commissionPct: 0.05,
  });
  assert.ok("qty" in sized);
  if ("qty" in sized) {
    assert.equal(sized.qty, 0.1);
    assert.ok(Math.abs(sized.amount - 10_000) < 1);
  }
});

test("agent opens a short only after confirmation when the call is short", () => {
  const base = {
    inPosition: false,
    side: null,
    stop: 0,
    target: 0,
    bid: 100,
    ask: 100.1,
    last: 100,
    agentOn: true,
    session: true,
    call: "short" as const,
    bias: null,
    streakSide: null as "short" | null,
    streakN: 0,
  };
  const first = decide({ ...base, score: -60 });
  assert.equal(first.intent.type, "none");
  const second = decide({ ...base, score: -62, streakSide: first.streakSide, streakN: first.streakN });
  assert.deepEqual(second.intent, { type: "open", side: "short" });
});

test("closed session does not open", () => {
  const decision = decide({
    inPosition: false,
    side: null,
    stop: 0,
    target: 0,
    bid: 100,
    ask: 100.1,
    last: 100,
    agentOn: true,
    session: false,
    call: "short",
    score: -90,
    bias: null,
    streakSide: "short",
    streakN: 3,
  });
  assert.equal(decision.intent.type, "none");
  assert.equal(decision.streakN, 0);
});
