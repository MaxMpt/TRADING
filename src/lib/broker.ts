export type Side = "long" | "short";
export type ExitReason = "target" | "stop" | "manual";
export type Via = "agent" | "hand";
export type Bias = "long" | "short" | "flat";
export type Call = "long" | "short" | "flat";

export const ENTRY_SCORE = 58;
export const STRONG_SCORE = 74;
export const SAME_SIDE_CAP = 2;

export function moscowDay(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export function explainLoss(input: {
  ticker: string;
  side: Side;
  entry: number;
  stop: number;
  exit: number;
  heldMs: number;
}): string {
  const risk = input.entry > 0 ? Math.abs(input.stop - input.entry) / input.entry : 0;
  const lines: string[] = [];
  if (risk > 0 && risk < 0.01) lines.push(`Стоп был всего ${(risk * 100).toFixed(2)}% от цены. Это шум, не уровень.`);
  if (input.heldMs >= 0 && input.heldMs < 20 * 60_000) lines.push("Цена пошла против почти сразу. Вход попал в пилу или в устаревшую котировку.");
  if (input.side === "short" && input.exit > input.entry) lines.push("После шорта покупатели продолжили вверх.");
  if (input.side === "long" && input.exit < input.entry) lines.push("После лонга продавцы продолжили вниз.");
  lines.push(`${input.ticker} сегодня повторно не беру. Новый шорт только ниже VWAP, лонг только выше, и только если ADX от 20.`);
  return lines.join(" ");
}

export function lostTickersToday(
  closed: { ticker: string; via: string; pnl: number | null; closedAt: number | null }[],
  now = Date.now(),
): string[] {
  const day = moscowDay(now);
  return closed
    .filter(
      (trade) =>
        trade.via === "agent" &&
        trade.pnl != null &&
        trade.pnl < 0 &&
        trade.closedAt != null &&
        moscowDay(trade.closedAt) === day,
    )
    .map((trade) => trade.ticker);
}

export function agentLossesToday(
  closed: { via: string; pnl: number | null; closedAt: number | null }[],
  now = Date.now(),
): number {
  const day = moscowDay(now);
  return closed.filter(
    (trade) =>
      trade.via === "agent" &&
      trade.pnl != null &&
      trade.pnl < 0 &&
      trade.closedAt != null &&
      moscowDay(trade.closedAt) === day,
  ).length;
}

export function brackets(side: Side, entry: number, riskPct: number): { stop: number; target: number } {
  const risk = riskPct / 100;
  if (side === "short") {
    return { stop: entry * (1 + risk), target: entry * (1 - 3 * risk) };
  }
  return { stop: entry * (1 - risk), target: entry * (1 + 3 * risk) };
}

export function tradePnl(
  side: Side,
  qty: number,
  entry: number,
  exit: number,
  commissionPct: number,
): { gross: number; feeOpen: number; feeClose: number; commission: number; pnl: number } {
  const gross = side === "long" ? (exit - entry) * qty : (entry - exit) * qty;
  const feeOpen = Math.abs(entry * qty) * (commissionPct / 100);
  const feeClose = Math.abs(exit * qty) * (commissionPct / 100);
  return { gross, feeOpen, feeClose, commission: feeOpen + feeClose, pnl: gross - feeOpen - feeClose };
}

export function sizeOrder(args: {
  cash: number;
  reserved: number;
  capital: number;
  sizePct: number;
  price: number;
  lot: number;
  commissionPct: number;
}): { qty: number; amount: number; fee: number } | { error: string } {
  const lot = args.lot > 0 ? args.lot : 1;
  const price = args.price;
  if (!(price > 0) || !(args.cash > 0)) return { error: "Нет цены для входа" };
  const room = Math.max(0, args.capital - args.reserved);
  const budget = Math.min(args.cash * (args.sizePct / 100), room);
  const lots = Math.floor(budget / (price * lot));
  if (lots < 1) return { error: "Не хватает свободных средств на один лот" };
  const digits = lot >= 1 ? 0 : Math.min(8, Math.ceil(-Math.log10(lot)));
  const qty = Math.round(lots * lot * 10 ** digits) / 10 ** digits;
  const amount = qty * price;
  const fee = amount * (args.commissionPct / 100);
  if (fee >= args.cash) return { error: "Комиссия больше свободных средств" };
  return { qty, amount, fee };
}

export function exitHit(
  side: Side,
  stop: number,
  target: number,
  bid: number,
  ask: number,
  last: number,
): ExitReason | null {
  const px = side === "long" ? bid || last : ask || last;
  if (!(px > 0) || !(stop > 0) || !(target > 0)) return null;
  if (side === "long") {
    if (px <= stop) return "stop";
    if (px >= target) return "target";
    return null;
  }
  if (px >= stop) return "stop";
  if (px <= target) return "target";
  return null;
}

export function livePnl(
  side: Side,
  qty: number,
  entry: number,
  commissionPaid: number,
  bid: number,
  ask: number,
  last: number,
  commissionPct: number,
): { pnl: number; px: number } {
  const px = side === "long" ? bid || last : ask || last;
  if (!(px > 0)) return { pnl: 0, px: last };
  const gross = side === "long" ? (px - entry) * qty : (entry - px) * qty;
  const feeClose = Math.abs(px * qty) * (commissionPct / 100);
  return { pnl: gross - commissionPaid - feeClose, px };
}

export type Intent =
  | { type: "none" }
  | { type: "close"; reason: ExitReason }
  | { type: "open"; side: Side };

export function decide(input: {
  inPosition: boolean;
  side: Side | null;
  stop: number;
  target: number;
  bid: number;
  ask: number;
  last: number;
  agentOn: boolean;
  session: boolean;
  call: Call;
  score: number;
  bias: Bias | null;
  streakSide: Side | null;
  streakN: number;
}): { intent: Intent; streakSide: Side | null; streakN: number; holdNote: string | null } {
  if (input.inPosition && input.side) {
    const hit = exitHit(input.side, input.stop, input.target, input.bid, input.ask, input.last);
    if (hit === "target" || hit === "stop") {
      return { intent: { type: "close", reason: hit }, streakSide: null, streakN: 0, holdNote: null };
    }
    return {
      intent: { type: "none" },
      streakSide: null,
      streakN: 0,
      holdNote: input.session ? null : "Позиция открыта. Цена обновится в сессию.",
    };
  }

  if (!input.agentOn) {
    return { intent: { type: "none" }, streakSide: null, streakN: 0, holdNote: null };
  }
  if (!input.session) {
    return {
      intent: { type: "none" },
      streakSide: null,
      streakN: 0,
      holdNote: "Торги закрыты. Утро с 6:50, основная до 19:00, вечерняя до 23:50 МСК. В выходные с 9:50 до 19:00.",
    };
  }
  if (input.call === "flat" || input.bias === "flat") {
    return {
      intent: { type: "none" },
      streakSide: null,
      streakN: 0,
      holdNote: input.bias === "flat" ? "Смещение ИИ: вне рынка" : "История не даёт перевеса. Жду.",
    };
  }

  let want: Side | null = null;
  if (input.call === "short" && input.score <= -ENTRY_SCORE && input.bias !== "long") want = "short";
  if (input.call === "long" && input.score >= ENTRY_SCORE && input.bias !== "short") want = "long";

  const need = Math.abs(input.score) >= STRONG_SCORE ? 1 : 2;
  let streakSide = input.streakSide;
  let streakN = input.streakN;
  if (want && streakSide === want) streakN = Math.min(streakN + 1, need);
  else if (want) {
    streakSide = want;
    streakN = 1;
  } else {
    streakSide = null;
    streakN = 0;
  }
  if (want && streakN >= need) {
    return { intent: { type: "open", side: want }, streakSide, streakN, holdNote: null };
  }
  return { intent: { type: "none" }, streakSide, streakN, holdNote: null };
}
