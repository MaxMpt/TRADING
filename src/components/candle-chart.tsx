import { useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/market";
import { formatPx, formatTime } from "@/lib/format";

export type Guide = { price: number; label: string; tone: "up" | "down" | "warn" };

type Props = {
  candles: Candle[];
  fast: number[];
  slow: number[];
  guides: Guide[];
};

type Hover = { i: number; x: number; y: number };

const VIEW = 72;

export function CandleChart({ candles, fast, slow, guides }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vis = candles.slice(-VIEW);
  const fastVis = fast.slice(-vis.length);
  const slowVis = slow.slice(-vis.length);
  const w = box.w;
  const h = box.h;
  const padL = 8;
  const padR = 72;
  const padT = 16;
  const padB = 22;
  const volH = Math.max(36, Math.round(h * 0.16));
  const gap = 10;
  const plotH = Math.max(40, h - padT - padB - volH - gap);
  const plotW = Math.max(10, w - padL - padR);
  const n = vis.length;

  let lo = Infinity;
  let hi = -Infinity;
  for (const c of vis) {
    lo = Math.min(lo, c.l);
    hi = Math.max(hi, c.h);
  }
  for (const g of guides) {
    if (g.price > 0) {
      lo = Math.min(lo, g.price);
      hi = Math.max(hi, g.price);
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    lo = 0;
    hi = 1;
  }
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;

  const yOf = (price: number) => padT + ((hi - price) / (hi - lo)) * plotH;
  const xOf = (i: number) => padL + ((i + 0.5) * plotW) / Math.max(n, 1);
  const bodyW = Math.max(2, (plotW / Math.max(n, 1)) * 0.62);
  let maxVol = 0;
  for (const c of vis) maxVol = Math.max(maxVol, c.v);
  const volTop = padT + plotH + gap;

  const line = (series: number[]) =>
    series
      .map((v, i) => (Number.isFinite(v) ? `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : ""))
      .filter(Boolean)
      .join(" ");

  const hoverCandle = hover ? vis[hover.i] : null;
  const ticks = 4;

  return (
    <div
      ref={ref}
      className="relative h-64 w-full sm:h-80 lg:h-chart"
      role="img"
      aria-label="Свечной график"
      onPointerLeave={() => setHover(null)}
      onPointerMove={(event) => {
        if (!n || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const i = Math.min(n - 1, Math.max(0, Math.floor(((x - padL) / plotW) * n)));
        setHover({ i, x, y: event.clientY - rect.top });
      }}
    >
      {n > 1 && w > 40 && h > 40 ? (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" className="block">
          {Array.from({ length: ticks }, (_, k) => {
            const price = hi - ((k + 0.5) / ticks) * (hi - lo);
            const y = yOf(price);
            return (
              <g key={k}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
                <text x={w - padR + 8} y={y + 4} className="fill-muted" fontSize={11}>
                  {formatPx(price)}
                </text>
              </g>
            );
          })}
          {vis.map((c, i) => {
            const up = c.c >= c.o;
            const x = xOf(i);
            const high = yOf(c.h);
            const low = yOf(c.l);
            const open = yOf(c.o);
            const close = yOf(c.c);
            const top = Math.min(open, close);
            const body = Math.max(1, Math.abs(close - open));
            const vh = maxVol > 0 ? (c.v / maxVol) * volH : 0;
            return (
              <g key={c.t}>
                <line
                  x1={x}
                  x2={x}
                  y1={high}
                  y2={low}
                  className={up ? "stroke-up" : "stroke-down"}
                  strokeWidth={1}
                />
                <rect
                  x={x - bodyW / 2}
                  y={top}
                  width={bodyW}
                  height={body}
                  className={up ? "fill-up" : "fill-down"}
                />
                <rect
                  x={x - bodyW / 2}
                  y={volTop + volH - vh}
                  width={bodyW}
                  height={vh}
                  className={up ? "fill-up/40" : "fill-down/40"}
                />
              </g>
            );
          })}
          <polyline points={line(fastVis)} fill="none" className="stroke-warn" strokeWidth={1.4} />
          <polyline points={line(slowVis)} fill="none" className="stroke-fg/50" strokeWidth={1.4} />
          {guides.map((g) => {
            if (!(g.price > lo && g.price < hi)) return null;
            const y = yOf(g.price);
            const stroke =
              g.tone === "up" ? "stroke-up" : g.tone === "down" ? "stroke-down" : "stroke-warn";
            const fill = g.tone === "up" ? "fill-up" : g.tone === "down" ? "fill-down" : "fill-warn";
            return (
              <g key={g.label}>
                <line
                  x1={padL}
                  x2={w - padR}
                  y1={y}
                  y2={y}
                  className={stroke}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text x={padL + 6} y={y - 4} className={fill} fontSize={11}>
                  {g.label} {formatPx(g.price)}
                </text>
              </g>
            );
          })}
          {hover && hoverCandle ? (
            <line
              x1={xOf(hover.i)}
              x2={xOf(hover.i)}
              y1={padT}
              y2={volTop + volH}
              className="stroke-muted"
              strokeWidth={1}
            />
          ) : null}
          {n > 1 ? (
            <text x={padL} y={h - 6} className="fill-muted" fontSize={11}>
              {formatTime(vis[0]?.t ?? 0)}
            </text>
          ) : null}
          {n > 1 ? (
            <text x={w - padR - 64} y={h - 6} className="fill-muted" fontSize={11}>
              {formatTime(vis[n - 1]?.t ?? 0)}
            </text>
          ) : null}
        </svg>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted">Жду свечи…</div>
      )}
      {hoverCandle ? (
        <div className="pointer-events-none absolute top-2 left-2 rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs text-fg">
          <span className="text-muted">O </span>
          {formatPx(hoverCandle.o)} <span className="text-muted">H </span>
          {formatPx(hoverCandle.h)} <span className="text-muted">L </span>
          {formatPx(hoverCandle.l)} <span className="text-muted">C </span>
          {formatPx(hoverCandle.c)}
        </div>
      ) : null}
    </div>
  );
}
