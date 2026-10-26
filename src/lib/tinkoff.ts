import type { Candle, Interval, Level } from "@/lib/market";

const REST = "https://invest-public-api.tbank.ru/rest/tinkoff.public.invest.api.contract.v1.MarketDataService";

const INTERVAL_NAME: Record<Interval, string> = {
  "5": "CANDLE_INTERVAL_5_MIN",
  "10": "CANDLE_INTERVAL_10_MIN",
  "15": "CANDLE_INTERVAL_15_MIN",
  "30": "CANDLE_INTERVAL_30_MIN",
  "60": "CANDLE_INTERVAL_HOUR",
  "24": "CANDLE_INTERVAL_DAY",
};

type QuoteBits = { units?: string; nano?: number };

export function tinkoffToken(): string {
  const value = process.env.TINKOFF_TOKEN || process.env.INVEST_TOKEN || "";
  return value.trim();
}

function money(value: QuoteBits | undefined): number {
  if (!value) return 0;
  const units = Number(value.units ?? 0);
  const nano = Number(value.nano ?? 0);
  return (Number.isFinite(units) ? units : 0) + (Number.isFinite(nano) ? nano : 0) / 1e9;
}

async function post(token: string, method: string, body: unknown): Promise<unknown | null> {
  try {
    const res = await fetch(`${REST}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

export async function tinkoffCandles(token: string, ticker: string, interval: Interval, days: number): Promise<Candle[] | null> {
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);
  const payload = await post(token, "GetCandles", {
    instrumentId: `${ticker}_TQBR`,
    from: from.toISOString(),
    to: to.toISOString(),
    interval: INTERVAL_NAME[interval],
    candleSourceType: "CANDLE_SOURCE_EXCHANGE",
  });
  const rows = (payload as { candles?: unknown } | null)?.candles;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const candles: Candle[] = [];
  for (const row of rows) {
    const bar = row as {
      open?: QuoteBits;
      high?: QuoteBits;
      low?: QuoteBits;
      close?: QuoteBits;
      volume?: string | number;
      time?: string;
    };
    const t = bar.time ? Date.parse(bar.time) : 0;
    const c = money(bar.close);
    if (!(t > 0) || !(c > 0)) continue;
    candles.push({
      t,
      o: money(bar.open) || c,
      h: money(bar.high) || c,
      l: money(bar.low) || c,
      c,
      v: Number(bar.volume ?? 0) || 0,
    });
  }
  candles.sort((a, b) => a.t - b.t);
  return candles.length ? candles : null;
}

export async function tinkoffBook(
  token: string,
  ticker: string,
): Promise<{ bid: number; ask: number; last: number; bids: Level[]; asks: Level[] } | null> {
  const payload = await post(token, "GetOrderBook", { instrumentId: `${ticker}_TQBR`, depth: 15 });
  if (!payload || typeof payload !== "object") return null;
  const book = payload as {
    bids?: { price?: QuoteBits; quantity?: string | number }[];
    asks?: { price?: QuoteBits; quantity?: string | number }[];
    lastPrice?: QuoteBits;
    closePrice?: QuoteBits;
  };
  const side = (rows: { price?: QuoteBits; quantity?: string | number }[] | undefined): Level[] =>
    (rows ?? [])
      .map((row) => ({ price: money(row.price), qty: Number(row.quantity ?? 0) || 0 }))
      .filter((row) => row.price > 0);
  const bids = side(book.bids).sort((a, b) => b.price - a.price);
  const asks = side(book.asks).sort((a, b) => a.price - b.price);
  const last = money(book.lastPrice) || money(book.closePrice) || bids[0]?.price || asks[0]?.price || 0;
  if (!(last > 0)) return null;
  return { bid: bids[0]?.price ?? last, ask: asks[0]?.price ?? last, last, bids, asks };
}
