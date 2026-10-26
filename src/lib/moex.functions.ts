import { createServerFn } from "@tanstack/react-start";
import { fetchCryptoQuotes, fetchCryptoSnapshot } from "@/lib/binance";
import { lotStep, moexSession, nameOf, venueOf, type Candle, type Interval, type Quote, type Snapshot, type TapePrint } from "@/lib/market";
import { tinkoffBook, tinkoffCandles, tinkoffToken } from "@/lib/tinkoff";

const ISS = "https://iss.moex.com/iss";

type CacheEntry = { at: number; candles: Candle[] };
const cache = new Map<string, CacheEntry>();

function allowed(ticker: string): boolean {
  return venueOf(ticker) !== null;
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function moexTime(value: unknown): number {
  if (typeof value !== "string" || !value) return 0;
  const ms = Date.parse(value.replace(" ", "T") + "+03:00");
  return Number.isFinite(ms) ? ms : 0;
}

function asTable(row: Record<string, unknown>) {
  const columns = Object.keys(row);
  return { columns, data: [columns.map((column) => row[column])] };
}

async function boardQuotes(tickers: string[]): Promise<Quote[]> {
  if (!tickers.length) return [];
  const payload = await iss(
    `/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=securities,marketdata&securities=${tickers.join(",")}`,
  );
  const root = payload as { securities?: unknown; marketdata?: unknown };
  const secs = new Map(table(root.securities).map((row) => [String(row.SECID), row]));
  return table(root.marketdata).flatMap((md) => {
    const ticker = String(md.SECID ?? "");
    if (!ticker) return [];
    return [quoteFrom(ticker, { securities: asTable(secs.get(ticker) ?? {}), marketdata: asTable(md) })];
  });
}

function table(block: unknown): Record<string, unknown>[] {
  if (!block || typeof block !== "object") return [];
  const source = block as { columns?: unknown; data?: unknown };
  if (!Array.isArray(source.columns) || !Array.isArray(source.data)) return [];
  const columns = source.columns.map(String);
  return source.data.filter(Array.isArray).map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column] = (row as unknown[])[index];
    });
    return record;
  });
}

async function iss(path: string): Promise<unknown> {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${ISS}${path}`, {
        headers: { Accept: "application/json", "User-Agent": "ordo" },
        signal: AbortSignal.timeout(8_000),
      });
      const text = await res.text();
      if (!res.ok || text.trim().startsWith("<")) throw new Error("Мосбиржа не ответила");
      return JSON.parse(text) as unknown;
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error("Мосбиржа не ответила");
}

function asCandles(payload: unknown): Candle[] {
  const root = payload as { candles?: unknown };
  return table(root.candles)
    .map((row) => ({
      t: moexTime(row.begin),
      o: num(row.open),
      h: num(row.high),
      l: num(row.low),
      c: num(row.close),
      v: num(row.volume),
    }))
    .filter((candle) => candle.t > 0 && candle.c > 0);
}

async function candles(ticker: string, interval: string, from: string, ttl = 60_000): Promise<Candle[]> {
  const key = `${ticker}:${interval}:${from}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.candles;
  const all: Candle[] = [];
  for (let start = 0; start < 6000; start += 500) {
    const payload = await iss(
      `/engines/stock/markets/shares/boards/TQBR/securities/${ticker}/candles.json?interval=${interval}&from=${from}&start=${start}&iss.meta=off`,
    );
    const page = asCandles(payload);
    all.push(...page);
    if (page.length < 500) break;
  }
  cache.set(key, { at: Date.now(), candles: all });
  return all;
}

