import { create } from "zustand";
import { persist } from "zustand/middleware";
import { study, type Read } from "@/lib/analyze";
import { decide, livePnl, lostTickersToday, SAME_SIDE_CAP, STRONG_SCORE, type Bias, type Side } from "@/lib/broker";
import type { Interval, Snapshot, Venue } from "@/lib/market";
import { listOf, unitOf } from "@/lib/market";
import { formatQty } from "@/lib/format";
import { loadMarket, loadQuotes } from "@/lib/moex.functions";
import { closeTrade, loadDesk, openTrade, saveAccount, type Account, type DeskBook, type TradeRow } from "@/lib/trades.functions";

const snapMemory = new Map<string, { at: number; snap: Snapshot }>();
let paintSeq = 0;

export function rememberSnap(snap: Snapshot): void {
  snapMemory.set(`${snap.ticker}:${snap.interval}`, { at: Date.now(), snap });
}

export function recallSnap(ticker: string, interval: string): Snapshot | null {
  const hit = snapMemory.get(`${ticker}:${interval}`);
  if (!hit || Date.now() - hit.at > 30 * 60_000) return null;
  return hit.snap;
}

export type Settings = {
  venue: Venue;
  ticker: string;
  interval: Interval;
  agentOn: boolean;
  aiBias: Bias | null;
  aiNote: string;
};

export type LogLine = { id: string; t: number; text: string };

export type Mark = { bid: number; ask: number; last: number };

type DeskState = {
  booted: boolean;
  busy: boolean;
  settings: Settings;
  account: Account;
  open: TradeRow[];
  closed: TradeRow[];
  snap: Snapshot | null;
  read: Read | null;
  logs: LogLine[];
  notice: string | null;
  feedError: string | null;
  updatedAt: number;
  smooth: number;
  streakSide: Side | null;
  streakN: number;
  holdNote: string | null;
  marks: Record<string, Mark>;
  boot: () => Promise<void>;
  tick: (snap: Snapshot) => Promise<void>;
  setTicker: (ticker: string) => void;
  setVenue: (venue: Venue) => void;
  setInterval: (interval: Interval) => void;
  toggleAgent: () => void;
  setBias: (bias: Bias | null, note?: string) => void;
  patchAccount: (patch: Partial<Account>) => Promise<void>;
  manualOpen: (side: Side) => Promise<void>;
  manualClose: (id: string) => Promise<void>;
  dismissNotice: () => void;
};

const SETTINGS: Settings = {
  venue: "moex",
  ticker: "LKOH",
  interval: "5",
  agentOn: true,
  aiBias: null,
  aiNote: "",
};

const ACCOUNT: Account = {
  capital: 1_000_000,
  cash: 1_000_000,
  commissionPct: 0.05,
  riskPct: 0.6,
  sizePct: 20,
  agentOn: true,
};

function log(logs: LogLine[], text: string): LogLine[] {
  const now = Date.now();
  return [{ id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, t: now, text }, ...logs].slice(0, 40);
}

function sideWord(side: Side): string {
  return side === "long" ? "лонг" : "шорт";
}

function reasonWord(reason: string | null): string {
  if (reason === "target") return "тейк 1:3";
  if (reason === "stop") return "стоп";
  if (reason === "manual") return "вручную";
  return "закрытие";
}

