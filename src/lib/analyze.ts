import { clamp } from "@/lib/format";
import type { Call } from "@/lib/broker";
import type { Candle, Snapshot, TapePrint } from "@/lib/market";
import { findSetup, withEntry } from "@/lib/playbook";

export type Tone = "up" | "down" | "flat";

export type Factor = {
  id: string;
  label: string;
  detail: string;
  tone: Tone;
};

export type Read = {
  score: number;
  call: Call;
  note: string;
  atr: number;
  imbalance: number;
  flow: number;
  trend: number;
  rsi: number;
  volRatio: number;
  spreadBps: number;
  emaFast: number[];
  emaSlow: number[];
  tradable: boolean;
  block: string | null;
  factors: Factor[];
  dailyBars: number;
  intraBars: number;
  planStop: number;
  model: string;
};

export function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? prev;
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (d >= 0) avgGain += d;
    else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  let prev = candles[0]?.c ?? 0;
  const ranges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    if (!c) continue;
    const tr = Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
    ranges.push(tr);
    prev = c.c;
  }
  const slice = ranges.slice(-period);
  if (!slice.length) return 0;
  return slice.reduce((sum, n) => sum + n, 0) / slice.length;
}

function adx(candles: Candle[], period = 14): { adx: number; plusDi: number; minusDi: number } {
  if (candles.length < period * 2) return { adx: 0, plusDi: 0, minusDi: 0 };
  const trs: number[] = [];
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    if (!cur || !prev) continue;
    const up = cur.h - prev.h;
    const down = prev.l - cur.l;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
    trs.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
  }
  const wilder = (values: number[]) => {
    let acc = values.slice(0, period).reduce((sum, n) => sum + n, 0);
    const out = [acc];
    for (let i = period; i < values.length; i++) {
      acc = acc - acc / period + (values[i] ?? 0);
      out.push(acc);
    }
    return out;
  };
  const atrS = wilder(trs);
  const plusS = wilder(plusDm);
  const minusS = wilder(minusDm);
  const dx: number[] = [];
  for (let i = 0; i < atrS.length; i++) {
    const range = atrS[i] ?? 0;
    const plusDi = range > 0 ? (100 * (plusS[i] ?? 0)) / range : 0;
    const minusDi = range > 0 ? (100 * (minusS[i] ?? 0)) / range : 0;
    const den = plusDi + minusDi;
    dx.push(den === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / den);
  }
  if (dx.length < period) return { adx: 0, plusDi: 0, minusDi: 0 };
  let value = dx.slice(0, period).reduce((sum, n) => sum + n, 0) / period;
  for (let i = period; i < dx.length; i++) value = (value * (period - 1) + (dx[i] ?? 0)) / period;
  const lastRange = atrS[atrS.length - 1] ?? 0;
  return {
    adx: value,
    plusDi: lastRange > 0 ? (100 * (plusS[plusS.length - 1] ?? 0)) / lastRange : 0,
    minusDi: lastRange > 0 ? (100 * (minusS[minusS.length - 1] ?? 0)) / lastRange : 0,
  };
}

function sessionVwap(candles: Candle[]): number {
  if (!candles.length) return 0;
  const last = candles[candles.length - 1];
  if (!last) return 0;
  const day = moscowDay(last.t);
  let notional = 0;
  let volume = 0;
  for (const candle of candles) {
    if (moscowDay(candle.t) !== day || candle.v <= 0) continue;
    notional += ((candle.h + candle.l + candle.c) / 3) * candle.v;
    volume += candle.v;
  }
  return volume > 0 ? notional / volume : 0;
}

