import { useEffect, useState } from "react";
import clsx from "clsx";
import { Activity, Bot, Rows3, ScrollText } from "lucide-react";
import { CandleChart, type Guide } from "@/components/candle-chart";
import { OrderBook } from "@/components/order-book";
import { briefMarket } from "@/lib/brief.functions";
import { agentLossesToday, livePnl, moscowDay, STRONG_SCORE, type Bias, type Side } from "@/lib/broker";
import { clamp, formatPct, formatPx, formatQty, formatSigned, formatStamp, formatTime, formatUsd } from "@/lib/format";
import { INTERVALS, listOf, sessionPhase, unitOf, type Interval } from "@/lib/market";
import { loadLooks, type LookRow } from "@/lib/moex.functions";
import { loadMarket, rememberSnap, recallSnap, useDesk, type Mark } from "@/lib/store";
import type { TradeRow } from "@/lib/trades.functions";

type Tab = "chart" | "book" | "agent" | "journal";

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "chart", label: "График", icon: Activity },
  { id: "book", label: "Стакан", icon: Rows3 },
  { id: "agent", label: "Агент", icon: Bot },
  { id: "journal", label: "Журнал", icon: ScrollText },
];

function panel(tab: Tab, current: Tab): string {
  return tab === current ? "" : "max-lg:hidden";
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 22 - ((v - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-24" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.6}
        className={up ? "stroke-up" : "stroke-down"}
      />
    </svg>
  );
}

function Field({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input
        className="h-11 rounded-md border border-line bg-bg px-3 font-mono text-fg"
        type="number"
        inputMode="decimal"
        value={Number(value.toFixed(2))}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const n = Number(event.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

function biasWord(bias: Bias): string {
  if (bias === "long") return "только лонг";
  if (bias === "short") return "только шорт";
  return "вне рынка";
}

export function Desk() {
  const desk = useDesk();
  const [tab, setTab] = useState<Tab>("chart");
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [seed, setSeed] = useState(1_000_000);
  const [suggestion, setSuggestion] = useState<{ bias: Bias | null; note: string } | null>(null);
  const [looks, setLooks] = useState<LookRow[]>([]);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        await useDesk.persist.rehydrate();
      } catch {
        /* defaults */
      }
      if (!dead) await useDesk.getState().boot();
    })();
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!desk.booted) return;
    let dead = false;
    const names = listOf("moex").map((item) => item.id);
    let index = 0;
    const pump = () => {
      if (dead || index >= names.length) return;
      const batch = names.slice(index, index + 3);
      index += 3;
      void Promise.all(
        batch.map(async (ticker) => {
          try {
            const snap = await loadMarket({ data: { ticker, interval: useDesk.getState().settings.interval } });
            if (!dead) rememberSnap(snap);
          } catch {
            /* the next pass fills this name */
          }
        }),
      ).finally(() => {
        if (!dead) window.setTimeout(pump, 400);
      });
    };
    const start = window.setTimeout(pump, 600);
    return () => {
      dead = true;
      window.clearTimeout(start);
    };
  }, [desk.booted, desk.settings.interval]);

  useEffect(() => {
    if (!desk.booted) return;
    let dead = false;
    let timer = 0;
    let delay = 800;
    const run = async () => {
      if (dead) return;
      const { settings } = useDesk.getState();
      const remembered = recallSnap(settings.ticker, settings.interval);
      if (remembered) void useDesk.getState().tick(remembered);
      try {
        const snap = await loadMarket({ data: { ticker: settings.ticker, interval: settings.interval } });
        if (!dead) {
          await useDesk.getState().tick(snap);
          delay = snap.session ? 5000 : 15000;
        }
      } catch (err) {
        if (!dead) {
          useDesk.setState({ feedError: err instanceof Error ? err.message : "Нет котировок" });
          delay = Math.min(Math.round(delay * 1.6), 20000);
        }
      }
      if (!dead) timer = window.setTimeout(run, delay);
    };
    void run();
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [desk.booted, desk.settings.ticker, desk.settings.interval, desk.settings.venue]);

  useEffect(() => {
    if (!desk.booted) return;
    let dead = false;
    let timer = 0;
    const run = async () => {
      try {
        const rows = await loadLooks();
        if (!dead) setLooks(rows);
      } catch {
        /* the walk appears on the next poll */
      }
      if (!dead) timer = window.setTimeout(run, 4000);
    };
    void run();
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [desk.booted]);

  useEffect(() => {
    if (!desk.notice) return;
    const timer = window.setTimeout(() => useDesk.getState().dismissNotice(), 4200);
    return () => window.clearTimeout(timer);
  }, [desk.notice]);

  const snap = desk.snap;
  const matched =
    snap && snap.ticker === desk.settings.ticker && snap.interval === desk.settings.interval ? snap : null;
  const quote = matched ?? recallSnap(desk.settings.ticker, desk.settings.interval);
  const switching = !quote;
  const read = matched ? desk.read : null;
  const position = desk.open.find((trade) => trade.ticker === desk.settings.ticker) ?? null;
  const bid = quote?.bid || quote?.last || 0;
  const askPx = quote?.ask || quote?.last || 0;
  const marked = position ? livePnl(position.side, position.qty, position.priceOpen, position.commission, bid, askPx, quote?.last ?? 0, desk.account.commissionPct) : null;
  const pnl = marked?.pnl ?? 0;
  const floating = (trade: TradeRow): number | null => {
    const mark: Mark | undefined =
      trade.ticker === quote?.ticker ? { bid, ask: askPx, last: quote?.last ?? 0 } : desk.marks[trade.ticker];
    if (!mark) return null;
    const px = trade.side === "long" ? mark.bid || mark.last : mark.ask || mark.last;
    if (!(px > 0)) return null;
    return livePnl(trade.side, trade.qty, trade.priceOpen, trade.commission, mark.bid, mark.ask, mark.last, desk.account.commissionPct).pnl;
  };
  const equity = desk.account.cash + desk.open.reduce((sum, trade) => {
    const live = floating(trade);
    return sum + (live == null ? 0 : live + trade.commission);
  }, 0);
  const lossToday = agentLossesToday(desk.closed);
  const live = Boolean(quote?.session) && desk.updatedAt > 0 && Date.now() - desk.updatedAt < 20_000 && !desk.feedError;
  const need = Math.abs(desk.smooth) >= STRONG_SCORE ? 1 : 2;
  const wins = desk.closed.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losses = desk.closed.filter((trade) => (trade.pnl ?? 0) < 0).length;
  const net = desk.closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const todayKey = moscowDay(Date.now());
  const todayClosed = desk.closed.filter((trade) => trade.closedAt != null && moscowDay(trade.closedAt) === todayKey);
  const todayPnl = todayClosed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  const guides: Guide[] = [];
  if (position) {
    guides.push({ price: position.priceOpen, label: "Вход", tone: "warn" });
    guides.push({ price: position.target, label: "Тейк", tone: "up" });
    guides.push({ price: position.stop, label: "Стоп", tone: "down" });
  }

  const span = position ? Math.abs(position.target - position.priceOpen) + Math.abs(position.priceOpen - position.stop) : 0;
  const progress = position && span > 0
    ? clamp(((pnl + Math.abs(position.priceOpen - position.stop) * position.qty) / (span * position.qty)) * 100, 0, 100)
    : 0;

  let phase = "Ищет вход";
  if (position) phase = position.side === "long" ? "В лонге" : "В шорте";
  else if (!quote?.session) phase = "Ждёт сессию";
  else if (!desk.settings.agentOn) phase = "Выключен";
  else if (desk.streakN > 0 && desk.streakSide) {
    phase = desk.streakN >= need
      ? (desk.streakSide === "short" ? "Сигнал на шорт" : "Сигнал на лонг")
      : `Подтверждение ${desk.streakN}/${need}`;
  }

  async function askModel() {
    if (!quote || !read || asking) return;
    setAsking(true);
    setAiError(null);
    const prompt = [
      `Рынок ${quote.ticker} ${quote.name}. Цена ${quote.last.toFixed(2)} ${quote.unit}. Сутки ${quote.changePct.toFixed(2)}%.`,
      `Дневных свечей ${read.dailyBars}, внутри дня ${read.intraBars}. Дневной тренд ${read.trend.toFixed(4)}, RSI ${read.rsi.toFixed(0)}, ATR ${read.atr.toFixed(1)}, стакан ${read.imbalance.toFixed(2)}, скор ${desk.smooth.toFixed(0)}, вывод ${read.call}.`,
      position
        ? `Открыт ${position.side} от ${position.priceOpen.toFixed(2)}, результат ${pnl.toFixed(0)} ${position.ticker.endsWith("USDT") ? "USDT" : "₽"}. Стоп ${position.stop.toFixed(2)}, тейк ${position.target.toFixed(2)}.`
        : "Позиции по этому тикеру нет.",
      `Риск ${desk.account.riskPct}% цены, тейк всегда ×3, комиссия ${desk.account.commissionPct}% на сторону.`,
    ].join(" ");
    try {
      const result = await briefMarket({ data: { prompt } });
      if (!result.ok) {
        setAiError(result.error);
        setSuggestion(null);
      } else {
        setSuggestion({ bias: result.bias, note: result.note });
      }
    } catch {
      setAiError("Не удалось спросить ИИ");
    } finally {
      setAsking(false);
    }
  }

  const unit = "₽";
  const sessionNow = sessionPhase();
  const phaseText =
    sessionNow === "morning"
      ? "утренняя сессия"
      : sessionNow === "evening"
        ? "вечерняя сессия"
        : sessionNow === "weekend"
          ? "выходные торги"
          : sessionNow === "main"
            ? "основная сессия"
            : "торги закрыты";

  return (
    <div className="fixed inset-0 flex min-w-0 flex-col overflow-hidden bg-bg text-fg">
      <header className="z-20 shrink-0 border-b border-line bg-bg">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-2">
          <div className="grid min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">ORDO</h1>
              <span
                className={clsx("size-2 rounded-full", live ? "live-dot bg-up" : "bg-warn")}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-muted">
                {desk.feedError ? "нет связи" : !desk.booted ? "подключение" : phaseText}
              </span>
            </div>
            <p className="hidden max-w-xl text-sm text-muted sm:block">
              Акции Мосбиржи: утро с 6:50, день до 19:00, вечер до 23:50. Вход только по тренду, со стороны VWAP и со стопом шире шума. Тейк в три стопа.
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <div className="font-mono text-xs text-muted">Счёт, {unit}</div>
              <div className="font-mono text-xl font-medium tabular-nums">{formatUsd(equity)}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-muted">Открыто</div>
              <div className="font-mono text-xl font-medium tabular-nums">{desk.open.length}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-muted">Журнал</div>
              <div className={clsx("font-mono text-xl font-medium tabular-nums", net >= 0 ? "text-up" : "text-down")}>
                {formatSigned(net)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2 border-t border-line px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-2xl font-medium tabular-nums">
                {quote ? formatPx(quote.last) : switching ? "…" : "—"}
              </div>
              <div className={clsx("font-mono text-sm tabular-nums", (quote?.changePct ?? 0) >= 0 ? "text-up" : "text-down")}>
                {switching
                  ? `грузим ${desk.settings.ticker}`
                  : quote
                    ? formatPct(quote.changePct)
                    : "—"}
                {quote ? " к закрытию" : ""}
                {quote ? <span className="text-muted"> · {quote.name}</span> : null}
              </div>
            </div>
            <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
              {INTERVALS.map((item) => {
                const on = desk.settings.interval === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => desk.setInterval(item.id as Interval)}
                    className={clsx(
                      "min-h-11 shrink-0 rounded-md border px-3 font-mono text-sm",
                      on ? "border-line bg-surface-2 text-fg" : "border-transparent text-muted",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1">
            {listOf("moex").map((item) => {
              const on = desk.settings.ticker === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => desk.setTicker(item.id)}
                  className={clsx(
                    "min-h-11 shrink-0 rounded-md border px-3 font-mono text-sm",
                    on ? "border-line bg-surface-2 text-fg" : "border-transparent text-muted",
                  )}
                >
                  {item.id}
                </button>
              );
            })}
          </div>
        </div>
        {desk.notice ? (
          <p className="border-t border-line px-4 py-2 text-sm text-warn">{desk.notice}</p>
        ) : null}
        {desk.feedError ? (
          <p className="border-t border-line px-4 py-2 text-sm text-warn">{desk.feedError}</p>
        ) : null}
      </header>

      <main className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 lg:grid-cols-4 lg:grid-rows-none lg:overflow-y-auto">
        <section className={clsx("min-h-0 min-w-0 overflow-hidden rounded-lg border border-line bg-surface lg:col-span-3", panel("chart", tab))}>
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">График</h2>
            <p className="font-mono text-xs text-muted">
              {switching ? `грузим ${desk.settings.ticker}` : (
                <>
                  <span className="text-warn">EMA 9</span>
                  <span> · EMA 21</span>
                  {desk.updatedAt ? ` · ${formatTime(desk.updatedAt)}` : ""}
                </>
              )}
            </p>
          </div>
          <div>
            <CandleChart
              candles={quote?.candles ?? []}
              fast={quote ? (read?.emaFast ?? []) : []}
              slow={quote ? (read?.emaSlow ?? []) : []}
              guides={quote ? guides : []}
            />
          </div>
        </section>

        <section className={clsx("min-h-0 min-w-0 overflow-y-auto rounded-lg border border-line bg-surface lg:col-span-1", panel("book", tab))}>
          <div className="border-b border-line px-3 py-2">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Стакан</h2>
            {quote && !quote.session ? (
              <p className="mt-1 text-xs text-muted">Вне сессии стакан пуст. Ниже последние сделки.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Лучшая цена и объём стороны с биржи. Лесенка Тинькофф появится вместе с токеном.</p>
            )}
          </div>
          <div className="py-2">
            <OrderBook
              bids={quote?.bids ?? []}
              asks={quote?.asks ?? []}
              tape={quote?.tape ?? []}
              spreadBps={quote && quote.bid > 0 && quote.ask > 0 ? (read?.spreadBps ?? null) : null}
            />
          </div>
        </section>

        <section className={clsx("min-h-0 min-w-0 overflow-y-auto rounded-lg border border-line bg-surface lg:col-span-2", panel("agent", tab))}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Агент</h2>
            <button
              type="button"
              aria-pressed={desk.settings.agentOn}
              onClick={() => desk.toggleAgent()}
              className={clsx(
                "min-h-11 rounded-md border px-3 text-sm",
                desk.settings.agentOn ? "border-up text-up" : "border-line text-muted",
              )}
            >
              {desk.settings.agentOn ? "Включён" : "Выключен"}
            </button>
          </div>
          <p className="border-b border-line px-3 py-2 text-xs text-muted">
            Работает, пока открыта эта страница: сигнал по текущей бумаге сам уходит в заявку. Остальной список без страницы обходит только служба на твоём сервере.
          </p>
          <div className="grid gap-4 p-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-muted">Состояние</div>
                <div className="text-lg font-medium">{phase}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-muted">Скор</div>
                <div
                  className={clsx(
                    "font-mono text-lg tabular-nums",
                    desk.smooth > 8 ? "text-up" : desk.smooth < -8 ? "text-down" : "text-fg",
                  )}
                >
                  {read ? `${desk.smooth >= 0 ? "+" : "−"}${Math.abs(desk.smooth).toFixed(0)}` : "—"}
                </div>
              </div>
            </div>
            <div className="relative h-2 rounded-full bg-bg">
              <div className="absolute top-0 left-1/2 h-full w-px bg-line" />
              <div
                className={clsx("absolute top-0 h-full", desk.smooth >= 0 ? "bg-up" : "bg-down")}
                style={
                  desk.smooth >= 0
                    ? { left: "50%", width: `${Math.min(50, Math.abs(desk.smooth) / 2)}%` }
                    : { right: "50%", width: `${Math.min(50, Math.abs(desk.smooth) / 2)}%` }
                }
              />
            </div>
            {desk.holdNote ? <p className="text-sm text-warn">{desk.holdNote}</p> : null}
            <p className="font-mono text-xs text-muted">
              Убытков агента сегодня {lossToday}. Новые входы из-за них не останавливаются.
            </p>
            <div>
              <h3 className="mb-1 font-mono text-xs tracking-widest text-muted uppercase">Обход</h3>
              {looks.length === 0 ? (
                <p className="text-sm text-muted">Служба списка ещё молчит. Заявка по бумаге на экране уйдёт отсюда, если сигнал подтверждён.</p>
              ) : (
                <ul className="grid max-h-40 gap-1 overflow-auto">
                  {looks.map((row) => (
                    <li key={`${row.t}-${row.ticker}`} className="font-mono text-xs">
                      <span className="text-muted">{formatTime(row.t)} </span>
                      <span className="text-fg">{row.ticker}</span>
                      <span className="text-muted"> · {row.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {read ? <p className="text-sm text-fg">{read.note}</p> : null}
            {read ? (
              <p className="font-mono text-xs text-muted">
                История: {read.dailyBars} дневных свечей · {read.intraBars} на графике
              </p>
            ) : null}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(read?.factors ?? []).map((factor) => (
                <li key={factor.id} className="rounded-md border border-line bg-bg px-2 py-2">
                  <div className="text-xs text-muted">{factor.label}</div>
                  <div
                    className={clsx(
                      "font-mono text-sm",
                      factor.tone === "up" ? "text-up" : factor.tone === "down" ? "text-down" : "text-fg",
                    )}
                  >
                    {factor.detail}
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-md border border-line bg-bg p-3">
              {position ? (
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted">
                        {position.side === "long" ? "Лонг" : "Шорт"} {position.ticker} · {formatQty(position.qty)} · вход{" "}
                        {formatPx(position.priceOpen)}
                      </div>
                      <div className={clsx("font-mono text-xl tabular-nums", pnl >= 0 ? "text-up" : "text-down")}>
                        {formatSigned(pnl)} {unitOf(position.ticker)}
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-muted">
                      <div>Тейк {formatPx(position.target)}</div>
                      <div>Стоп {formatPx(position.stop)}</div>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className={clsx("h-full", pnl >= 0 ? "bg-up" : "bg-down")} style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-sm text-muted">Стоп и тейк 1 к 3 от цены входа. Комиссия уже в результате.</p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  По этому тикеру пусто. Агент сам войдёт, когда дневки и час смотрят в одну сторону. Размер{" "}
                  {desk.account.sizePct}% капитала, риск {desk.account.riskPct}% цены.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void desk.manualOpen("long" as Side)}
                  className="min-h-11 rounded-md border border-up px-3 text-sm text-up"
                >
                  Купить
                </button>
                <button
                  type="button"
                  onClick={() => void desk.manualOpen("short" as Side)}
                  className="min-h-11 rounded-md border border-down px-3 text-sm text-down"
                >
                  Шорт
                </button>
                <button
                  type="button"
                  disabled={!position}
                  onClick={() => position && void desk.manualClose(position.id)}
                  className="min-h-11 rounded-md border border-line px-3 text-sm text-fg disabled:opacity-40"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Риск, % от цены"
                value={desk.account.riskPct}
                step={0.05}
                min={0.15}
                max={3}
                onChange={(riskPct) => void desk.patchAccount({ riskPct })}
              />
              <Field
                label="Комиссия брокера, % на сторону"
                value={desk.account.commissionPct}
                step={0.01}
                min={0}
                max={1}
                onChange={(commissionPct) => void desk.patchAccount({ commissionPct })}
              />
              <Field
                label="Размер позиции, % капитала"
                value={desk.account.sizePct}
                step={1}
                min={1}
                max={100}
                onChange={(sizePct) => void desk.patchAccount({ sizePct })}
              />
              <Field
                label="Новый капитал, ₽"
                value={seed}
                step={100000}
                min={10000}
                max={100000000}
                onChange={setSeed}
              />
            </div>
            <button
              type="button"
              onClick={() => void desk.patchAccount({ capital: seed })}
              className="min-h-11 self-start rounded-md border border-line px-3 text-sm"
            >
              Записать капитал
            </button>
            <p className="text-xs text-muted">
              Тейк агента считается от уровня: риск это расстояние до стопа, цель в три раза дальше. Ручная кнопка берёт риск {desk.account.riskPct}% цены. Комиссия списывается и на вход, и на выход.
            </p>

            <div className="grid gap-2 border-t border-line pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Разбор ИИ</h3>
                <button
                  type="button"
                  disabled={asking || !quote}
                  onClick={() => void askModel()}
                  className="min-h-11 rounded-md border border-line px-3 text-sm disabled:opacity-40"
                >
                  {asking ? "Смотрит…" : "Спросить"}
                </button>
              </div>
              <p className="text-xs text-muted">
                Запрос только по кнопке и только как смещение. Сделки открывает и закрывает агент сам.
              </p>
              {desk.settings.aiBias ? (
                <p className="text-sm">
                  Активно: {biasWord(desk.settings.aiBias)}. {desk.settings.aiNote}
                </p>
              ) : null}
              {suggestion ? (
                <div className="rounded-md border border-line bg-bg p-3 text-sm">
                  <p>{suggestion.note}</p>
                  {suggestion.bias ? (
                    <button
                      type="button"
                      className="mt-2 min-h-11 rounded-md border border-line px-3"
                      onClick={() => {
                        desk.setBias(suggestion.bias, suggestion.note);
                        setSuggestion(null);
                      }}
                    >
                      Принять: {biasWord(suggestion.bias)}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {aiError ? <p className="text-sm text-warn">{aiError}</p> : null}
              {desk.settings.aiBias ? (
                <button
                  type="button"
                  onClick={() => desk.setBias(null, "")}
                  className="min-h-11 self-start rounded-md border border-line px-3 text-sm text-muted"
                >
                  Сбросить смещение
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className={clsx("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface lg:col-span-2", panel("journal", tab))}>
          <div className="shrink-0 border-b border-line px-3 py-2">
            <h2 className="font-mono text-xs tracking-widest text-muted uppercase">Журнал</h2>
            <p className="mt-1 font-mono text-xs text-muted">
              сегодня {todayClosed.length} · {formatSigned(todayPnl)} ₽ · всего плюс {wins} · минус {losses}
            </p>
          </div>
          <div className="shrink-0 border-b border-line p-3">
            <h3 className="mb-2 font-mono text-xs tracking-widest text-muted uppercase">Открытые</h3>
            {desk.open.length === 0 ? (
              <p className="text-sm text-muted">Открытых сделок нет.</p>
            ) : (
              <div className="grid max-h-48 gap-2 overflow-y-auto">
                {desk.open.map((trade) => {
                  const livePnlNow = floating(trade);
                  return (
                    <article key={trade.id} className="min-w-0 overflow-hidden rounded-md border border-line p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={clsx("font-mono text-sm", trade.side === "long" ? "text-up" : "text-down")}>
                            {trade.side === "long" ? "лонг" : "шорт"} {trade.ticker}
                          </div>
                          <p className="mt-1 font-mono text-xs break-words text-muted">
                            вход {formatPx(trade.priceOpen)} · {formatQty(trade.qty)} · {formatStamp(trade.openedAt)}
                          </p>
                        </div>
                        <div className={clsx("shrink-0 text-right font-mono text-sm", (livePnlNow ?? 0) >= 0 ? "text-up" : "text-down")}>
                          {livePnlNow == null ? "—" : `${formatSigned(livePnlNow)} ${unitOf(trade.ticker)}`}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-muted">
                        <span>стоп {formatPx(trade.stop)}</span>
                        <span>тейк {formatPx(trade.target)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void desk.manualClose(trade.id)}
                        className="mt-3 min-h-11 rounded-md border border-line px-3 text-xs"
                      >
                        Закрыть
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3">
            <ul className="grid gap-1">
              {desk.logs.length === 0 ? (
                <li className="text-sm text-muted">Агент ещё молчит. Решения появятся здесь.</li>
              ) : (
                desk.logs.map((line) => (
                  <li key={line.id} className="font-mono text-xs break-words text-fg">
                    <span className="text-muted">{formatTime(line.t)} </span>
                    {line.text}
                  </li>
                ))
              )}
            </ul>
            <div className="grid gap-2">
              {desk.closed.length === 0 ? (
                <p className="text-sm text-muted">Закрытых сделок нет.</p>
              ) : (
                desk.closed.map((trade) => (
                  <article key={trade.id} className="min-w-0 overflow-hidden rounded-md border border-line p-3 font-mono text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className={clsx("min-w-0", trade.side === "long" ? "text-up" : "text-down")}>
                        {trade.side === "long" ? "лонг" : "шорт"} {trade.ticker}
                      </div>
                      <div className={clsx("shrink-0", (trade.pnl ?? 0) >= 0 ? "text-up" : "text-down")}>
                        {formatSigned(trade.pnl ?? 0)} {unitOf(trade.ticker)}
                      </div>
                    </div>
                    <p className="mt-1 text-xs break-words text-muted">
                      вход {formatPx(trade.priceOpen)} · {formatQty(trade.qty)} · {formatStamp(trade.openedAt)}
                      {trade.closedAt ? ` → ${formatStamp(trade.closedAt)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">комиссия {formatUsd(trade.commission)}</p>
                    {trade.pnl != null && trade.pnl < 0 && trade.lesson ? (
                      <p className="mt-2 text-xs break-words text-warn">{trade.lesson}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <nav className="z-30 grid shrink-0 grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                "flex min-h-nav flex-col items-center justify-center gap-1 text-xs",
                on ? "text-fg" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
