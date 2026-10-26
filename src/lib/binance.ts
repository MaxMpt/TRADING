import { lotStep, nameOf, type Candle, type Interval, type Level, type Quote, type Snapshot, type TapePrint } from "@/lib/market";

const ROOT = "https://data-api.binance.vision/api/v3";

type CacheEntry = { at: number; candles: Candle[] };
const cache = new Map<string, CacheEntry>();

function num(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function binanceInterval(interval: Interval): string {
  if (interval === "60") return "1h";
  if (interval === "24") return "1d";
  return "5m";
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${ROOT}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Криптобиржа не ответила");
  return res.json() as Promise<unknown>;
}

function asCandles(payload: unknown): Candle[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(Array.isArray)
    .map((row) => {
      const cells = row as unknown[];
      return {
        t: num(cells[0]),
        o: num(cells[1]),
        h: num(cells[2]),
        l: num(cells[3]),
        c: num(cells[4]),
        v: num(cells[5]),
      };
    })
    .filter((candle) => candle.t > 0 && candle.c > 0);
}

async function klines(symbol: string, interval: string, limit: number, ttl: number): Promise<Candle[]> {
  const key = `${symbol}:${interval}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.candles;
  const candles = asCandles(await getJson(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`));
  cache.set(key, { at: Date.now(), candles });
  return candles;
}

function levels(payload: unknown, side: "bids" | "asks"): Level[] {
  const rows = payload && typeof payload === "object" ? (payload as Record<string, unknown>)[side] : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(Array.isArray)
    .slice(0, 12)
    .map((row) => ({ price: num((row as unknown[])[0]), qty: num((row as unknown[])[1]) }))
    .filter((level) => level.price > 0 && level.qty > 0);
}

function quoteFrom(row: Record<string, unknown>): Quote {
  const ticker = String(row.symbol ?? "");
  const last = num(row.lastPrice);
  const prev = num(row.prevClosePrice) || last;
  const bid = num(row.bidPrice) || last;
  const ask = num(row.askPrice) || last;
  return {
    ticker,
    name: nameOf(ticker),
    last,
    prev,
    bid,
    ask,
    changePct: prev > 0 ? ((last - prev) / prev) * 100 : num(row.priceChangePercent),
    lot: lotStep(ticker),
    decimals: last >= 1000 ? 2 : last >= 1 ? 3 : 6,
    valueToday: num(row.quoteVolume),
    session: last > 0,
    unit: "USDT",
  };
}

export async function fetchCryptoSnapshot(ticker: string, interval: Interval): Promise<Snapshot> {
  const symbol = ticker;
  const intraInterval = binanceInterval(interval);
  const [day, intra, stats, book, prints] = await Promise.all([
    klines(symbol, "1d", 800, 60_000),
    interval === "24" ? Promise.resolve([] as Candle[]) : klines(symbol, intraInterval, 500, 5_000),
    getJson(`/ticker/24hr?symbol=${symbol}`),
    getJson(`/depth?symbol=${symbol}&limit=20`).catch(() => ({ bids: [], asks: [] })),
    getJson(`/aggTrades?symbol=${symbol}&limit=40`).catch(() => []),
  ]);
  const quote = quoteFrom((stats ?? {}) as Record<string, unknown>);
  const bids = levels(book, "bids");
  const asks = levels(book, "asks");
  if (bids[0]) quote.bid = bids[0].price;
  if (asks[0]) quote.ask = asks[0].price;
  const tape: TapePrint[] = (Array.isArray(prints) ? prints : [])
    .map((row) => {
      const print = row as Record<string, unknown>;
      return {
        id: num(print.a),
        price: num(print.p),
        qty: num(print.q),
        time: num(print.T),
        sell: print.m === true,
      };
    })
    .filter((print) => print.price > 0 && print.qty > 0);
  return {
    ...quote,
    interval,
    candles: interval === "24" ? day : intra,
    daily: day,
    bids,
    asks,
    tape,
  };
}

export async function fetchCryptoQuotes(tickers: string[]): Promise<Quote[]> {
  if (!tickers.length) return [];
  const symbols = encodeURIComponent(JSON.stringify(tickers));
  const payload = await getJson(`/ticker/24hr?symbols=${symbols}`);
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => quoteFrom(row as Record<string, unknown>))
    .filter((quote) => quote.last > 0);
}
