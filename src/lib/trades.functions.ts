import { createServerFn } from "@tanstack/react-start";
import { brackets, explainLoss, sizeOrder, tradePnl, type ExitReason, type Side, type Via } from "@/lib/broker";
import { getSql } from "@/lib/db";
import { nameOf, venueOf } from "@/lib/market";
import { withEntry } from "@/lib/playbook";

export type Account = {
  capital: number;
  cash: number;
  commissionPct: number;
  riskPct: number;
  sizePct: number;
  agentOn: boolean;
};

export type TradeRow = {
  id: string;
  ticker: string;
  name: string;
  side: Side;
  qty: number;
  priceOpen: number;
  priceClose: number | null;
  amount: number;
  openedAt: number;
  closedAt: number | null;
  pnl: number | null;
  commission: number;
  reason: string | null;
  stop: number;
  target: number;
  via: Via;
  lesson: string | null;
};

export type DeskBook = { account: Account; open: TradeRow[]; closed: TradeRow[] };

function num(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function mapTrade(row: Record<string, unknown>): TradeRow {
  return {
    id: String(row.id),
    ticker: String(row.ticker),
    name: String(row.name),
    side: row.side === "short" ? "short" : "long",
    qty: num(row.qty),
    priceOpen: num(row.price_open),
    priceClose: row.price_close == null ? null : num(row.price_close),
    amount: num(row.amount),
    openedAt: num(row.opened_at),
    closedAt: row.closed_at == null ? null : num(row.closed_at),
    pnl: row.pnl == null ? null : num(row.pnl),
    commission: num(row.commission),
    reason: row.reason == null ? null : String(row.reason),
    stop: num(row.stop),
    target: num(row.target),
    via: row.via === "hand" ? "hand" : "agent",
    lesson: row.lesson == null ? null : String(row.lesson),
  };
}

const LIST_SQL = `select id, ticker, name, side, qty, price_open, price_close, amount,
  (extract(epoch from opened_at) * 1000)::float8 as opened_at,
  case when closed_at is null then null else (extract(epoch from closed_at) * 1000)::float8 end as closed_at,
  pnl, commission, reason, stop, target, via, lesson
  from trades
  order by opened_at desc
  limit 200`;

function clampPct(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function knownTicker(ticker: string): boolean {
  return venueOf(ticker) !== null;
}

export async function readBook(): Promise<DeskBook> {
  const sql = await getSql();
  const accounts = await sql<Record<string, unknown>>`
    select capital, cash, commission_pct, risk_pct, size_pct, agent_on from desk_account where id = 1
  `;
  const row = accounts[0];
  const account: Account = row
    ? {
        capital: num(row.capital),
        cash: num(row.cash),
        commissionPct: num(row.commission_pct),
        riskPct: num(row.risk_pct),
        sizePct: num(row.size_pct),
        agentOn: row.agent_on !== false && row.agent_on !== "false",
      }
    : { capital: 1_000_000, cash: 1_000_000, commissionPct: 0.05, riskPct: 0.6, sizePct: 20, agentOn: true };
  const trades = (await sql.query<Record<string, unknown>>(LIST_SQL)).map(mapTrade);
  for (const trade of trades) {
    if (trade.pnl == null || trade.pnl >= 0 || trade.lesson || trade.closedAt == null || trade.priceClose == null) continue;
    const text = explainLoss({
      ticker: trade.ticker,
      side: trade.side,
      entry: trade.priceOpen,
      stop: trade.stop,
      exit: trade.priceClose,
      heldMs: Math.max(0, trade.closedAt - trade.openedAt),
    });
    trade.lesson = text;
    await sql`update trades set lesson = ${text} where id = ${trade.id} and lesson is null`;
  }
  return {
    account,
    open: trades.filter((trade) => trade.closedAt == null),
    closed: trades.filter((trade) => trade.closedAt != null),
  };
}

export const loadDesk = createServerFn({ method: "GET" }).handler(async (): Promise<DeskBook> => readBook());

export const saveAccount = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const source = input as {
      commissionPct?: unknown;
      riskPct?: unknown;
      sizePct?: unknown;
      capital?: unknown;
      agentOn?: unknown;
    };
    return {
      commissionPct: typeof source.commissionPct === "number" ? source.commissionPct : null,
      riskPct: typeof source.riskPct === "number" ? source.riskPct : null,
      sizePct: typeof source.sizePct === "number" ? source.sizePct : null,
      capital: typeof source.capital === "number" ? source.capital : null,
      agentOn: typeof source.agentOn === "boolean" ? source.agentOn : null,
    };
  })
  .handler(async ({ data }): Promise<DeskBook> => {
    const sql = await getSql();
    const current = await readBook();
    const commissionPct =
      data.commissionPct == null ? current.account.commissionPct : clampPct(data.commissionPct, 0, 1);
    const riskPct = data.riskPct == null ? current.account.riskPct : clampPct(data.riskPct, 0.15, 3);
    const sizePct = data.sizePct == null ? current.account.sizePct : clampPct(data.sizePct, 1, 100);
    await sql`
      update desk_account
      set commission_pct = ${commissionPct}, risk_pct = ${riskPct}, size_pct = ${sizePct}
      where id = 1
    `;
    if (data.capital != null) {
      if (current.open.length > 0) throw new Error("Сначала закройте открытые сделки");
      const capital = clampPct(data.capital, 10_000, 100_000_000);
      await sql`update desk_account set capital = ${capital}, cash = ${capital} where id = 1`;
    }
    if (data.agentOn != null) {
      await sql`update desk_account set agent_on = ${data.agentOn} where id = 1`;
    }
    return readBook();
  });

