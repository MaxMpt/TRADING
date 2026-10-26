export type Side = "long" | "short";

export type Bar = { h: number; l: number; c: number; v?: number };

export type Stage = {
  side: Side | "flat";
  reason: string;
  aboveLow: number;
  offHigh: number;
  slope: number;
};

export type Setup = {
  side: Side;
  stop: number;
  model: "ложный пробой" | "сжатие";
};

export function sma(values: number[], period: number, end = values.length): number | null {
  if (period < 1 || end < period || end > values.length) return null;
  let sum = 0;
  for (let i = end - period; i < end; i++) sum += values[i] ?? 0;
  return sum / period;
}

export function stageOf(daily: Bar[]): Stage {
  const closes = daily.map((bar) => bar.c);
  const empty: Stage = { side: "flat", reason: "Мало дневной истории для средних 200.", aboveLow: 0, offHigh: 0, slope: 0 };
  if (closes.length < 220) return empty;
  const price = closes[closes.length - 1] ?? 0;
  const sma50 = sma(closes, 50);
  const sma150 = sma(closes, 150);
  const sma200 = sma(closes, 200);
  const sma200prev = sma(closes, 200, closes.length - 20);
  if (!(price > 0) || sma50 == null || sma150 == null || sma200 == null || sma200prev == null) return empty;
  const year = daily.slice(-252);
  const low = Math.min(...year.map((bar) => bar.l));
  const high = Math.max(...year.map((bar) => bar.h));
  const aboveLow = low > 0 ? price / low - 1 : 0;
  const offHigh = high > 0 ? 1 - price / high : 0;
  const slope = sma200prev > 0 ? sma200 / sma200prev - 1 : 0;
  const longStack = price > sma50 && sma50 > sma150 && sma150 > sma200 && slope > 0 && aboveLow >= 0.3 && offHigh <= 0.25;
  const shortStack = price < sma50 && sma50 < sma150 && sma150 < sma200 && slope < 0 && aboveLow <= 0.25 && offHigh >= 0.3;
  if (longStack) {
    return { side: "long", reason: "Стадия роста: средние 50, 150 и 200 стоят по порядку, цена у максимума года.", aboveLow, offHigh, slope };
  }
  if (shortStack) {
    return { side: "short", reason: "Стадия падения: средние перевернуты, цена у минимума года.", aboveLow, offHigh, slope };
  }
  const reason =
    slope > 0 && price > sma200
      ? "Рост есть, но шаблон неполный: цена далеко от максимума или средние не по порядку."
      : slope < 0 && price < sma200
        ? "Падение есть, но шаблон неполный: цена далеко от минимума или средние не по порядку."
        : "Нет ни стадии роста, ни стадии падения.";
  return { side: "flat", reason, aboveLow, offHigh, slope };
}

function span(bars: Bar[]): { high: number; low: number; width: number; volume: number } {
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  for (const bar of bars) {
    high = Math.max(high, bar.h);
    low = Math.min(low, bar.l);
    volume += bar.v ?? 0;
  }
  return { high, low, width: high - low, volume };
}

function falseBreak(intra: Bar[], levelHigh: number, levelLow: number): { side: Side; extreme: number } | null {
  const window = intra.slice(-12);
  if (window.length < 4 || !(levelHigh > levelLow)) return null;
  const last = window[window.length - 1];
  if (!last) return null;
  let piercedHigh = false;
  let piercedLow = false;
  let highExt = levelHigh;
  let lowExt = levelLow;
  for (const bar of window) {
    if (bar.h > levelHigh * 1.0015) {
      piercedHigh = true;
      highExt = Math.max(highExt, bar.h);
    }
    if (bar.l < levelLow * 0.9985) {
      piercedLow = true;
      lowExt = Math.min(lowExt, bar.l);
    }
  }
  const backShort = piercedHigh && last.c < levelHigh * 0.997 && last.c > levelLow;
  const backLong = piercedLow && last.c > levelLow * 1.003 && last.c < levelHigh;
  if (backShort && !backLong) return { side: "short", extreme: highExt };
  if (backLong && !backShort) return { side: "long", extreme: lowExt };
  return null;
}

function squeeze(daily: Bar[], price: number, volRatio: number, side: Side): { stop: number } | null {
  const done = daily.length > 1 ? daily.slice(0, -1) : daily;
  if (done.length < 12) return null;
  const recent = span(done.slice(-6));
  const prior = span(done.slice(-12, -6));
  if (!(prior.width > 0) || recent.width >= prior.width * 0.8) return null;
  if (prior.volume > 0 && recent.volume >= prior.volume * 0.9) return null;
  if (volRatio < 1.15) return null;
  if (side === "long" && price > recent.high) return { stop: recent.low };
  if (side === "short" && price < recent.low) return { stop: recent.high };
  return null;
}

export function structuralStop(side: Side, extreme: number): number {
  if (!(extreme > 0)) return 0;
  return side === "short" ? extreme * 1.001 : extreme * 0.999;
}

export function withEntry(side: Side, entry: number, stop: number): { stop: number; target: number } | null {
  if (!(entry > 0) || !(stop > 0)) return null;
  const risk = side === "long" ? entry - stop : stop - entry;
  if (!(risk > 0)) return null;
  const pct = risk / entry;
  if (pct < 0.01 || pct > 0.08) return null;
  const target = side === "long" ? entry + 3 * risk : entry - 3 * risk;
  if (!(target > 0)) return null;
  return { stop, target };
}

export function findSetup(args: {
  daily: Bar[];
  intra: Bar[];
  price: number;
  levelHigh: number;
  levelLow: number;
  volRatio: number;
  atr?: number;
}): { stage: Stage; setup: Setup | null } {
  const stage = stageOf(args.daily);
  const floor = Math.max(args.price * 0.01, (args.atr ?? 0) * 0.5);
  const wideEnough = (side: Side, stop: number) => {
    const risk = side === "long" ? args.price - stop : stop - args.price;
    return risk >= floor;
  };
  const pierced = falseBreak(args.intra, args.levelHigh, args.levelLow);
  if (pierced && stage.side === pierced.side) {
    const stop = structuralStop(pierced.side, pierced.extreme);
    if (wideEnough(pierced.side, stop) && withEntry(pierced.side, args.price, stop)) {
      return { stage, setup: { side: pierced.side, stop, model: "ложный пробой" } };
    }
  }
  if (stage.side === "long" || stage.side === "short") {
    const broke = squeeze(args.daily, args.price, args.volRatio, stage.side);
    if (broke && wideEnough(stage.side, broke.stop) && withEntry(stage.side, args.price, broke.stop)) {
      return { stage, setup: { side: stage.side, stop: broke.stop, model: "сжатие" } };
    }
  }
  return { stage, setup: null };
}
