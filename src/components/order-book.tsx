import type { Level, TapePrint } from "@/lib/market";
import { formatPx, formatQty, formatTime } from "@/lib/format";

type Props = {
  bids: Level[];
  asks: Level[];
  tape: TapePrint[];
  spreadBps: number | null;
};

function Row({
  level,
  max,
  side,
}: {
  level: Level;
  max: number;
  side: "bid" | "ask";
}) {
  const width = max > 0 ? Math.min(100, (level.qty / max) * 100) : 0;
  return (
    <div className="relative flex h-7 items-center justify-between px-2 font-mono text-xs">
      <div
        className={
          side === "bid"
            ? "absolute inset-y-0 right-0 bg-up/15"
            : "absolute inset-y-0 right-0 bg-down/15"
        }
        style={{ width: `${width}%` }}
      />
      <span className={side === "bid" ? "relative text-up" : "relative text-down"}>{formatPx(level.price)}</span>
      <span className="relative text-fg">{formatQty(level.qty)}</span>
    </div>
  );
}

export function OrderBook({ bids, asks, tape, spreadBps }: Props) {
  const askRows = asks.slice(0, 11).reverse();
  const bidRows = bids.slice(0, 11);
  const max = Math.max(
    0,
    ...askRows.map((l) => l.qty),
    ...bidRows.map((l) => l.qty),
  );
  const prints = [...tape].reverse().slice(0, 14);

  return (
    <div className="grid gap-3">
      <div>
        <div className="mb-1 flex justify-between px-2 font-mono text-xs text-muted">
          <span>Цена</span>
          <span>Объём</span>
        </div>
        <div className="flex flex-col">
          {askRows.map((level) => (
            <Row key={`a-${level.price}`} level={level} max={max} side="ask" />
          ))}
        </div>
        <div className="my-1 flex items-center justify-between border-y border-line px-2 py-2 font-mono text-xs">
          <span className="text-muted">Спред</span>
          <span className="text-fg">{spreadBps === null ? "—" : `${spreadBps.toFixed(1)} б.п.`}</span>
        </div>
        <div className="flex flex-col">
          {bidRows.map((level) => (
            <Row key={`b-${level.price}`} level={level} max={max} side="bid" />
          ))}
        </div>
        {askRows.length === 0 && bidRows.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted">Стакан пуст.</p>
        ) : null}
      </div>
      <div>
        <h3 className="mb-1 px-2 font-mono text-xs tracking-widest text-muted uppercase">Лента</h3>
        <ul className="max-h-52 overflow-auto">
          {prints.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-2 py-1 font-mono text-xs">
              <span className={t.sell ? "text-down" : "text-up"}>{formatPx(t.price)}</span>
              <span className="text-fg">{formatQty(t.qty)}</span>
              <span className="text-muted">{formatTime(t.time)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