function foldMinutes(candles: Candle[], minutes: number): Candle[] {
  const span = minutes * 60_000;
  const buckets = new Map<number, Candle>();
  for (const candle of candles) {
    const bucket = Math.floor(candle.t / span) * span;
    const prev = buckets.get(bucket);
    if (!prev) {
      buckets.set(bucket, { ...candle, t: bucket });
      continue;
    }
    prev.h = Math.max(prev.h, candle.h);
    prev.l = Math.min(prev.l, candle.l);
    prev.c = candle.c;
    prev.v += candle.v;
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

const ISS_INTERVAL: Partial<Record<Interval, string>> = { "10": "10", "60": "60", "24": "24" };

async function chartCandles(ticker: string, interval: Interval): Promise<Candle[]> {
  const token = tinkoffToken();
  if (token) {
    const days = interval === "24" ? 400 : interval === "60" ? 40 : 5;
    const remote = await tinkoffCandles(token, ticker, interval, days);
    if (remote && remote.length >= 20) return remote;
  }
  const native = ISS_INTERVAL[interval];
  if (native) {
    const from = interval === "24" ? dayStamp(400) : interval === "60" ? dayStamp(40) : dayStamp(5);
    const ttl = interval === "24" ? 15 * 60_000 : 20_000;
    return candles(ticker, native, from, ttl);
  }
  const minutes = interval === "15" ? 15 : interval === "30" ? 30 : 5;
  try {
    const raw = await candles(ticker, "1", moscowStamp(0), 20_000);
    const folded = foldMinutes(raw, minutes);
    if (folded.length >= 20) return folded;
  } catch {
    /* one-minute history timed out; the ten-minute tape still lets the score update */
  }
  return candles(ticker, "10", dayStamp(5), 20_000);
}

function moscowStamp(offset: number): string {
  const date = new Date(Date.now() - offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayStamp(offset: number): string {
  const date = new Date(Date.now() - offset * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function soon<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

function quoteFrom(ticker: string, payload: unknown): Quote {
  const root = payload as { securities?: unknown; marketdata?: unknown };
  const sec = table(root.securities)[0] ?? {};
  const md = table(root.marketdata)[0] ?? {};
  const last = num(md.LAST) || num(sec.PREVPRICE);
  const prev = num(sec.PREVPRICE) || last;
  const bid = num(md.BID);
  const ask = num(md.OFFER);
  const session = moexSession() && bid > 0 && ask > 0;
  return {
    ticker,
    name: typeof sec.SHORTNAME === "string" ? sec.SHORTNAME : nameOf(ticker),
    last,
    prev,
    bid,
    ask,
    changePct: prev > 0 ? ((last - prev) / prev) * 100 : 0,
    lot: Math.max(1, num(sec.LOTSIZE) || 1),
    decimals: Math.max(0, num(sec.DECIMALS) || 1),
    valueToday: num(md.VALTODAY),
    session,
    unit: "₽",
  };
}

type SnapHit = { at: number; snap: Snapshot };
const snaps = new Map<string, SnapHit>();
const inflight = new Map<string, Promise<Snapshot>>();

async function fetchSnapshot(ticker: string, interval: Interval): Promise<Snapshot> {
  const token = tinkoffToken();
  const book = token ? await tinkoffBook(token, ticker) : null;
  const chartPromise = chartCandles(ticker, interval);
  const dailyPromise =
    token && interval !== "24"
      ? tinkoffCandles(token, ticker, "24", 400).then((rows) => rows ?? candles(ticker, "24", dayStamp(400), 15 * 60_000))
      : candles(ticker, "24", dayStamp(400), 15 * 60_000);
  const [board, trades, chart, daily] = await Promise.all([
    book ? Promise.resolve(null) : iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?iss.meta=off`),
    book
      ? Promise.resolve(null)
      : soon(iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}/trades.json?iss.meta=off`), 3_000),
    chartPromise,
    dailyPromise,
  ]);
  const quote = book
    ? {
        ...quoteFrom(ticker, { securities: [{ SHORTNAME: nameOf(ticker), LOTSIZE: lotStep(ticker), DECIMALS: 2, PREVPRICE: book.last }], marketdata: [{ LAST: book.last, BID: book.bid, OFFER: book.ask }] }),
        bid: book.bid,
        ask: book.ask,
        last: book.last,
        lot: lotStep(ticker),
        session: moexSession() && book.bid > 0 && book.ask > 0,
      }
    : quoteFrom(ticker, board);
  const prints = trades
    ? table((trades as { trades?: unknown }).trades)
        .map((row) => ({
          id: num(row.TRADENO),
          price: num(row.PRICE),
          qty: num(row.QUANTITY),
          time: moexTime(`${row.TRADEDATE ?? ""} ${row.TRADETIME ?? ""}`.trim()),
          sell: row.BUYSELL === "S",
        }))
        .filter((print) => print.price > 0 && print.qty > 0)
        .sort((a, b) => a.time - b.time)
    : [];
  const tape: TapePrint[] = prints.slice(-40);
  const market = table((board as { marketdata?: unknown } | null)?.marketdata)[0];
  const bidQty = num(market?.BIDDEPTH) || num(market?.BIDDEPTHT);
  const askQty = num(market?.OFFERDEPTH) || num(market?.OFFERDEPTHT);
  const bids = book?.bids?.length ? book.bids : quote.bid > 0 ? [{ price: quote.bid, qty: bidQty }] : [];
  const asks = book?.asks?.length ? book.asks : quote.ask > 0 ? [{ price: quote.ask, qty: askQty }] : [];
  return { ...quote, interval, candles: chart, daily, bids, asks, tape };
}

function loadFresh(ticker: string, interval: Interval): Promise<Snapshot> {
  const key = `${ticker}:${interval}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = fetchSnapshot(ticker, interval)
    .then((snap) => {
      snaps.set(key, { at: Date.now(), snap });
      return snap;
    })
    .finally(() => {
      if (inflight.get(key) === job) inflight.delete(key);
    });
  inflight.set(key, job);
  return job;
}

export async function loadSnapshot(ticker: string, interval: Interval): Promise<Snapshot> {
  if (venueOf(ticker) === "crypto") return fetchCryptoSnapshot(ticker, interval);
  const key = `${ticker}:${interval}`;
  const hit = snaps.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < 4_000) return hit.snap;
  if (hit && age < 5 * 60_000) {
    void loadFresh(ticker, interval).catch(() => {
      /* stale snapshot stays on screen; the next poll tries again */
    });
    return hit.snap;
  }
  return loadFresh(ticker, interval);
}

export async function loadQuoteList(tickers: string[]): Promise<Quote[]> {
  const clean = tickers.filter((ticker) => allowed(ticker)).slice(0, 24);
  const crypto = clean.filter((ticker) => venueOf(ticker) === "crypto");
  const shares = clean.filter((ticker) => venueOf(ticker) === "moex");
  const [cryptoQuotes, shareQuotes] = await Promise.all([
    crypto.length ? fetchCryptoQuotes(crypto) : Promise.resolve([] as Quote[]),
    shares.length ? boardQuotes(shares).catch(() => [] as Quote[]) : Promise.resolve([] as Quote[]),
  ]);
  return [...cryptoQuotes, ...shareQuotes];
}

export const loadMarket = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const source = input as { ticker?: unknown; interval?: unknown };
    const ticker = typeof source.ticker === "string" ? source.ticker : "";
    const interval = ["5", "10", "15", "30", "60", "24"].includes(String(source.interval))
      ? (source.interval as Interval)
      : "5";
    if (!allowed(ticker)) throw new Error("Неизвестный тикер");
    return { ticker, interval: interval as Interval };
  })
  .handler(async ({ data }): Promise<Snapshot> => loadSnapshot(data.ticker, data.interval));

export const loadQuotes = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const tickers = (input as { tickers?: unknown }).tickers;
    if (!Array.isArray(tickers)) return { tickers: [] as string[] };
    const clean = tickers.filter((ticker): ticker is string => typeof ticker === "string" && allowed(ticker)).slice(0, 8);
    return { tickers: clean };
  })
  .handler(async ({ data }): Promise<Quote[]> => loadQuoteList(data.tickers));

export type LookRow = { t: number; ticker: string; text: string };

export const loadLooks = createServerFn({ method: "GET" }).handler(async (): Promise<LookRow[]> => {
  const rows = (globalThis as typeof globalThis & { __ordoLooks?: LookRow[] }).__ordoLooks ?? [];
  return rows.slice(0, 12);
});