function applyBook(book: DeskBook): Partial<DeskState> {
  return { account: book.account, open: book.open, closed: book.closed };
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      booted: false,
      busy: false,
      settings: SETTINGS,
      account: ACCOUNT,
      open: [],
      closed: [],
      snap: null,
      read: null,
      logs: [],
      notice: null,
      feedError: null,
      updatedAt: 0,
      smooth: 0,
      streakSide: null,
      streakN: 0,
      holdNote: null,
      marks: {},

      boot: async () => {
        const interval = get().settings.interval;
        if (interval !== "5" && interval !== "10" && interval !== "15" && interval !== "30" && interval !== "60" && interval !== "24") {
          set({ settings: { ...get().settings, interval: "5" } });
        }
        try {
          const book = await loadDesk();
          const settings = get().settings;
          const onMoex = listOf("moex").some((item) => item.id === settings.ticker);
          set({
            ...applyBook(book),
            settings: {
              ...settings,
              venue: "moex",
              ticker: onMoex ? settings.ticker : "LKOH",
              agentOn: book.account.agentOn,
            },
            booted: true,
          });
        } catch (error) {
          set({
            booted: true,
            feedError: error instanceof Error ? error.message : "База журнала недоступна",
          });
        }
      },

      tick: async (snap) => {
        const state = get();
        if (!state.booted || snap.ticker !== state.settings.ticker || snap.interval !== state.settings.interval) return;
        const mine = ++paintSeq;
        snapMemory.set(`${snap.ticker}:${snap.interval}`, { at: Date.now(), snap });
        const read = study(snap);
        const smooth = state.updatedAt === 0 ? read.score : state.smooth * 0.45 + read.score * 0.55;
        const held = state.open.find((trade) => trade.ticker === snap.ticker) ?? null;
        const decision = decide({
          inPosition: Boolean(held),
          side: held?.side ?? null,
          stop: held?.stop ?? 0,
          target: held?.target ?? 0,
          bid: snap.bid,
          ask: snap.ask,
          last: snap.last,
          agentOn: state.settings.agentOn,
          session: snap.session,
          call: read.tradable ? read.call : "flat",
          score: smooth,
          bias: state.settings.aiBias,
          streakSide: state.streakSide,
          streakN: state.streakN,
        });
        const holdNote = decision.holdNote ?? read.block;
        const marks = {
          ...state.marks,
          [snap.ticker]: { bid: snap.bid, ask: snap.ask, last: snap.last },
        };
        set({
          snap,
          read,
          smooth,
          marks,
          streakSide: decision.streakSide,
          streakN: decision.streakN,
          holdNote,
          updatedAt: Date.now(),
          feedError: null,
        });
        const book = await loadDesk().catch(() => null);
        if (mine !== paintSeq || get().settings.ticker !== snap.ticker) return;
        if (book) {
          set({
            ...applyBook(book),
            settings: { ...get().settings, agentOn: book.account.agentOn },
          });
        }
        if (mine !== paintSeq || get().settings.ticker !== snap.ticker) return;
        const liveBook = book ?? { open: get().open, closed: get().closed, account: get().account };
        const stillHeld = liveBook.open.find((trade) => trade.ticker === snap.ticker) ?? null;
        if (decision.intent.type === "close" && stillHeld) {
          const price = stillHeld.side === "long" ? snap.bid || snap.last : snap.ask || snap.last;
          if (price > 0) await closeAndRemember(stillHeld.id, price, decision.intent.reason);
        } else if (decision.intent.type === "open" && !stillHeld && get().settings.agentOn) {
          const burned = lostTickersToday(liveBook.closed);
          if (burned.includes(snap.ticker)) {
            set({ holdNote: `${snap.ticker} уже закрывался в минус сегодня. Повторно не беру.` });
          } else {
          const side = decision.intent.side;
          const same = liveBook.open.filter((trade) => trade.side === side).length;
          if (same >= SAME_SIDE_CAP) {
            set({ holdNote: side === "short" ? "Уже два шорта. Третью такую же ставку не беру." : "Уже два лонга. Третью такую же ставку не беру." });
          } else {
            set({ holdNote: "Сигнал есть, отправляю заявку." });
            await openAndRemember(side, "agent", snap, read.planStop);
          }
          }
        }
        if (mine !== paintSeq) return;
        const others = (get().open).filter((trade) => trade.ticker !== snap.ticker);
        if (!others.length) return;
        try {
          const quotes = await loadQuotes({ data: { tickers: others.map((trade) => trade.ticker) } });
          if (mine !== paintSeq) return;
          const next = { ...get().marks };
          for (const quote of quotes) next[quote.ticker] = { bid: quote.bid, ask: quote.ask, last: quote.last };
          set({ marks: next });
        } catch {
          /* selected ticker still marks the account */
        }
      },

      setTicker: (ticker) => {
        const state = get();
        set({
          settings: { ...state.settings, ticker },
          feedError: null,
        });
      },

      setVenue: (venue) => {
        const state = get();
        const list = listOf(venue);
        const ticker = list.some((item) => item.id === state.settings.ticker) ? state.settings.ticker : (list[0]?.id ?? state.settings.ticker);
        set({
          settings: { ...state.settings, venue, ticker },
          snap: null,
          read: null,
          smooth: 0,
          streakSide: null,
          streakN: 0,
          feedError: null,
        });
      },

      setInterval: (interval) => {
        const state = get();
        set({
          settings: { ...state.settings, interval },
          snap: null,
          read: null,
          smooth: 0,
          streakSide: null,
          streakN: 0,
        });
      },

      toggleAgent: () => {
        const state = get();
        const agentOn = !state.settings.agentOn;
        set({
          settings: { ...state.settings, agentOn },
          streakSide: null,
          streakN: 0,
          logs: log(state.logs, agentOn ? "Агент включён и сам ведёт сделки." : "Агент выключен. Открытые сделки закроет по тейку или стопу."),
        });
        void saveAccount({ data: { agentOn } })
          .then((book) => useDesk.setState({ ...applyBook(book), settings: { ...useDesk.getState().settings, agentOn: book.account.agentOn } }))
          .catch((error: unknown) => {
            useDesk.setState({
              settings: { ...useDesk.getState().settings, agentOn: !agentOn },
              notice: error instanceof Error ? error.message : "Не записал переключатель",
            });
          });
      },

      setBias: (bias, note) => {
        const state = get();
        set({
          settings: { ...state.settings, aiBias: bias, aiNote: note ?? state.settings.aiNote },
          streakSide: null,
          streakN: 0,
        });
      },

      patchAccount: async (patch) => {
        try {
          const book = await saveAccount({
            data: {
              commissionPct: patch.commissionPct,
              riskPct: patch.riskPct,
              sizePct: patch.sizePct,
              capital: patch.capital,
            },
          });
          set({ ...applyBook(book), notice: null });
        } catch (error) {
          set({ notice: error instanceof Error ? error.message : "Не сохранилось" });
        }
      },

      manualOpen: async (side) => {
        const snap = get().snap;
        if (!snap) {
          set({ notice: "Нет котировки" });
          return;
        }
        await openAndRemember(side, "hand", snap);
      },

      manualClose: async (id) => {
        const state = get();
        const trade = state.open.find((item) => item.id === id);
        if (!trade) return;
        const snap = state.snap;
        let price = 0;
        if (snap && snap.ticker === trade.ticker) {
          price = trade.side === "long" ? snap.bid || snap.last : snap.ask || snap.last;
        } else {
          try {
            const quotes = await loadQuotes({ data: { tickers: [trade.ticker] } });
            const quote = quotes[0];
            price = quote ? (trade.side === "long" ? quote.bid || quote.last : quote.ask || quote.last) : 0;
          } catch (error) {
            set({ notice: error instanceof Error ? error.message : "Нет цены закрытия" });
            return;
          }
        }
        if (!(price > 0)) {
          set({ notice: "Нет цены закрытия" });
          return;
        }
        await closeAndRemember(id, price, "manual");
      },

      dismissNotice: () => set({ notice: null }),
    }),
    {
      name: "ordo-desk-v2",
      skipHydration: true,
      partialize: (state) => ({ settings: state.settings, logs: state.logs }),
    },
  ),
);