function bands(closes: number[], period = 20): { upper: number; lower: number; width: number } {
  const slice = closes.slice(-period);
  if (slice.length < period) return { upper: 0, lower: 0, width: 0 };
  const mid = slice.reduce((sum, n) => sum + n, 0) / period;
  const variance = slice.reduce((sum, n) => sum + (n - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return {
    upper: mid + 2 * sd,
    lower: mid - 2 * sd,
    width: mid > 0 ? (4 * sd) / mid : 0,
  };
}

function bookImbalance(bids: { qty: number }[], asks: { qty: number }[]): number {
  const bid = bids.reduce((sum, level) => sum + level.qty, 0);
  const ask = asks.reduce((sum, level) => sum + level.qty, 0);
  const total = bid + ask;
  return total > 0 ? (bid - ask) / total : 0;
}

function moscowDay(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

function flowOf(tape: TapePrint[]): number {
  let buy = 0;
  let sell = 0;
  for (const print of tape) {
    const notion = print.price * print.qty;
    if (print.sell) sell += notion;
    else buy += notion;
  }
  const total = buy + sell;
  return total > 0 ? (buy - sell) / total : 0;
}

function toneOf(n: number, dead: number): Tone {
  if (n > dead) return "up";
  if (n < -dead) return "down";
  return "flat";
}

export function study(snap: Snapshot): Read {
  const daily = snap.daily;
  const intra = snap.interval === "24" ? snap.daily : snap.candles;
  const closes = intra.map((c) => c.c);
  const price = snap.last || closes[closes.length - 1] || 0;
  const emaFast = ema(closes, 9);
  const emaSlow = ema(closes, 21);
  const fast = emaFast[emaFast.length - 1] ?? price;
  const slow = emaSlow[emaSlow.length - 1] ?? price;
  const hourTrend = price > 0 ? (fast - slow) / price : 0;

  const dCloses = daily.map((c) => c.c);
  const dFast = ema(dCloses, 20);
  const dSlow = ema(dCloses, 50);
  const ema20 = dFast[dFast.length - 1] ?? price;
  const ema50 = dSlow[dSlow.length - 1] ?? price;
  const dayTrend = price > 0 ? (ema20 - ema50) / price : 0;
  const back = dCloses.length > 21 ? (dCloses[dCloses.length - 1] ?? price) / (dCloses[dCloses.length - 21] ?? price) - 1 : 0;
  const dayRsi = rsi(dCloses, 14);
  const dayAtr = atr(daily, 14);
  const intraRsi = rsi(closes, 14);
  const volume = (() => {
    const closed = intra.slice(0, -1);
    if (closed.length < 8) return 1;
    const window = closed.slice(-21, -1);
    const last = closed[closed.length - 1];
    const avg = window.reduce((sum, c) => sum + c.v, 0) / Math.max(window.length, 1);
    return last && avg > 0 ? last.v / avg : 1;
  })();
  const flow = flowOf(snap.tape);
  const imbalance = bookImbalance(snap.bids, snap.asks);
  const trendStrength = adx(daily, 14);
  const vwap = sessionVwap(intra);
  const vwapBias = vwap > 0 && price > 0 ? (price - vwap) / price : 0;
  const band = bands(dCloses, 20);
  const bid = snap.bid;
  const ask = snap.ask;
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : price;
  const spreadBps = mid > 0 && ask >= bid && bid > 0 ? ((ask - bid) / mid) * 10_000 : 0;
  const prior = snap.session && daily.length >= 2 ? daily[daily.length - 2] : daily[daily.length - 1];
  const prevClose = daily.length >= 2 ? (daily[daily.length - 2]?.c ?? 0) : 0;

  const levelHigh = prior?.h ?? 0;
  const levelLow = prior?.l ?? 0;
  const played = findSetup({
    daily,
    intra,
    price,
    levelHigh,
    levelLow,
    volRatio: volume,
    atr: dayAtr,
  });
  const preview = played.setup ? withEntry(played.setup.side, price, played.setup.stop) : null;
  let score = 0;
  if (played.stage.side === "long") score += 34;
  if (played.stage.side === "short") score -= 34;
  if (trendStrength.adx >= 20) score += trendStrength.plusDi >= trendStrength.minusDi ? 16 : -16;
  if (vwap > 0 && price > 0) score += clamp(vwapBias * 800, -18, 18);
  if (imbalance !== 0) score += clamp(imbalance * 24, -16, 16);
  if (volume > 1.4) score += hourTrend >= 0 ? 6 : -6;
  if (played.setup?.side === "long" && preview) score = Math.max(score, 76);
  if (played.setup?.side === "short" && preview) score = Math.min(score, -76);
  score = clamp(Math.round(score), -100, 100);

  const call: Call = preview && played.setup ? played.setup.side : "flat";

  let block: string | null = null;
  if (daily.length < 60) block = "Мало дневной истории";
  else if (intra.length < 30) block = "Мало свечей для входа";
  else if (!snap.session) block = "Торги закрыты";
  else if (!(bid > 0 && ask > 0)) block = "Нет стакана";
  else if (spreadBps > 40) block = "Спред слишком широкий";
  else if (snap.interval !== "24") {
    const lastBar = intra[intra.length - 1];
    const marks = [price, bid, ask].filter((px) => px > 0);
    const outside = Boolean(lastBar && marks.some((px) => px < lastBar.l * 0.998 || px > lastBar.h * 1.002));
    const staleAfter = snap.interval === "60" ? 4 * 60 * 60_000 : 90 * 60_000;
    const staleBar = Boolean(lastBar && lastBar.t > 0 && Date.now() - lastBar.t > staleAfter);
    if (outside) block = "Цена не совпадает со свечой. Вход пропущен.";
    else if (staleBar) block = "Биржа отдала слишком старую свечу. Вход пропущен.";
  }
  if (!block && preview && played.setup) {
    if (trendStrength.adx < 20) block = "ADX ниже 20: тренда нет, это пила. Вход пропущен.";
    else if (played.setup.side === "long" && trendStrength.plusDi < trendStrength.minusDi) block = "Покупатели слабее продавцов. Лонг пропущен.";
    else if (played.setup.side === "short" && trendStrength.minusDi < trendStrength.plusDi) block = "Продавцы слабее покупателей. Шорт пропущен.";
    else if (vwap > 0 && played.setup.side === "short" && price > vwap) block = "Шорт выше VWAP: сессия ещё у покупателей.";
    else if (vwap > 0 && played.setup.side === "long" && price < vwap) block = "Лонг ниже VWAP: сессия ещё у продавцов.";
    else if (volume < 1) block = "Объём ниже обычного. Вход пропущен.";
  }

  const note = preview && played.setup
    ? played.setup.model === "ложный пробой"
      ? "Ложный пробой уровня. Стоп за хвостом, тейк в три раза дальше."
      : "Сжатие и выход из него по тренду. Стоп за базой, тейк в три раза дальше."
    : played.stage.reason;

  const factors: Factor[] = [
    {
      id: "stage",
      label: "Стадия",
      detail: played.stage.side === "long" ? "рост" : played.stage.side === "short" ? "падение" : "нет",
      tone: played.stage.side === "long" ? "up" : played.stage.side === "short" ? "down" : "flat",
    },
    {
      id: "low",
      label: "От минимума года",
      detail: `${played.stage.aboveLow >= 0 ? "+" : "−"}${(Math.abs(played.stage.aboveLow) * 100).toFixed(0)}%`,
      tone: played.stage.aboveLow >= 0.3 ? "up" : "flat",
    },
    {
      id: "high",
      label: "До максимума года",
      detail: `${(played.stage.offHigh * 100).toFixed(0)}%`,
      tone: played.stage.offHigh <= 0.25 ? "up" : "down",
    },
    {
      id: "slope",
      label: "Наклон 200",
      detail: `${played.stage.slope >= 0 ? "вверх" : "вниз"} ${(Math.abs(played.stage.slope) * 100).toFixed(1)}%`,
      tone: played.stage.slope > 0 ? "up" : played.stage.slope < 0 ? "down" : "flat",
    },
    {
      id: "level",
      label: "Уровень",
      detail: levelHigh > 0 ? `${levelLow.toFixed(2)} – ${levelHigh.toFixed(2)}` : "—",
      tone: "flat",
    },
    {
      id: "adx",
      label: "ADX",
      detail: trendStrength.adx >= 20 ? `${trendStrength.adx.toFixed(0)} тренд` : `${trendStrength.adx.toFixed(0)} пила`,
      tone: trendStrength.adx >= 20 ? "up" : "flat",
    },
    {
      id: "vwap",
      label: "VWAP",
      detail: vwap > 0 ? (price >= vwap ? "цена выше" : "цена ниже") : "—",
      tone: vwap > 0 && price >= vwap ? "up" : vwap > 0 ? "down" : "flat",
    },
    {
      id: "model",
      label: "Модель",
      detail: played.setup?.model ?? "нет",
      tone: played.setup?.side === "long" ? "up" : played.setup?.side === "short" ? "down" : "flat",
    },
    {
      id: "stop",
      label: "Стоп",
      detail: preview ? preview.stop.toFixed(2) : "—",
      tone: "down",
    },
    {
      id: "target",
      label: "Тейк 1:3",
      detail: preview ? preview.target.toFixed(2) : "—",
      tone: "up",
    },
  ];

  return {
    score,
    call,
    note,
    atr: dayAtr,
    imbalance,
    flow,
    trend: dayTrend,
    rsi: intraRsi,
    volRatio: volume,
    spreadBps,
    emaFast,
    emaSlow,
    tradable: block === null,
    block,
    factors,
    dailyBars: daily.length,
    intraBars: snap.candles.length,
    planStop: preview && played.setup ? played.setup.stop : 0,
    model: played.setup?.model ?? "",
  };
}