export async function placeOpen(data: {
  ticker: string;
  side: Side;
  via: Via;
  price: number;
  lot: number;
  stop: number;
}): Promise<DeskBook> {
  const sql = await getSql();
  const book = await readBook();
  if (book.open.some((trade) => trade.ticker === data.ticker)) {
    throw new Error(`По ${data.ticker} уже есть открытая сделка`);
  }
  const name = nameOf(data.ticker);
  const reserved = book.open.reduce((sum, trade) => sum + trade.amount, 0);
  const sized = sizeOrder({
    cash: book.account.cash,
    reserved,
    capital: book.account.capital,
    sizePct: book.account.sizePct,
    price: data.price,
    lot: data.lot,
    commissionPct: book.account.commissionPct,
  });
  if ("error" in sized) throw new Error(sized.error);
  const planned = data.stop > 0 ? withEntry(data.side, data.price, data.stop) : null;
  if (data.stop > 0 && !planned) throw new Error("Стоп не подходит к цене входа");
  const fallback = brackets(data.side, data.price, book.account.riskPct);
  const stop = planned?.stop ?? fallback.stop;
  const target = planned?.target ?? fallback.target;
  if (!(target > 0) || !(stop > 0)) throw new Error("Тейк или стоп вышел за ноль");
  const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const inserted = await sql<{ id: string }>`
    insert into trades (
      id, ticker, name, side, qty, price_open, amount, opened_at, commission, stop, target, via
    )
    select
      ${id}, ${data.ticker}, ${name}, ${data.side}, ${sized.qty}, ${data.price}, ${sized.amount},
      now(), ${sized.fee}, ${stop}, ${target}, ${data.via}
    where not exists (
      select 1 from trades where ticker = ${data.ticker} and closed_at is null
    )
    returning id
  `;
  if (!inserted.length) throw new Error(`По ${data.ticker} уже есть открытая сделка`);
  await sql`update desk_account set cash = cash - ${sized.fee} where id = 1`;
  return readBook();
}

export async function placeClose(data: { id: string; price: number; reason: ExitReason }): Promise<DeskBook> {
  const sql = await getSql();
  const book = await readBook();
  const trade = book.open.find((item) => item.id === data.id);
  if (!trade) throw new Error("Сделка уже закрыта");
  const result = tradePnl(trade.side, trade.qty, trade.priceOpen, data.price, book.account.commissionPct);
  const cashDelta = result.gross - result.feeClose;
  const heldMs = trade.openedAt > 0 ? Date.now() - trade.openedAt : 0;
  const lesson =
    result.pnl < 0
      ? explainLoss({
          ticker: trade.ticker,
          side: trade.side,
          entry: trade.priceOpen,
          stop: trade.stop,
          exit: data.price,
          heldMs,
        })
      : null;
  await sql`
    update trades
    set price_close = ${data.price},
        closed_at = now(),
        pnl = ${result.pnl},
        commission = ${result.commission},
        reason = ${data.reason},
        lesson = ${lesson}
    where id = ${data.id} and closed_at is null
  `;
  await sql`update desk_account set cash = cash + ${cashDelta} where id = 1`;
  return readBook();
}
export const openTrade = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const source = input as {
      ticker?: unknown;
      side?: unknown;
      price?: unknown;
      via?: unknown;
      lot?: unknown;
      stop?: unknown;
    };
    const ticker = typeof source.ticker === "string" ? source.ticker : "";
    const side: Side = source.side === "short" ? "short" : "long";
    const via: Via = source.via === "hand" ? "hand" : "agent";
    const price = typeof source.price === "number" ? source.price : 0;
    const lot = typeof source.lot === "number" ? source.lot : 1;
    const stop = typeof source.stop === "number" && source.stop > 0 ? source.stop : 0;
    if (!knownTicker(ticker) || !(price > 0)) throw new Error("Некорректная заявка");
    return { ticker, side, via, price, lot: lot > 0 ? lot : 1, stop };
  })
  .handler(async ({ data }): Promise<DeskBook> => placeOpen(data));

export const closeTrade = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const source = input as { id?: unknown; price?: unknown; reason?: unknown };
    const id = typeof source.id === "string" ? source.id : "";
    const price = typeof source.price === "number" ? source.price : 0;
    const reason: ExitReason =
      source.reason === "target" || source.reason === "stop" || source.reason === "manual" ? source.reason : "manual";
    if (!id || !(price > 0)) throw new Error("Нечем закрывать");
    return { id, price, reason };
  })
  .handler(async ({ data }): Promise<DeskBook> => placeClose(data));