async function openAndRemember(side: Side, via: "agent" | "hand", snap: Snapshot, stop = 0) {
  const state = useDesk.getState();
  if (state.busy) return;
  const price = side === "long" ? snap.ask || snap.last : snap.bid || snap.last;
  if (!(price > 0)) {
    useDesk.setState({ notice: "Нет цены входа" });
    return;
  }
  useDesk.setState({ busy: true });
  try {
    const book = await openTrade({
      data: { ticker: snap.ticker, side, price, via, lot: snap.lot, stop: stop > 0 ? stop : undefined },
    });
    const opened = book.open.find((trade) => trade.ticker === snap.ticker);
    useDesk.setState({
      ...applyBook(book),
      busy: false,
      streakN: 0,
      logs: log(
        useDesk.getState().logs,
        `Вход · ${sideWord(side)} ${snap.ticker} · ${formatQty(opened?.qty ?? 0)} · стоп ${opened ? opened.stop.toFixed(2) : "—"} · тейк ${opened ? opened.target.toFixed(2) : "—"}`,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось открыть";
    if (via === "agent" && message.includes("уже есть")) {
      const book = await loadDesk().catch(() => null);
      useDesk.setState({ busy: false, ...(book ? applyBook(book) : {}), notice: null });
      return;
    }
    useDesk.setState({
      busy: false,
      notice: message,
    });
  }
}

export { STRONG_SCORE, livePnl, loadMarket };

async function closeAndRemember(id: string, price: number, reason: "target" | "stop" | "manual") {
  const state = useDesk.getState();
  if (state.busy) return;
  const trade = state.open.find((item) => item.id === id);
  useDesk.setState({ busy: true });
  try {
    const book = await closeTrade({ data: { id, price, reason } });
    const closed = book.closed.find((item) => item.id === id);
    const pnl = closed?.pnl ?? 0;
    useDesk.setState({
      ...applyBook(book),
      busy: false,
      logs: log(
        useDesk.getState().logs,
        `Выход · ${reasonWord(reason)} · ${trade?.ticker ?? ""} · ${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(2)} ${unitOf(trade?.ticker ?? "")}`,
      ),
    });
  } catch (error) {
    useDesk.setState({
      busy: false,
      notice: error instanceof Error ? error.message : "Не удалось закрыть",
    });
  }
}
