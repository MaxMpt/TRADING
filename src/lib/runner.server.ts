import { study } from "@/lib/analyze";
import { decide, exitHit, lostTickersToday, SAME_SIDE_CAP, type Side } from "@/lib/broker";
import { MOEX } from "@/lib/market";
import { loadQuoteList, loadSnapshot } from "@/lib/moex.functions";
import { placeClose, placeOpen, readBook } from "@/lib/trades.functions";

const NAMES = MOEX.map((item) => item.id);

type Look = { t: number; ticker: string; text: string };

function remember(ticker: string, text: string): void {
  const g = globalThis as typeof globalThis & { __ordoLooks?: Look[] };
  g.__ordoLooks = [{ t: Date.now(), ticker, text }, ...(g.__ordoLooks ?? [])].slice(0, 30);
}

type Streak = { side: Side | null; n: number };

const streaks = new Map<string, Streak>();
let scanBusy = false;
let exitBusy = false;

async function guardExits(): Promise<void> {
  const book = await readBook();
  if (!book.open.length) return;
  let quotes: Awaited<ReturnType<typeof loadQuoteList>> = [];
  try {
    quotes = await loadQuoteList(book.open.map((trade) => trade.ticker));
  } catch (error) {
    console.error("[ordo] котировки открытых", error instanceof Error ? error.message : error);
  }
  for (const trade of book.open) {
    const quote = quotes.find((item) => item.ticker === trade.ticker);
    if (!quote) continue;
    const hit = exitHit(trade.side, trade.stop, trade.target, quote.bid, quote.ask, quote.last);
    if (!hit) continue;
    const price = trade.side === "long" ? quote.bid || quote.last : quote.ask || quote.last;
    if (!(price > 0)) continue;
    await placeClose({ id: trade.id, price, reason: hit });
  }
}

async function lookOne(ticker: string): Promise<void> {
  const book = await readBook();
  let snap;
  try {
    snap = await loadSnapshot(ticker, "10");
  } catch (error) {
    remember(ticker, error instanceof Error ? error.message : "биржа не ответила");
    console.error("[ordo]", ticker, error instanceof Error ? error.message : error);
    return;
  }
  const read = study(snap);
  const mine = book.open.find((trade) => trade.ticker === ticker) ?? null;
  const prev = streaks.get(ticker) ?? { side: null, n: 0 };
  const decision = decide({
    inPosition: Boolean(mine),
    side: mine?.side ?? null,
    stop: mine?.stop ?? 0,
    target: mine?.target ?? 0,
    bid: snap.bid,
    ask: snap.ask,
    last: snap.last,
    agentOn: book.account.agentOn,
    session: snap.session,
    call: read.tradable ? read.call : "flat",
    score: read.score,
    bias: null,
    streakSide: prev.side,
    streakN: prev.n,
  });
  streaks.set(ticker, { side: decision.streakSide, n: decision.streakN });
  if (decision.intent.type === "close" && mine) {
    const price = mine.side === "long" ? snap.bid || snap.last : snap.ask || snap.last;
    if (price > 0) {
      await placeClose({ id: mine.id, price, reason: decision.intent.reason });
      remember(ticker, `закрыл ${decision.intent.reason === "target" ? "по тейку" : "по стопу"}`);
    }
    return;
  }
  if (decision.intent.type === "open") {
    const burned = lostTickersToday(book.closed);
    if (burned.includes(ticker)) {
      remember(ticker, "убыток по этой бумаге уже был, сегодня повторно не беру");
      return;
    }
    const side = decision.intent.side;
    const same = book.open.filter((trade) => trade.side === side).length;
    if (same >= SAME_SIDE_CAP) {
      remember(ticker, side === "short" ? "уже два шорта, третий не беру" : "уже два лонга, третий не беру");
      return;
    }
    const price = side === "long" ? snap.ask || snap.last : snap.bid || snap.last;
    if (!(price > 0)) return;
    try {
      await placeOpen({
        ticker,
        side: decision.intent.side,
        via: "agent",
        price,
        lot: snap.lot,
        stop: read.planStop,
      });
      remember(ticker, `открыл ${decision.intent.side === "long" ? "лонг" : "шорт"} от ${price.toFixed(2)}`);
      console.log(`[ordo] ${decision.intent.side} ${ticker} @ ${price}`);
    } catch (error) {
      remember(ticker, error instanceof Error ? error.message : "не открыл");
    }
    return;
  }
  const why = !book.account.agentOn
    ? "агент выключен"
    : mine
      ? "позиция уже открыта"
      : read.block || read.note;
  remember(ticker, why);
}

async function watchExits(): Promise<void> {
  if (exitBusy) return;
  exitBusy = true;
  try {
    await guardExits();
  } catch (error) {
    console.error("[ordo]", error instanceof Error ? error.message : error);
  } finally {
    exitBusy = false;
  }
}

async function lookAll(): Promise<void> {
  if (scanBusy) return;
  scanBusy = true;
  try {
    let next = 0;
    const run = async () => {
      while (next < NAMES.length) {
        const ticker = NAMES[next];
        next += 1;
        if (ticker) await lookOne(ticker);
      }
    };
    await Promise.all([run(), run(), run(), run(), run()]);
  } catch (error) {
    console.error("[ordo]", error instanceof Error ? error.message : error);
  } finally {
    scanBusy = false;
  }
}

type Slot = { stop: () => void };

export function startDeskRunner(): void {
  const g = globalThis as typeof globalThis & { __ordoRunner?: Slot };
  g.__ordoRunner?.stop();
  let dead = false;
  let scanTimer: ReturnType<typeof setTimeout> | undefined;
  const exitTimer = setInterval(() => {
    if (!dead) void watchExits();
  }, 2_000);
  const scan = () => {
    if (dead) return;
    void lookAll().finally(() => {
      if (!dead) scanTimer = setTimeout(scan, 3_000);
    });
  };
  scanTimer = setTimeout(scan, 400);
  void watchExits();
  g.__ordoRunner = {
    stop() {
      dead = true;
      clearInterval(exitTimer);
      if (scanTimer) clearTimeout(scanTimer);
    },
  };
  console.log("[ordo] все 30 бумаг смотрятся вместе, стопы каждые 2 секунды");
}
