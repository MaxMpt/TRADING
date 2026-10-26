export type Venue = "moex" | "crypto";

export const MOEX = [
  { id: "GAZP", name: "Газпром", lot: 10 },
  { id: "PLZL", name: "Полюс", lot: 1 },
  { id: "NVTK", name: "Новатэк", lot: 1 },
  { id: "LKOH", name: "Лукойл", lot: 1 },
  { id: "T", name: "Т-Технологии", lot: 1 },
  { id: "ROSN", name: "Роснефть", lot: 1 },
  { id: "OZON", name: "Ozon", lot: 1 },
  { id: "SBER", name: "Сбер", lot: 1 },
  { id: "YDEX", name: "Яндекс", lot: 1 },
  { id: "VTBR", name: "ВТБ", lot: 1 },
  { id: "IRAO", name: "Интер РАО", lot: 100 },
  { id: "MGNT", name: "Магнит", lot: 1 },
  { id: "GMKN", name: "Норникель", lot: 10 },
  { id: "VKCO", name: "VK", lot: 1 },
  { id: "ALRS", name: "Алроса", lot: 10 },
  { id: "RAGR", name: "Русагро", lot: 1 },
  { id: "X5", name: "X5", lot: 1 },
  { id: "MAGN", name: "ММК", lot: 10 },
  { id: "PHOR", name: "ФосАгро", lot: 1 },
  { id: "TATN", name: "Татнефть", lot: 1 },
  { id: "AFKS", name: "АФК Система", lot: 100 },
  { id: "AFLT", name: "Аэрофлот", lot: 10 },
  { id: "MTLR", name: "Мечел", lot: 1 },
  { id: "SFIN", name: "ЭсЭфАй", lot: 1 },
  { id: "RUAL", name: "Русал", lot: 10 },
  { id: "NLMK", name: "НЛМК", lot: 10 },
  { id: "SNGS", name: "Сургутнефтегаз", lot: 100 },
  { id: "CHMF", name: "Северсталь", lot: 1 },
  { id: "SNGSP", name: "Сургутнефтегаз-п", lot: 10 },
  { id: "TRNFP", name: "Транснефть-п", lot: 1 },
] as const;

export const CRYPTO = [
  { id: "BTCUSDT", name: "Bitcoin", lot: 0.001 },
  { id: "ETHUSDT", name: "Ethereum", lot: 0.01 },
  { id: "SOLUSDT", name: "Solana", lot: 0.1 },
  { id: "BNBUSDT", name: "BNB", lot: 0.01 },
  { id: "XRPUSDT", name: "XRP", lot: 1 },
  { id: "DOGEUSDT", name: "Dogecoin", lot: 1 },
  { id: "TONUSDT", name: "Toncoin", lot: 1 },
  { id: "AVAXUSDT", name: "Avalanche", lot: 0.1 },
] as const;

export const WATCH = MOEX;

export function listOf(venue: Venue) {
  return venue === "crypto" ? CRYPTO : MOEX;
}

export function venueOf(ticker: string): Venue | null {
  if (CRYPTO.some((item) => item.id === ticker)) return "crypto";
  if (MOEX.some((item) => item.id === ticker)) return "moex";
  return null;
}

export function lotStep(ticker: string): number {
  const item = [...CRYPTO, ...MOEX].find((row) => row.id === ticker);
  return item && item.lot > 0 ? item.lot : 1;
}

export function unitOf(ticker: string): string {
  return ticker.endsWith("USDT") ? "USDT" : "₽";
}

export const INTERVALS = [
  { id: "5", label: "5м" },
  { id: "10", label: "10м" },
  { id: "15", label: "15м" },
  { id: "30", label: "30м" },
  { id: "60", label: "1ч" },
  { id: "24", label: "1д" },
] as const;

export type Interval = (typeof INTERVALS)[number]["id"];

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Level = { price: number; qty: number };

export type TapePrint = {
  id: number;
  price: number;
  qty: number;
  time: number;
  sell: boolean;
};

export type Quote = {
  ticker: string;
  name: string;
  last: number;
  prev: number;
  bid: number;
  ask: number;
  changePct: number;
  lot: number;
  decimals: number;
  valueToday: number;
  session: boolean;
  unit: string;
};

export type Snapshot = Quote & {
  interval: Interval;
  candles: Candle[];
  daily: Candle[];
  bids: Level[];
  asks: Level[];
  tape: TapePrint[];
};

export type SessionPhase = "morning" | "main" | "evening" | "weekend" | "closed";

/** Moscow share session after the September 2026 schedule: morning 6:50, main until 19:00, evening until 23:50. Weekends 9:50–19:00. */
export function sessionPhase(now = Date.now()): SessionPhase {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = pick("weekday");
  const mins = Number(pick("hour")) * 60 + Number(pick("minute"));
  if (day === "Sat" || day === "Sun") return mins >= 9 * 60 + 50 && mins < 19 * 60 ? "weekend" : "closed";
  if (mins >= 6 * 60 + 50 && mins < 9 * 60) return "morning";
  if (mins >= 9 * 60 && mins < 19 * 60) return "main";
  if (mins >= 19 * 60 && mins < 23 * 60 + 50) return "evening";
  return "closed";
}

export function moexSession(now = Date.now()): boolean {
  return sessionPhase(now) !== "closed";
}

export function nameOf(ticker: string): string {
  return [...CRYPTO, ...MOEX].find((item) => item.id === ticker)?.name ?? ticker;
}
