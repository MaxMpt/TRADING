import { o as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { c as venueOf, n as listOf, o as sessionPhase, s as unitOf, t as INTERVALS } from "./market-CFNBOnBe.mjs";
import { a as Activity, i as Bot, n as ScrollText, r as Rows3 } from "../_libs/lucide-react.mjs";
import { a as findSetup, c as moscowDay$1, d as withEntry, o as livePnl, r as decide, s as lostTickersToday, t as agentLossesToday } from "./playbook-BuNJqG3v.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BKZN-t_o.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatPx(n) {
	if (!Number.isFinite(n)) return "—";
	const digits = n >= 1e3 ? 2 : n >= 10 ? 3 : n >= 1 ? 4 : 6;
	return n.toLocaleString("ru-RU", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function formatUsd(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return (n < 0 ? "−" : "") + Math.abs(n).toLocaleString("ru-RU", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function formatPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("ru-RU", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}) + "%";
}
function formatSigned(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toLocaleString("ru-RU", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function formatStamp(ts) {
	if (!ts) return "—";
	return new Date(ts).toLocaleString("ru-RU", {
		timeZone: "Europe/Moscow",
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function formatQty(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 100) return Math.round(n).toLocaleString("ru-RU");
	return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	});
}
function clamp(n, min, max) {
	return Math.min(max, Math.max(min, n));
}
function CandleChart({ candles, fast, slow, guides }) {
	const ref = (0, import_react.useRef)(null);
	const [box, setBox] = (0, import_react.useState)({
		w: 0,
		h: 0
	});
	const [hover, setHover] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () => setBox({
			w: el.clientWidth,
			h: el.clientHeight
		});
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const vis = candles.slice(-72);
	const fastVis = fast.slice(-vis.length);
	const slowVis = slow.slice(-vis.length);
	const w = box.w;
	const h = box.h;
	const padL = 8;
	const padR = 72;
	const padT = 16;
	const padB = 22;
	const volH = Math.max(36, Math.round(h * .16));
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
	for (const g of guides) if (g.price > 0) {
		lo = Math.min(lo, g.price);
		hi = Math.max(hi, g.price);
	}
	if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
		lo = 0;
		hi = 1;
	}
	const pad = (hi - lo) * .08 || 1;
	lo -= pad;
	hi += pad;
	const yOf = (price) => padT + (hi - price) / (hi - lo) * plotH;
	const xOf = (i) => padL + (i + .5) * plotW / Math.max(n, 1);
	const bodyW = Math.max(2, plotW / Math.max(n, 1) * .62);
	let maxVol = 0;
	for (const c of vis) maxVol = Math.max(maxVol, c.v);
	const volTop = padT + plotH + gap;
	const line = (series) => series.map((v, i) => Number.isFinite(v) ? `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}` : "").filter(Boolean).join(" ");
	const hoverCandle = hover ? vis[hover.i] : null;
	const ticks = 4;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "relative h-64 w-full sm:h-80 lg:h-chart",
		role: "img",
		"aria-label": "Свечной график",
		onPointerLeave: () => setHover(null),
		onPointerMove: (event) => {
			if (!n || !ref.current) return;
			const rect = ref.current.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const i = Math.min(n - 1, Math.max(0, Math.floor((x - padL) / plotW * n)));
			setHover({
				i,
				x,
				y: event.clientY - rect.top
			});
		},
		children: [n > 1 && w > 40 && h > 40 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${w} ${h}`,
			width: "100%",
			height: "100%",
			className: "block",
			children: [
				Array.from({ length: ticks }, (_, k) => {
					const price = hi - (k + .5) / ticks * (hi - lo);
					const y = yOf(price);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: padL,
						x2: w - padR,
						y1: y,
						y2: y,
						className: "stroke-line",
						strokeWidth: 1
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
						x: w - padR + 8,
						y: y + 4,
						className: "fill-muted",
						fontSize: 11,
						children: formatPx(price)
					})] }, k);
				}),
				vis.map((c, i) => {
					const up = c.c >= c.o;
					const x = xOf(i);
					const high = yOf(c.h);
					const low = yOf(c.l);
					const open = yOf(c.o);
					const close = yOf(c.c);
					const top = Math.min(open, close);
					const body = Math.max(1, Math.abs(close - open));
					const vh = maxVol > 0 ? c.v / maxVol * volH : 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: x,
							x2: x,
							y1: high,
							y2: low,
							className: up ? "stroke-up" : "stroke-down",
							strokeWidth: 1
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: x - bodyW / 2,
							y: top,
							width: bodyW,
							height: body,
							className: up ? "fill-up" : "fill-down"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: x - bodyW / 2,
							y: volTop + volH - vh,
							width: bodyW,
							height: vh,
							className: up ? "fill-up/40" : "fill-down/40"
						})
					] }, c.t);
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: line(fastVis),
					fill: "none",
					className: "stroke-warn",
					strokeWidth: 1.4
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
					points: line(slowVis),
					fill: "none",
					className: "stroke-fg/50",
					strokeWidth: 1.4
				}),
				guides.map((g) => {
					if (!(g.price > lo && g.price < hi)) return null;
					const y = yOf(g.price);
					const stroke = g.tone === "up" ? "stroke-up" : g.tone === "down" ? "stroke-down" : "stroke-warn";
					const fill = g.tone === "up" ? "fill-up" : g.tone === "down" ? "fill-down" : "fill-warn";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: padL,
						x2: w - padR,
						y1: y,
						y2: y,
						className: stroke,
						strokeDasharray: "4 4",
						strokeWidth: 1
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
						x: 14,
						y: y - 4,
						className: fill,
						fontSize: 11,
						children: [
							g.label,
							" ",
							formatPx(g.price)
						]
					})] }, g.label);
				}),
				hover && hoverCandle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: xOf(hover.i),
					x2: xOf(hover.i),
					y1: padT,
					y2: volTop + volH,
					className: "stroke-muted",
					strokeWidth: 1
				}) : null,
				n > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: padL,
					y: h - 6,
					className: "fill-muted",
					fontSize: 11,
					children: formatTime(vis[0]?.t ?? 0)
				}) : null,
				n > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: w - padR - 64,
					y: h - 6,
					className: "fill-muted",
					fontSize: 11,
					children: formatTime(vis[n - 1]?.t ?? 0)
				}) : null
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-full items-center justify-center text-sm text-muted",
			children: "Жду свечи…"
		}), hoverCandle ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute top-2 left-2 rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "O "
				}),
				formatPx(hoverCandle.o),
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "H "
				}),
				formatPx(hoverCandle.h),
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "L "
				}),
				formatPx(hoverCandle.l),
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "C "
				}),
				formatPx(hoverCandle.c)
			]
		}) : null]
	});
}
function Row({ level, max, side }) {
	const width = max > 0 ? Math.min(100, level.qty / max * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-7 items-center justify-between px-2 font-mono text-xs",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: side === "bid" ? "absolute inset-y-0 right-0 bg-up/15" : "absolute inset-y-0 right-0 bg-down/15",
				style: { width: `${width}%` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: side === "bid" ? "relative text-up" : "relative text-down",
				children: formatPx(level.price)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "relative text-fg",
				children: formatQty(level.qty)
			})
		]
	});
}
function OrderBook({ bids, asks, tape, spreadBps }) {
	const askRows = asks.slice(0, 11).reverse();
	const bidRows = bids.slice(0, 11);
	const max = Math.max(0, ...askRows.map((l) => l.qty), ...bidRows.map((l) => l.qty));
	const prints = [...tape].reverse().slice(0, 14);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1 flex justify-between px-2 font-mono text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Цена" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Объём" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col",
				children: askRows.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					level,
					max,
					side: "ask"
				}, `a-${level.price}`))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "my-1 flex items-center justify-between border-y border-line px-2 py-2 font-mono text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "Спред"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-fg",
					children: spreadBps === null ? "—" : `${spreadBps.toFixed(1)} б.п.`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col",
				children: bidRows.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					level,
					max,
					side: "bid"
				}, `b-${level.price}`))
			}),
			askRows.length === 0 && bidRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "px-2 py-6 text-sm text-muted",
				children: "Стакан пуст."
			}) : null
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mb-1 px-2 font-mono text-xs tracking-widest text-muted uppercase",
			children: "Лента"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "max-h-52 overflow-auto",
			children: prints.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between px-2 py-1 font-mono text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: t.sell ? "text-down" : "text-up",
						children: formatPx(t.price)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-fg",
						children: formatQty(t.qty)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: formatTime(t.time)
					})
				]
			}, t.id))
		})] })]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var briefMarket = createServerFn({ method: "POST" }).validator((input) => {
	const prompt = typeof input === "object" && input && "prompt" in input ? input.prompt : "";
	if (typeof prompt !== "string" || prompt.length < 8 || prompt.length > 4e3) throw new Error("Пустой разбор");
	return { prompt };
}).handler(createSsrRpc("7ed25a8bf92040745229b51e32f99c885db8e19be3c40c2723e76c5d824f3a33"));
function allowed(ticker) {
	return venueOf(ticker) !== null;
}
var loadMarket = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	const ticker = typeof source.ticker === "string" ? source.ticker : "";
	const interval = [
		"5",
		"10",
		"15",
		"30",
		"60",
		"24"
	].includes(String(source.interval)) ? source.interval : "5";
	if (!allowed(ticker)) throw new Error("Неизвестный тикер");
	return {
		ticker,
		interval
	};
}).handler(createSsrRpc("4799583ec167b881fc736ed2da12aaa708ef1a58e474c54b6ab43d7ff41640ff"));
var loadQuotes = createServerFn({ method: "POST" }).validator((input) => {
	const tickers = input.tickers;
	if (!Array.isArray(tickers)) return { tickers: [] };
	return { tickers: tickers.filter((ticker) => typeof ticker === "string" && allowed(ticker)).slice(0, 8) };
}).handler(createSsrRpc("a5274d1bc11c8ccc3eac6ca3185ea120006bc0b323ea82376d4980aa244e34d7"));
var loadLooks = createServerFn({ method: "GET" }).handler(createSsrRpc("d12b78ca237d57038046dbc32c56c5d06cd6841e61f5d1389927b81daf76e6e0"));
function ema(values, period) {
	if (!values.length) return [];
	const k = 2 / (period + 1);
	const out = [];
	let prev = values[0] ?? 0;
	for (let i = 0; i < values.length; i++) {
		const v = values[i] ?? prev;
		prev = i === 0 ? v : v * k + prev * (1 - k);
		out.push(prev);
	}
	return out;
}
function rsi(closes, period = 14) {
	if (closes.length < period + 1) return 50;
	let avgGain = 0;
	let avgLoss = 0;
	for (let i = 1; i <= period; i++) {
		const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
		if (d >= 0) avgGain += d;
		else avgLoss -= d;
	}
	avgGain /= period;
	avgLoss /= period;
	for (let i = period + 1; i < closes.length; i++) {
		const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
		const gain = d > 0 ? d : 0;
		const loss = d < 0 ? -d : 0;
		avgGain = (avgGain * (period - 1) + gain) / period;
		avgLoss = (avgLoss * (period - 1) + loss) / period;
	}
	if (avgLoss === 0) return 100;
	return 100 - 100 / (1 + avgGain / avgLoss);
}
function atr(candles, period = 14) {
	if (candles.length < period + 1) return 0;
	let prev = candles[0]?.c ?? 0;
	const ranges = [];
	for (let i = 1; i < candles.length; i++) {
		const c = candles[i];
		if (!c) continue;
		const tr = Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
		ranges.push(tr);
		prev = c.c;
	}
	const slice = ranges.slice(-period);
	if (!slice.length) return 0;
	return slice.reduce((sum, n) => sum + n, 0) / slice.length;
}
function adx(candles, period = 14) {
	if (candles.length < period * 2) return {
		adx: 0,
		plusDi: 0,
		minusDi: 0
	};
	const trs = [];
	const plusDm = [];
	const minusDm = [];
	for (let i = 1; i < candles.length; i++) {
		const cur = candles[i];
		const prev = candles[i - 1];
		if (!cur || !prev) continue;
		const up = cur.h - prev.h;
		const down = prev.l - cur.l;
		plusDm.push(up > down && up > 0 ? up : 0);
		minusDm.push(down > up && down > 0 ? down : 0);
		trs.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
	}
	const wilder = (values) => {
		let acc = values.slice(0, period).reduce((sum, n) => sum + n, 0);
		const out = [acc];
		for (let i = period; i < values.length; i++) {
			acc = acc - acc / period + (values[i] ?? 0);
			out.push(acc);
		}
		return out;
	};
	const atrS = wilder(trs);
	const plusS = wilder(plusDm);
	const minusS = wilder(minusDm);
	const dx = [];
	for (let i = 0; i < atrS.length; i++) {
		const range = atrS[i] ?? 0;
		const plusDi = range > 0 ? 100 * (plusS[i] ?? 0) / range : 0;
		const minusDi = range > 0 ? 100 * (minusS[i] ?? 0) / range : 0;
		const den = plusDi + minusDi;
		dx.push(den === 0 ? 0 : 100 * Math.abs(plusDi - minusDi) / den);
	}
	if (dx.length < period) return {
		adx: 0,
		plusDi: 0,
		minusDi: 0
	};
	let value = dx.slice(0, period).reduce((sum, n) => sum + n, 0) / period;
	for (let i = period; i < dx.length; i++) value = (value * (period - 1) + (dx[i] ?? 0)) / period;
	const lastRange = atrS[atrS.length - 1] ?? 0;
	return {
		adx: value,
		plusDi: lastRange > 0 ? 100 * (plusS[plusS.length - 1] ?? 0) / lastRange : 0,
		minusDi: lastRange > 0 ? 100 * (minusS[minusS.length - 1] ?? 0) / lastRange : 0
	};
}
function sessionVwap(candles) {
	if (!candles.length) return 0;
	const last = candles[candles.length - 1];
	if (!last) return 0;
	const day = moscowDay(last.t);
	let notional = 0;
	let volume = 0;
	for (const candle of candles) {
		if (moscowDay(candle.t) !== day || candle.v <= 0) continue;
		notional += (candle.h + candle.l + candle.c) / 3 * candle.v;
		volume += candle.v;
	}
	return volume > 0 ? notional / volume : 0;
}
function bands(closes, period = 20) {
	const slice = closes.slice(-period);
	if (slice.length < period) return {
		upper: 0,
		lower: 0,
		width: 0
	};
	const mid = slice.reduce((sum, n) => sum + n, 0) / period;
	const variance = slice.reduce((sum, n) => sum + (n - mid) ** 2, 0) / period;
	const sd = Math.sqrt(variance);
	return {
		upper: mid + 2 * sd,
		lower: mid - 2 * sd,
		width: mid > 0 ? 4 * sd / mid : 0
	};
}
function bookImbalance(bids, asks) {
	const bid = bids.reduce((sum, level) => sum + level.qty, 0);
	const ask = asks.reduce((sum, level) => sum + level.qty, 0);
	const total = bid + ask;
	return total > 0 ? (bid - ask) / total : 0;
}
function moscowDay(ts) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(new Date(ts));
}
function flowOf(tape) {
	let buy = 0;
	let sell = 0;
	for (const print of tape) {
		const notion = print.price * print.qty;
		if (print.sell) sell += notion;
		else buy += notion;
	}
	const total = buy + sell;
	return total > 0 ? (buy - sell) / total : 0;
}
function study(snap) {
	const daily = snap.daily;
	const intra = snap.interval === "24" ? snap.daily : snap.candles;
	const closes = intra.map((c) => c.c);
	const price = snap.last || closes[closes.length - 1] || 0;
	const emaFast = ema(closes, 9);
	const emaSlow = ema(closes, 21);
	const fast = emaFast[emaFast.length - 1] ?? price;
	const slow = emaSlow[emaSlow.length - 1] ?? price;
	price > 0 && (fast - slow) / price;
	const dCloses = daily.map((c) => c.c);
	const dFast = ema(dCloses, 20);
	const dSlow = ema(dCloses, 50);
	const ema20 = dFast[dFast.length - 1] ?? price;
	const ema50 = dSlow[dSlow.length - 1] ?? price;
	const dayTrend = price > 0 ? (ema20 - ema50) / price : 0;
	dCloses.length > 21 && (dCloses[dCloses.length - 1] ?? price) / (dCloses[dCloses.length - 21] ?? price) - 1;
	rsi(dCloses, 14);
	const dayAtr = atr(daily, 14);
	const intraRsi = rsi(closes, 14);
	const volume = (() => {
		const closed = intra.slice(0, -1);
		if (closed.length < 8) return 1;
		const window = closed.slice(-21, -1);
		const last = closed[closed.length - 1];
		const avg = window.reduce((sum, c) => sum + c.v, 0) / Math.max(window.length, 1);
		return last && avg > 0 ? last.v / avg : 1;
	})();
	const flow = flowOf(snap.tape);
	const imbalance = bookImbalance(snap.bids, snap.asks);
	const trendStrength = adx(daily, 14);
	const vwap = sessionVwap(intra);
	vwap > 0 && price > 0 && (price - vwap) / price;
	bands(dCloses, 20);
	const bid = snap.bid;
	const ask = snap.ask;
	const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : price;
	const spreadBps = mid > 0 && ask >= bid && bid > 0 ? (ask - bid) / mid * 1e4 : 0;
	const prior = snap.session && daily.length >= 2 ? daily[daily.length - 2] : daily[daily.length - 1];
	daily.length >= 2 && daily[daily.length - 2]?.c;
	const levelHigh = prior?.h ?? 0;
	const levelLow = prior?.l ?? 0;
	const played = findSetup({
		daily,
		intra,
		price,
		levelHigh,
		levelLow,
		volRatio: volume,
		atr: dayAtr
	});
	const preview = played.setup ? withEntry(played.setup.side, price, played.setup.stop) : null;
	let score = 0;
	if (played.stage.side === "long") score = 36;
	if (played.stage.side === "short") score = -36;
	if (played.setup?.side === "long" && preview) score = 76;
	if (played.setup?.side === "short" && preview) score = -76;
	score = clamp(score, -100, 100);
	const call = preview && played.setup ? played.setup.side : "flat";
	let block = null;
	if (daily.length < 60) block = "Мало дневной истории";
	else if (intra.length < 30) block = "Мало свечей для входа";
	else if (!snap.session) block = "Торги закрыты";
	else if (!(bid > 0 && ask > 0)) block = "Нет стакана";
	else if (spreadBps > 40) block = "Спред слишком широкий";
	else if (snap.interval !== "24") {
		const lastBar = intra[intra.length - 1];
		const marks = [
			price,
			bid,
			ask
		].filter((px) => px > 0);
		const outside = Boolean(lastBar && marks.some((px) => px < lastBar.l * .998 || px > lastBar.h * 1.002));
		const staleAfter = snap.interval === "60" ? 144e5 : 54e5;
		const staleBar = Boolean(lastBar && lastBar.t > 0 && Date.now() - lastBar.t > staleAfter);
		if (outside) block = "Цена не совпадает со свечой. Вход пропущен.";
		else if (staleBar) block = "Биржа отдала слишком старую свечу. Вход пропущен.";
	}
	if (!block && preview && played.setup) {
		if (trendStrength.adx < 20) block = "ADX ниже 20: тренда нет, это пила. Вход пропущен.";
		else if (played.setup.side === "long" && trendStrength.plusDi < trendStrength.minusDi) block = "Покупатели слабее продавцов. Лонг пропущен.";
		else if (played.setup.side === "short" && trendStrength.minusDi < trendStrength.plusDi) block = "Продавцы слабее покупателей. Шорт пропущен.";
		else if (vwap > 0 && played.setup.side === "short" && price > vwap) block = "Шорт выше VWAP: сессия ещё у покупателей.";
		else if (vwap > 0 && played.setup.side === "long" && price < vwap) block = "Лонг ниже VWAP: сессия ещё у продавцов.";
		else if (volume < 1) block = "Объём ниже обычного. Вход пропущен.";
	}
	const note = preview && played.setup ? played.setup.model === "ложный пробой" ? "Ложный пробой уровня. Стоп за хвостом, тейк в три раза дальше." : "Сжатие и выход из него по тренду. Стоп за базой, тейк в три раза дальше." : played.stage.reason;
	const factors = [
		{
			id: "stage",
			label: "Стадия",
			detail: played.stage.side === "long" ? "рост" : played.stage.side === "short" ? "падение" : "нет",
			tone: played.stage.side === "long" ? "up" : played.stage.side === "short" ? "down" : "flat"
		},
		{
			id: "low",
			label: "От минимума года",
			detail: `${played.stage.aboveLow >= 0 ? "+" : "−"}${(Math.abs(played.stage.aboveLow) * 100).toFixed(0)}%`,
			tone: played.stage.aboveLow >= .3 ? "up" : "flat"
		},
		{
			id: "high",
			label: "До максимума года",
			detail: `${(played.stage.offHigh * 100).toFixed(0)}%`,
			tone: played.stage.offHigh <= .25 ? "up" : "down"
		},
		{
			id: "slope",
			label: "Наклон 200",
			detail: `${played.stage.slope >= 0 ? "вверх" : "вниз"} ${(Math.abs(played.stage.slope) * 100).toFixed(1)}%`,
			tone: played.stage.slope > 0 ? "up" : played.stage.slope < 0 ? "down" : "flat"
		},
		{
			id: "level",
			label: "Уровень",
			detail: levelHigh > 0 ? `${levelLow.toFixed(2)} – ${levelHigh.toFixed(2)}` : "—",
			tone: "flat"
		},
		{
			id: "adx",
			label: "ADX",
			detail: trendStrength.adx >= 20 ? `${trendStrength.adx.toFixed(0)} тренд` : `${trendStrength.adx.toFixed(0)} пила`,
			tone: trendStrength.adx >= 20 ? "up" : "flat"
		},
		{
			id: "vwap",
			label: "VWAP",
			detail: vwap > 0 ? price >= vwap ? "цена выше" : "цена ниже" : "—",
			tone: vwap > 0 && price >= vwap ? "up" : vwap > 0 ? "down" : "flat"
		},
		{
			id: "model",
			label: "Модель",
			detail: played.setup?.model ?? "нет",
			tone: played.setup?.side === "long" ? "up" : played.setup?.side === "short" ? "down" : "flat"
		},
		{
			id: "stop",
			label: "Стоп",
			detail: preview ? preview.stop.toFixed(2) : "—",
			tone: "down"
		},
		{
			id: "target",
			label: "Тейк 1:3",
			detail: preview ? preview.target.toFixed(2) : "—",
			tone: "up"
		}
	];
	return {
		score,
		call,
		note,
		atr: dayAtr,
		imbalance,
		flow,
		trend: dayTrend,
		rsi: intraRsi,
		volRatio: volume,
		spreadBps,
		emaFast,
		emaSlow,
		tradable: block === null,
		block,
		factors,
		dailyBars: daily.length,
		intraBars: snap.candles.length,
		planStop: preview && played.setup ? played.setup.stop : 0,
		model: played.setup?.model ?? ""
	};
}
function knownTicker(ticker) {
	return venueOf(ticker) !== null;
}
var loadDesk = createServerFn({ method: "GET" }).handler(createSsrRpc("fac19c061c7c654b573618e20dd7639e79fdf3228f58f8aafa80192cd81ac26b"));
var saveAccount = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	return {
		commissionPct: typeof source.commissionPct === "number" ? source.commissionPct : null,
		riskPct: typeof source.riskPct === "number" ? source.riskPct : null,
		sizePct: typeof source.sizePct === "number" ? source.sizePct : null,
		capital: typeof source.capital === "number" ? source.capital : null,
		agentOn: typeof source.agentOn === "boolean" ? source.agentOn : null
	};
}).handler(createSsrRpc("c01585d3a88b280cf38c1073e8829e1a06cccf03122680883c6c2814180f1e39"));
var openTrade = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	const ticker = typeof source.ticker === "string" ? source.ticker : "";
	const side = source.side === "short" ? "short" : "long";
	const via = source.via === "hand" ? "hand" : "agent";
	const price = typeof source.price === "number" ? source.price : 0;
	const lot = typeof source.lot === "number" ? source.lot : 1;
	const stop = typeof source.stop === "number" && source.stop > 0 ? source.stop : 0;
	if (!knownTicker(ticker) || !(price > 0)) throw new Error("Некорректная заявка");
	return {
		ticker,
		side,
		via,
		price,
		lot: lot > 0 ? lot : 1,
		stop
	};
}).handler(createSsrRpc("aaed0b06985cbf8ac19c8177bc0ec365fa8861b105c9c6ff09db42e2ceca84f6"));
var closeTrade = createServerFn({ method: "POST" }).validator((input) => {
	const source = input;
	const id = typeof source.id === "string" ? source.id : "";
	const price = typeof source.price === "number" ? source.price : 0;
	const reason = source.reason === "target" || source.reason === "stop" || source.reason === "manual" ? source.reason : "manual";
	if (!id || !(price > 0)) throw new Error("Нечем закрывать");
	return {
		id,
		price,
		reason
	};
}).handler(createSsrRpc("d811384f0b97752985f005ad84bd0b0fd3b120caca30fce8230a7b73d4beff8c"));
var snapMemory = /* @__PURE__ */ new Map();
var paintSeq = 0;
function recallSnap(ticker, interval) {
	const hit = snapMemory.get(`${ticker}:${interval}`);
	if (!hit || Date.now() - hit.at > 3e5) return null;
	return hit.snap;
}
var SETTINGS = {
	venue: "moex",
	ticker: "LKOH",
	interval: "5",
	agentOn: true,
	aiBias: null,
	aiNote: ""
};
var ACCOUNT = {
	capital: 1e6,
	cash: 1e6,
	commissionPct: .05,
	riskPct: .6,
	sizePct: 20,
	agentOn: true
};
function log(logs, text) {
	const now = Date.now();
	return [{
		id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
		t: now,
		text
	}, ...logs].slice(0, 40);
}
function sideWord(side) {
	return side === "long" ? "лонг" : "шорт";
}
function reasonWord(reason) {
	if (reason === "target") return "тейк 1:3";
	if (reason === "stop") return "стоп";
	if (reason === "manual") return "вручную";
	return "закрытие";
}
function applyBook(book) {
	return {
		account: book.account,
		open: book.open,
		closed: book.closed
	};
}
var useDesk = create()(persist((set, get) => ({
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
		if (interval !== "5" && interval !== "10" && interval !== "15" && interval !== "30" && interval !== "60" && interval !== "24") set({ settings: {
			...get().settings,
			interval: "5"
		} });
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
					agentOn: book.account.agentOn
				},
				booted: true
			});
		} catch (error) {
			set({
				booted: true,
				feedError: error instanceof Error ? error.message : "База журнала недоступна"
			});
		}
	},
	tick: async (snap) => {
		const state = get();
		if (!state.booted || snap.ticker !== state.settings.ticker || snap.interval !== state.settings.interval) return;
		const mine = ++paintSeq;
		snapMemory.set(`${snap.ticker}:${snap.interval}`, {
			at: Date.now(),
			snap
		});
		const read = study(snap);
		const smooth = state.updatedAt === 0 ? read.score : state.smooth * .45 + read.score * .55;
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
			streakN: state.streakN
		});
		const holdNote = decision.holdNote ?? read.block;
		set({
			snap,
			read,
			smooth,
			marks: {
				...state.marks,
				[snap.ticker]: {
					bid: snap.bid,
					ask: snap.ask,
					last: snap.last
				}
			},
			streakSide: decision.streakSide,
			streakN: decision.streakN,
			holdNote,
			updatedAt: Date.now(),
			feedError: null
		});
		const book = await loadDesk().catch(() => null);
		if (mine !== paintSeq || get().settings.ticker !== snap.ticker) return;
		if (book) set({
			...applyBook(book),
			settings: {
				...get().settings,
				agentOn: book.account.agentOn
			}
		});
		if (mine !== paintSeq || get().settings.ticker !== snap.ticker) return;
		const liveBook = book ?? {
			open: get().open,
			closed: get().closed,
			account: get().account
		};
		const stillHeld = liveBook.open.find((trade) => trade.ticker === snap.ticker) ?? null;
		if (decision.intent.type === "close" && stillHeld) {
			const price = stillHeld.side === "long" ? snap.bid || snap.last : snap.ask || snap.last;
			if (price > 0) await closeAndRemember(stillHeld.id, price, decision.intent.reason);
		} else if (decision.intent.type === "open" && !stillHeld && get().settings.agentOn) {
			if (lostTickersToday(liveBook.closed).includes(snap.ticker)) set({ holdNote: `${snap.ticker} уже закрывался в минус сегодня. Повторно не беру.` });
			else {
				const side = decision.intent.side;
				if (liveBook.open.filter((trade) => trade.side === side).length >= 2) set({ holdNote: side === "short" ? "Уже два шорта. Третью такую же ставку не беру." : "Уже два лонга. Третью такую же ставку не беру." });
				else {
					set({ holdNote: "Сигнал есть, отправляю заявку." });
					await openAndRemember(side, "agent", snap, read.planStop);
				}
			}
		}
		if (mine !== paintSeq) return;
		const others = get().open.filter((trade) => trade.ticker !== snap.ticker);
		if (!others.length) return;
		try {
			const quotes = await loadQuotes({ data: { tickers: others.map((trade) => trade.ticker) } });
			if (mine !== paintSeq) return;
			const next = { ...get().marks };
			for (const quote of quotes) next[quote.ticker] = {
				bid: quote.bid,
				ask: quote.ask,
				last: quote.last
			};
			set({ marks: next });
		} catch {}
	},
	setTicker: (ticker) => {
		set({
			settings: {
				...get().settings,
				ticker
			},
			feedError: null
		});
	},
	setVenue: (venue) => {
		const state = get();
		const list = listOf(venue);
		const ticker = list.some((item) => item.id === state.settings.ticker) ? state.settings.ticker : list[0]?.id ?? state.settings.ticker;
		set({
			settings: {
				...state.settings,
				venue,
				ticker
			},
			snap: null,
			read: null,
			smooth: 0,
			streakSide: null,
			streakN: 0,
			feedError: null
		});
	},
	setInterval: (interval) => {
		set({
			settings: {
				...get().settings,
				interval
			},
			snap: null,
			read: null,
			smooth: 0,
			streakSide: null,
			streakN: 0
		});
	},
	toggleAgent: () => {
		const state = get();
		const agentOn = !state.settings.agentOn;
		set({
			settings: {
				...state.settings,
				agentOn
			},
			streakSide: null,
			streakN: 0,
			logs: log(state.logs, agentOn ? "Агент включён и сам ведёт сделки." : "Агент выключен. Открытые сделки закроет по тейку или стопу.")
		});
		saveAccount({ data: { agentOn } }).then((book) => useDesk.setState({
			...applyBook(book),
			settings: {
				...useDesk.getState().settings,
				agentOn: book.account.agentOn
			}
		})).catch((error) => {
			useDesk.setState({
				settings: {
					...useDesk.getState().settings,
					agentOn: !agentOn
				},
				notice: error instanceof Error ? error.message : "Не записал переключатель"
			});
		});
	},
	setBias: (bias, note) => {
		const state = get();
		set({
			settings: {
				...state.settings,
				aiBias: bias,
				aiNote: note ?? state.settings.aiNote
			},
			streakSide: null,
			streakN: 0
		});
	},
	patchAccount: async (patch) => {
		try {
			set({
				...applyBook(await saveAccount({ data: {
					commissionPct: patch.commissionPct,
					riskPct: patch.riskPct,
					sizePct: patch.sizePct,
					capital: patch.capital
				} })),
				notice: null
			});
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
		if (snap && snap.ticker === trade.ticker) price = trade.side === "long" ? snap.bid || snap.last : snap.ask || snap.last;
		else try {
			const quote = (await loadQuotes({ data: { tickers: [trade.ticker] } }))[0];
			price = quote ? trade.side === "long" ? quote.bid || quote.last : quote.ask || quote.last : 0;
		} catch (error) {
			set({ notice: error instanceof Error ? error.message : "Нет цены закрытия" });
			return;
		}
		if (!(price > 0)) {
			set({ notice: "Нет цены закрытия" });
			return;
		}
		await closeAndRemember(id, price, "manual");
	},
	dismissNotice: () => set({ notice: null })
}), {
	name: "ordo-desk-v2",
	skipHydration: true,
	partialize: (state) => ({
		settings: state.settings,
		logs: state.logs
	})
}));
async function openAndRemember(side, via, snap, stop = 0) {
	if (useDesk.getState().busy) return;
	const price = side === "long" ? snap.ask || snap.last : snap.bid || snap.last;
	if (!(price > 0)) {
		useDesk.setState({ notice: "Нет цены входа" });
		return;
	}
	useDesk.setState({ busy: true });
	try {
		const book = await openTrade({ data: {
			ticker: snap.ticker,
			side,
			price,
			via,
			lot: snap.lot,
			stop: stop > 0 ? stop : void 0
		} });
		const opened = book.open.find((trade) => trade.ticker === snap.ticker);
		useDesk.setState({
			...applyBook(book),
			busy: false,
			streakN: 0,
			logs: log(useDesk.getState().logs, `Вход · ${sideWord(side)} ${snap.ticker} · ${formatQty(opened?.qty ?? 0)} · стоп ${opened ? opened.stop.toFixed(2) : "—"} · тейк ${opened ? opened.target.toFixed(2) : "—"}`)
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Не удалось открыть";
		if (via === "agent" && message.includes("уже есть")) {
			const book = await loadDesk().catch(() => null);
			useDesk.setState({
				busy: false,
				...book ? applyBook(book) : {},
				notice: null
			});
			return;
		}
		useDesk.setState({
			busy: false,
			notice: message
		});
	}
}
async function closeAndRemember(id, price, reason) {
	const state = useDesk.getState();
	if (state.busy) return;
	const trade = state.open.find((item) => item.id === id);
	useDesk.setState({ busy: true });
	try {
		const book = await closeTrade({ data: {
			id,
			price,
			reason
		} });
		const pnl = book.closed.find((item) => item.id === id)?.pnl ?? 0;
		useDesk.setState({
			...applyBook(book),
			busy: false,
			logs: log(useDesk.getState().logs, `Выход · ${reasonWord(reason)} · ${trade?.ticker ?? ""} · ${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(2)} ${unitOf(trade?.ticker ?? "")}`)
		});
	} catch (error) {
		useDesk.setState({
			busy: false,
			notice: error instanceof Error ? error.message : "Не удалось закрыть"
		});
	}
}
var TABS = [
	{
		id: "chart",
		label: "График",
		icon: Activity
	},
	{
		id: "book",
		label: "Стакан",
		icon: Rows3
	},
	{
		id: "agent",
		label: "Агент",
		icon: Bot
	},
	{
		id: "journal",
		label: "Журнал",
		icon: ScrollText
	}
];
function panel(tab, current) {
	return tab === current ? "" : "max-lg:hidden";
}
function Field({ label, value, step, min, max, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid gap-1 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: "h-11 rounded-md border border-line bg-bg px-3 font-mono text-fg",
			type: "number",
			inputMode: "decimal",
			value: Number(value.toFixed(2)),
			min,
			max,
			step,
			onChange: (event) => {
				const n = Number(event.target.value);
				if (Number.isFinite(n)) onChange(n);
			}
		})]
	});
}
function biasWord(bias) {
	if (bias === "long") return "только лонг";
	if (bias === "short") return "только шорт";
	return "вне рынка";
}
function Desk() {
	const desk = useDesk();
	const [tab, setTab] = (0, import_react.useState)("chart");
	const [asking, setAsking] = (0, import_react.useState)(false);
	const [aiError, setAiError] = (0, import_react.useState)(null);
	const [seed, setSeed] = (0, import_react.useState)(1e6);
	const [suggestion, setSuggestion] = (0, import_react.useState)(null);
	const [looks, setLooks] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		let dead = false;
		(async () => {
			try {
				await useDesk.persist.rehydrate();
			} catch {}
			if (!dead) await useDesk.getState().boot();
		})();
		return () => {
			dead = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!desk.booted) return;
		let dead = false;
		let timer = 0;
		let delay = 800;
		const run = async () => {
			if (dead) return;
			const { settings } = useDesk.getState();
			const remembered = recallSnap(settings.ticker, settings.interval);
			if (remembered) useDesk.getState().tick(remembered);
			try {
				const snap = await loadMarket({ data: {
					ticker: settings.ticker,
					interval: settings.interval
				} });
				if (!dead) {
					await useDesk.getState().tick(snap);
					delay = snap.session ? 5e3 : 15e3;
				}
			} catch (err) {
				if (!dead) {
					useDesk.setState({ feedError: err instanceof Error ? err.message : "Нет котировок" });
					delay = Math.min(Math.round(delay * 1.6), 2e4);
				}
			}
			if (!dead) timer = window.setTimeout(run, delay);
		};
		run();
		return () => {
			dead = true;
			window.clearTimeout(timer);
		};
	}, [
		desk.booted,
		desk.settings.ticker,
		desk.settings.interval,
		desk.settings.venue
	]);
	(0, import_react.useEffect)(() => {
		if (!desk.booted) return;
		let dead = false;
		let timer = 0;
		const run = async () => {
			try {
				const rows = await loadLooks();
				if (!dead) setLooks(rows);
			} catch {}
			if (!dead) timer = window.setTimeout(run, 4e3);
		};
		run();
		return () => {
			dead = true;
			window.clearTimeout(timer);
		};
	}, [desk.booted]);
	(0, import_react.useEffect)(() => {
		if (!desk.notice) return;
		const timer = window.setTimeout(() => useDesk.getState().dismissNotice(), 4200);
		return () => window.clearTimeout(timer);
	}, [desk.notice]);
	const snap = desk.snap;
	const matched = snap && snap.ticker === desk.settings.ticker && snap.interval === desk.settings.interval ? snap : null;
	const quote = matched ?? recallSnap(desk.settings.ticker, desk.settings.interval);
	const switching = !quote;
	const read = matched ? desk.read : null;
	const position = desk.open.find((trade) => trade.ticker === desk.settings.ticker) ?? null;
	const bid = quote?.bid || quote?.last || 0;
	const askPx = quote?.ask || quote?.last || 0;
	const pnl = (position ? livePnl(position.side, position.qty, position.priceOpen, position.commission, bid, askPx, quote?.last ?? 0, desk.account.commissionPct) : null)?.pnl ?? 0;
	const floating = (trade) => {
		const mark = trade.ticker === quote?.ticker ? {
			bid,
			ask: askPx,
			last: quote?.last ?? 0
		} : desk.marks[trade.ticker];
		if (!mark) return null;
		if (!((trade.side === "long" ? mark.bid || mark.last : mark.ask || mark.last) > 0)) return null;
		return livePnl(trade.side, trade.qty, trade.priceOpen, trade.commission, mark.bid, mark.ask, mark.last, desk.account.commissionPct).pnl;
	};
	const equity = desk.account.cash + desk.open.reduce((sum, trade) => {
		const live = floating(trade);
		return sum + (live == null ? 0 : live + trade.commission);
	}, 0);
	const lossToday = agentLossesToday(desk.closed);
	const live = Boolean(quote?.session) && desk.updatedAt > 0 && Date.now() - desk.updatedAt < 2e4 && !desk.feedError;
	const need = Math.abs(desk.smooth) >= 74 ? 1 : 2;
	const wins = desk.closed.filter((trade) => (trade.pnl ?? 0) > 0).length;
	const losses = desk.closed.filter((trade) => (trade.pnl ?? 0) < 0).length;
	const net = desk.closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
	const todayKey = moscowDay$1(Date.now());
	const todayClosed = desk.closed.filter((trade) => trade.closedAt != null && moscowDay$1(trade.closedAt) === todayKey);
	const todayPnl = todayClosed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
	const guides = [];
	if (position) {
		guides.push({
			price: position.priceOpen,
			label: "Вход",
			tone: "warn"
		});
		guides.push({
			price: position.target,
			label: "Тейк",
			tone: "up"
		});
		guides.push({
			price: position.stop,
			label: "Стоп",
			tone: "down"
		});
	}
	const span = position ? Math.abs(position.target - position.priceOpen) + Math.abs(position.priceOpen - position.stop) : 0;
	const progress = position && span > 0 ? clamp((pnl + Math.abs(position.priceOpen - position.stop) * position.qty) / (span * position.qty) * 100, 0, 100) : 0;
	let phase = "Ищет вход";
	if (position) phase = position.side === "long" ? "В лонге" : "В шорте";
	else if (!quote?.session) phase = "Ждёт сессию";
	else if (!desk.settings.agentOn) phase = "Выключен";
	else if (desk.streakN > 0 && desk.streakSide) phase = desk.streakN >= need ? desk.streakSide === "short" ? "Сигнал на шорт" : "Сигнал на лонг" : `Подтверждение ${desk.streakN}/${need}`;
	async function askModel() {
		if (!quote || !read || asking) return;
		setAsking(true);
		setAiError(null);
		const prompt = [
			`Рынок ${quote.ticker} ${quote.name}. Цена ${quote.last.toFixed(2)} ${quote.unit}. Сутки ${quote.changePct.toFixed(2)}%.`,
			`Дневных свечей ${read.dailyBars}, внутри дня ${read.intraBars}. Дневной тренд ${read.trend.toFixed(4)}, RSI ${read.rsi.toFixed(0)}, ATR ${read.atr.toFixed(1)}, стакан ${read.imbalance.toFixed(2)}, скор ${desk.smooth.toFixed(0)}, вывод ${read.call}.`,
			position ? `Открыт ${position.side} от ${position.priceOpen.toFixed(2)}, результат ${pnl.toFixed(0)} ${position.ticker.endsWith("USDT") ? "USDT" : "₽"}. Стоп ${position.stop.toFixed(2)}, тейк ${position.target.toFixed(2)}.` : "Позиции по этому тикеру нет.",
			`Риск ${desk.account.riskPct}% цены, тейк всегда ×3, комиссия ${desk.account.commissionPct}% на сторону.`
		].join(" ");
		try {
			const result = await briefMarket({ data: { prompt } });
			if (!result.ok) {
				setAiError(result.error);
				setSuggestion(null);
			} else setSuggestion({
				bias: result.bias,
				note: result.note
			});
		} catch {
			setAiError("Не удалось спросить ИИ");
		} finally {
			setAsking(false);
		}
	}
	const unit = "₽";
	const sessionNow = sessionPhase();
	const phaseText = sessionNow === "morning" ? "утренняя сессия" : sessionNow === "evening" ? "вечерняя сессия" : sessionNow === "weekend" ? "выходные торги" : sessionNow === "main" ? "основная сессия" : "торги закрыты";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 flex min-w-0 flex-col overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "z-20 shrink-0 border-b border-line bg-bg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3 px-4 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid min-w-0 gap-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "text-lg font-semibold tracking-tight",
										children: "ORDO"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: clsx("size-2 rounded-full", live ? "live-dot bg-up" : "bg-warn"),
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-xs text-muted",
										children: desk.feedError ? "нет связи" : !desk.booted ? "подключение" : phaseText
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hidden max-w-xl text-sm text-muted sm:block",
								children: "Акции Мосбиржи: утро с 6:50, день до 19:00, вечер до 23:50. Вход только по тренду, со стороны VWAP и со стопом шире шума. Тейк в три стопа."
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "font-mono text-xs text-muted",
									children: ["Счёт, ", unit]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-xl font-medium tabular-nums",
									children: formatUsd(equity)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-xs text-muted",
									children: "Открыто"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-xl font-medium tabular-nums",
									children: desk.open.length
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-xs text-muted",
									children: "Журнал"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: clsx("font-mono text-xl font-medium tabular-nums", net >= 0 ? "text-up" : "text-down"),
									children: formatSigned(net)
								})] })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 border-t border-line px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-end justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-2xl font-medium tabular-nums",
									children: quote ? formatPx(quote.last) : switching ? "…" : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: clsx("font-mono text-sm tabular-nums", (quote?.changePct ?? 0) >= 0 ? "text-up" : "text-down"),
									children: [
										switching ? `грузим ${desk.settings.ticker}` : quote ? formatPct(quote.changePct) : "—",
										quote ? " к закрытию" : "",
										quote ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted",
											children: [" · ", quote.name]
										}) : null
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex w-full min-w-0 gap-2 overflow-x-auto pb-1",
								children: INTERVALS.map((item) => {
									const on = desk.settings.interval === item.id;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-pressed": on,
										onClick: () => desk.setInterval(item.id),
										className: clsx("min-h-11 shrink-0 rounded-md border px-3 font-mono text-sm", on ? "border-line bg-surface-2 text-fg" : "border-transparent text-muted"),
										children: item.label
									}, item.id);
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex w-full min-w-0 gap-2 overflow-x-auto pb-1",
							children: listOf("moex").map((item) => {
								const on = desk.settings.ticker === item.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": on,
									onClick: () => desk.setTicker(item.id),
									className: clsx("min-h-11 shrink-0 rounded-md border px-3 font-mono text-sm", on ? "border-line bg-surface-2 text-fg" : "border-transparent text-muted"),
									children: item.id
								}, item.id);
							})
						})]
					}),
					desk.notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "border-t border-line px-4 py-2 text-sm text-warn",
						children: desk.notice
					}) : null,
					desk.feedError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "border-t border-line px-4 py-2 text-sm text-warn",
						children: desk.feedError
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 lg:grid-cols-4 lg:grid-rows-none lg:overflow-y-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: clsx("min-h-0 min-w-0 overflow-hidden rounded-lg border border-line bg-surface lg:col-span-3", panel("chart", tab)),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-line px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-mono text-xs tracking-widest text-muted uppercase",
								children: "График"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-xs text-muted",
								children: switching ? `грузим ${desk.settings.ticker}` : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-warn",
										children: "EMA 9"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: " · EMA 21" }),
									desk.updatedAt ? ` · ${formatTime(desk.updatedAt)}` : ""
								] })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {
							candles: quote?.candles ?? [],
							fast: quote ? read?.emaFast ?? [] : [],
							slow: quote ? read?.emaSlow ?? [] : [],
							guides: quote ? guides : []
						}) })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: clsx("min-h-0 min-w-0 overflow-y-auto rounded-lg border border-line bg-surface lg:col-span-1", panel("book", tab)),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-b border-line px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-mono text-xs tracking-widest text-muted uppercase",
								children: "Стакан"
							}), quote && !quote.session ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted",
								children: "Вне сессии стакан пуст. Ниже последние сделки."
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "py-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderBook, {
								bids: quote?.bids ?? [],
								asks: quote?.asks ?? [],
								tape: quote?.tape ?? [],
								spreadBps: quote && quote.bid > 0 && quote.ask > 0 ? read?.spreadBps ?? null : null
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: clsx("min-h-0 min-w-0 overflow-y-auto rounded-lg border border-line bg-surface lg:col-span-2", panel("agent", tab)),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 border-b border-line px-3 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-mono text-xs tracking-widest text-muted uppercase",
									children: "Агент"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": desk.settings.agentOn,
									onClick: () => desk.toggleAgent(),
									className: clsx("min-h-11 rounded-md border px-3 text-sm", desk.settings.agentOn ? "border-up text-up" : "border-line text-muted"),
									children: desk.settings.agentOn ? "Включён" : "Выключен"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "border-b border-line px-3 py-2 text-xs text-muted",
								children: "Работает, пока открыта эта страница: сигнал по текущей бумаге сам уходит в заявку. Остальной список без страницы обходит только служба на твоём сервере."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-end justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-xs text-muted",
											children: "Состояние"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-lg font-medium",
											children: phase
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-mono text-xs text-muted",
												children: "Скор"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: clsx("font-mono text-lg tabular-nums", desk.smooth > 8 ? "text-up" : desk.smooth < -8 ? "text-down" : "text-fg"),
												children: read ? `${desk.smooth >= 0 ? "+" : "−"}${Math.abs(desk.smooth).toFixed(0)}` : "—"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative h-2 rounded-full bg-bg",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-0 left-1/2 h-full w-px bg-line" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: clsx("absolute top-0 h-full", desk.smooth >= 0 ? "bg-up" : "bg-down"),
											style: desk.smooth >= 0 ? {
												left: "50%",
												width: `${Math.min(50, Math.abs(desk.smooth) / 2)}%`
											} : {
												right: "50%",
												width: `${Math.min(50, Math.abs(desk.smooth) / 2)}%`
											}
										})]
									}),
									desk.holdNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-warn",
										children: desk.holdNote
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-xs text-muted",
										children: [
											"Убытков агента сегодня ",
											lossToday,
											". Новые входы из-за них не останавливаются."
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "mb-1 font-mono text-xs tracking-widest text-muted uppercase",
										children: "Обход"
									}), looks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Служба списка ещё молчит. Заявка по бумаге на экране уйдёт отсюда, если сигнал подтверждён."
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "grid max-h-40 gap-1 overflow-auto",
										children: looks.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "font-mono text-xs",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-muted",
													children: [formatTime(row.t), " "]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-fg",
													children: row.ticker
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-muted",
													children: [" · ", row.text]
												})
											]
										}, `${row.t}-${row.ticker}`))
									})] }),
									read ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-fg",
										children: read.note
									}) : null,
									read ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-xs text-muted",
										children: [
											"История: ",
											read.dailyBars,
											" дневных свечей · ",
											read.intraBars,
											" на графике"
										]
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
										children: (read?.factors ?? []).map((factor) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "rounded-md border border-line bg-bg px-2 py-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs text-muted",
												children: factor.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: clsx("font-mono text-sm", factor.tone === "up" ? "text-up" : factor.tone === "down" ? "text-down" : "text-fg"),
												children: factor.detail
											})]
										}, factor.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-md border border-line bg-bg p-3",
										children: [position ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-wrap items-end justify-between gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "font-mono text-xs text-muted",
														children: [
															position.side === "long" ? "Лонг" : "Шорт",
															" ",
															position.ticker,
															" · ",
															formatQty(position.qty),
															" · вход",
															" ",
															formatPx(position.priceOpen)
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: clsx("font-mono text-xl tabular-nums", pnl >= 0 ? "text-up" : "text-down"),
														children: [
															formatSigned(pnl),
															" ",
															unitOf(position.ticker)
														]
													})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-right font-mono text-xs text-muted",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Тейк ", formatPx(position.target)] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Стоп ", formatPx(position.stop)] })]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-2 overflow-hidden rounded-full bg-surface-2",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: clsx("h-full", pnl >= 0 ? "bg-up" : "bg-down"),
														style: { width: `${progress}%` }
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm text-muted",
													children: "Стоп и тейк 1 к 3 от цены входа. Комиссия уже в результате."
												})
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-sm text-muted",
											children: [
												"По этому тикеру пусто. Агент сам войдёт, когда дневки и час смотрят в одну сторону. Размер",
												" ",
												desk.account.sizePct,
												"% капитала, риск ",
												desk.account.riskPct,
												"% цены."
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 flex flex-wrap gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void desk.manualOpen("long"),
													className: "min-h-11 rounded-md border border-up px-3 text-sm text-up",
													children: "Купить"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void desk.manualOpen("short"),
													className: "min-h-11 rounded-md border border-down px-3 text-sm text-down",
													children: "Шорт"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: !position,
													onClick: () => position && void desk.manualClose(position.id),
													className: "min-h-11 rounded-md border border-line px-3 text-sm text-fg disabled:opacity-40",
													children: "Закрыть"
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-3 sm:grid-cols-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Риск, % от цены",
												value: desk.account.riskPct,
												step: .05,
												min: .15,
												max: 3,
												onChange: (riskPct) => void desk.patchAccount({ riskPct })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Комиссия брокера, % на сторону",
												value: desk.account.commissionPct,
												step: .01,
												min: 0,
												max: 1,
												onChange: (commissionPct) => void desk.patchAccount({ commissionPct })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Размер позиции, % капитала",
												value: desk.account.sizePct,
												step: 1,
												min: 1,
												max: 100,
												onChange: (sizePct) => void desk.patchAccount({ sizePct })
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
												label: "Новый капитал, ₽",
												value: seed,
												step: 1e5,
												min: 1e4,
												max: 1e8,
												onChange: setSeed
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void desk.patchAccount({ capital: seed }),
										className: "min-h-11 self-start rounded-md border border-line px-3 text-sm",
										children: "Записать капитал"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted",
										children: [
											"Тейк агента считается от уровня: риск это расстояние до стопа, цель в три раза дальше. Ручная кнопка берёт риск ",
											desk.account.riskPct,
											"% цены. Комиссия списывается и на вход, и на выход."
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid gap-2 border-t border-line pt-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
													className: "text-sm font-medium",
													children: "Разбор ИИ"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: asking || !quote,
													onClick: () => void askModel(),
													className: "min-h-11 rounded-md border border-line px-3 text-sm disabled:opacity-40",
													children: asking ? "Смотрит…" : "Спросить"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-muted",
												children: "Запрос только по кнопке и только как смещение. Сделки открывает и закрывает агент сам."
											}),
											desk.settings.aiBias ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-sm",
												children: [
													"Активно: ",
													biasWord(desk.settings.aiBias),
													". ",
													desk.settings.aiNote
												]
											}) : null,
											suggestion ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-md border border-line bg-bg p-3 text-sm",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: suggestion.note }), suggestion.bias ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													className: "mt-2 min-h-11 rounded-md border border-line px-3",
													onClick: () => {
														desk.setBias(suggestion.bias, suggestion.note);
														setSuggestion(null);
													},
													children: ["Принять: ", biasWord(suggestion.bias)]
												}) : null]
											}) : null,
											aiError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-warn",
												children: aiError
											}) : null,
											desk.settings.aiBias ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => desk.setBias(null, ""),
												className: "min-h-11 self-start rounded-md border border-line px-3 text-sm text-muted",
												children: "Сбросить смещение"
											}) : null
										]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: clsx("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface lg:col-span-2", panel("journal", tab)),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "shrink-0 border-b border-line px-3 py-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-mono text-xs tracking-widest text-muted uppercase",
									children: "Журнал"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 font-mono text-xs text-muted",
									children: [
										"сегодня ",
										todayClosed.length,
										" · ",
										formatSigned(todayPnl),
										" ₽ · всего плюс ",
										wins,
										" · минус ",
										losses
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "shrink-0 border-b border-line p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "mb-2 font-mono text-xs tracking-widest text-muted uppercase",
									children: "Открытые"
								}), desk.open.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: "Открытых сделок нет."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid max-h-48 gap-2 overflow-y-auto",
									children: desk.open.map((trade) => {
										const livePnlNow = floating(trade);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
											className: "min-w-0 overflow-hidden rounded-md border border-line p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start justify-between gap-3",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: clsx("font-mono text-sm", trade.side === "long" ? "text-up" : "text-down"),
															children: [
																trade.side === "long" ? "лонг" : "шорт",
																" ",
																trade.ticker
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "mt-1 font-mono text-xs break-words text-muted",
															children: [
																"вход ",
																formatPx(trade.priceOpen),
																" · ",
																formatQty(trade.qty),
																" · ",
																formatStamp(trade.openedAt)
															]
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: clsx("shrink-0 text-right font-mono text-sm", (livePnlNow ?? 0) >= 0 ? "text-up" : "text-down"),
														children: livePnlNow == null ? "—" : `${formatSigned(livePnlNow)} ${unitOf(trade.ticker)}`
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-muted",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["стоп ", formatPx(trade.stop)] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["тейк ", formatPx(trade.target)] })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void desk.manualClose(trade.id),
													className: "mt-3 min-h-11 rounded-md border border-line px-3 text-xs",
													children: "Закрыть"
												})
											]
										}, trade.id);
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid min-h-0 flex-1 gap-4 overflow-y-auto p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "grid gap-1",
									children: desk.logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										className: "text-sm text-muted",
										children: "Агент ещё молчит. Решения появятся здесь."
									}) : desk.logs.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "font-mono text-xs break-words text-fg",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted",
											children: [formatTime(line.t), " "]
										}), line.text]
									}, line.id))
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-2",
									children: desk.closed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Закрытых сделок нет."
									}) : desk.closed.map((trade) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
										className: "min-w-0 overflow-hidden rounded-md border border-line p-3 font-mono text-sm",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start justify-between gap-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: clsx("min-w-0", trade.side === "long" ? "text-up" : "text-down"),
													children: [
														trade.side === "long" ? "лонг" : "шорт",
														" ",
														trade.ticker
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: clsx("shrink-0", (trade.pnl ?? 0) >= 0 ? "text-up" : "text-down"),
													children: [
														formatSigned(trade.pnl ?? 0),
														" ",
														unitOf(trade.ticker)
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 text-xs break-words text-muted",
												children: [
													"вход ",
													formatPx(trade.priceOpen),
													" · ",
													formatQty(trade.qty),
													" · ",
													formatStamp(trade.openedAt),
													trade.closedAt ? ` → ${formatStamp(trade.closedAt)}` : ""
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1 text-xs text-muted",
												children: ["комиссия ", formatUsd(trade.commission)]
											}),
											trade.pnl != null && trade.pnl < 0 && trade.lesson ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-2 text-xs break-words text-warn",
												children: trade.lesson
											}) : null
										]
									}, trade.id))
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "z-30 grid shrink-0 grid-cols-4 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden",
				children: TABS.map((item) => {
					const Icon = item.icon;
					const on = tab === item.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTab(item.id),
						className: clsx("flex min-h-nav flex-col items-center justify-center gap-1 text-xs", on ? "text-fg" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "size-5",
							strokeWidth: 1.75,
							"aria-hidden": "true"
						}), item.label]
					}, item.id);
				})
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {});
}
//#endregion
export { Home as component };
