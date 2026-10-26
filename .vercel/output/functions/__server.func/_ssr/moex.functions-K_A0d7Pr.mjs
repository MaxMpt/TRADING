import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as nameOf, c as venueOf, i as moexSession, r as lotStep } from "./market-CFNBOnBe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/moex.functions-K_A0d7Pr.js
var ROOT = "https://data-api.binance.vision/api/v3";
var cache$1 = /* @__PURE__ */ new Map();
function num$1(value) {
	const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isFinite(n) ? n : 0;
}
function binanceInterval(interval) {
	if (interval === "60") return "1h";
	if (interval === "24") return "1d";
	return "5m";
}
async function getJson(path) {
	const res = await fetch(`${ROOT}${path}`, { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error("Криптобиржа не ответила");
	return res.json();
}
function asCandles$1(payload) {
	if (!Array.isArray(payload)) return [];
	return payload.filter(Array.isArray).map((row) => {
		const cells = row;
		return {
			t: num$1(cells[0]),
			o: num$1(cells[1]),
			h: num$1(cells[2]),
			l: num$1(cells[3]),
			c: num$1(cells[4]),
			v: num$1(cells[5])
		};
	}).filter((candle) => candle.t > 0 && candle.c > 0);
}
async function klines(symbol, interval, limit, ttl) {
	const key = `${symbol}:${interval}:${limit}`;
	const hit = cache$1.get(key);
	if (hit && Date.now() - hit.at < ttl) return hit.candles;
	const candles = asCandles$1(await getJson(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`));
	cache$1.set(key, {
		at: Date.now(),
		candles
	});
	return candles;
}
function levels(payload, side) {
	const rows = payload && typeof payload === "object" ? payload[side] : [];
	if (!Array.isArray(rows)) return [];
	return rows.filter(Array.isArray).slice(0, 12).map((row) => ({
		price: num$1(row[0]),
		qty: num$1(row[1])
	})).filter((level) => level.price > 0 && level.qty > 0);
}
function quoteFrom$1(row) {
	const ticker = String(row.symbol ?? "");
	const last = num$1(row.lastPrice);
	const prev = num$1(row.prevClosePrice) || last;
	const bid = num$1(row.bidPrice) || last;
	const ask = num$1(row.askPrice) || last;
	return {
		ticker,
		name: nameOf(ticker),
		last,
		prev,
		bid,
		ask,
		changePct: prev > 0 ? (last - prev) / prev * 100 : num$1(row.priceChangePercent),
		lot: lotStep(ticker),
		decimals: last >= 1e3 ? 2 : last >= 1 ? 3 : 6,
		valueToday: num$1(row.quoteVolume),
		session: last > 0,
		unit: "USDT"
	};
}
async function fetchCryptoSnapshot(ticker, interval) {
	const symbol = ticker;
	const intraInterval = binanceInterval(interval);
	const [day, intra, stats, book, prints] = await Promise.all([
		klines(symbol, "1d", 800, 6e4),
		interval === "24" ? Promise.resolve([]) : klines(symbol, intraInterval, 500, 5e3),
		getJson(`/ticker/24hr?symbol=${symbol}`),
		getJson(`/depth?symbol=${symbol}&limit=20`).catch(() => ({
			bids: [],
			asks: []
		})),
		getJson(`/aggTrades?symbol=${symbol}&limit=40`).catch(() => [])
	]);
	const quote = quoteFrom$1(stats ?? {});
	const bids = levels(book, "bids");
	const asks = levels(book, "asks");
	if (bids[0]) quote.bid = bids[0].price;
	if (asks[0]) quote.ask = asks[0].price;
	const tape = (Array.isArray(prints) ? prints : []).map((row) => {
		const print = row;
		return {
			id: num$1(print.a),
			price: num$1(print.p),
			qty: num$1(print.q),
			time: num$1(print.T),
			sell: print.m === true
		};
	}).filter((print) => print.price > 0 && print.qty > 0);
	return {
		...quote,
		interval,
		candles: interval === "24" ? day : intra,
		daily: day,
		bids,
		asks,
		tape
	};
}
async function fetchCryptoQuotes(tickers) {
	if (!tickers.length) return [];
	const payload = await getJson(`/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(tickers))}`);
	return (Array.isArray(payload) ? payload : [payload]).filter((row) => row && typeof row === "object").map((row) => quoteFrom$1(row)).filter((quote) => quote.last > 0);
}
var REST = "https://invest-public-api.tbank.ru/rest/tinkoff.public.invest.api.contract.v1.MarketDataService";
var INTERVAL_NAME = {
	"5": "CANDLE_INTERVAL_5_MIN",
	"10": "CANDLE_INTERVAL_10_MIN",
	"15": "CANDLE_INTERVAL_15_MIN",
	"30": "CANDLE_INTERVAL_30_MIN",
	"60": "CANDLE_INTERVAL_HOUR",
	"24": "CANDLE_INTERVAL_DAY"
};
function tinkoffToken() {
	return (process.env.TINKOFF_TOKEN || process.env.INVEST_TOKEN || "").trim();
}
function money(value) {
	if (!value) return 0;
	const units = Number(value.units ?? 0);
	const nano = Number(value.nano ?? 0);
	return (Number.isFinite(units) ? units : 0) + (Number.isFinite(nano) ? nano : 0) / 1e9;
}
async function post(token, method, body) {
	try {
		const res = await fetch(`${REST}/${method}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(8e3)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
async function tinkoffCandles(token, ticker, interval, days) {
	const to = /* @__PURE__ */ new Date();
	const from = /* @__PURE__ */ new Date(Date.now() - days * 864e5);
	const rows = (await post(token, "GetCandles", {
		instrumentId: `${ticker}_TQBR`,
		from: from.toISOString(),
		to: to.toISOString(),
		interval: INTERVAL_NAME[interval],
		candleSourceType: "CANDLE_SOURCE_EXCHANGE"
	}))?.candles;
	if (!Array.isArray(rows) || rows.length === 0) return null;
	const candles = [];
	for (const row of rows) {
		const bar = row;
		const t = bar.time ? Date.parse(bar.time) : 0;
		const c = money(bar.close);
		if (!(t > 0) || !(c > 0)) continue;
		candles.push({
			t,
			o: money(bar.open) || c,
			h: money(bar.high) || c,
			l: money(bar.low) || c,
			c,
			v: Number(bar.volume ?? 0) || 0
		});
	}
	candles.sort((a, b) => a.t - b.t);
	return candles.length ? candles : null;
}
async function tinkoffBook(token, ticker) {
	const payload = await post(token, "GetOrderBook", {
		instrumentId: `${ticker}_TQBR`,
		depth: 15
	});
	if (!payload || typeof payload !== "object") return null;
	const book = payload;
	const side = (rows) => (rows ?? []).map((row) => ({
		price: money(row.price),
		qty: Number(row.quantity ?? 0) || 0
	})).filter((row) => row.price > 0);
	const bids = side(book.bids).sort((a, b) => b.price - a.price);
	const asks = side(book.asks).sort((a, b) => a.price - b.price);
	const last = money(book.lastPrice) || money(book.closePrice) || bids[0]?.price || asks[0]?.price || 0;
	if (!(last > 0)) return null;
	return {
		bid: bids[0]?.price ?? last,
		ask: asks[0]?.price ?? last,
		last,
		bids,
		asks
	};
}
var ISS = "https://iss.moex.com/iss";
var cache = /* @__PURE__ */ new Map();
function allowed(ticker) {
	return venueOf(ticker) !== null;
}
function num(value) {
	const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
	return Number.isFinite(n) ? n : 0;
}
function moexTime(value) {
	if (typeof value !== "string" || !value) return 0;
	const ms = Date.parse(value.replace(" ", "T") + "+03:00");
	return Number.isFinite(ms) ? ms : 0;
}
function table(block) {
	if (!block || typeof block !== "object") return [];
	const source = block;
	if (!Array.isArray(source.columns) || !Array.isArray(source.data)) return [];
	const columns = source.columns.map(String);
	return source.data.filter(Array.isArray).map((row) => {
		const record = {};
		columns.forEach((column, index) => {
			record[column] = row[index];
		});
		return record;
	});
}
async function iss(path) {
	let last;
	for (let attempt = 0; attempt < 2; attempt++) try {
		const res = await fetch(`${ISS}${path}`, {
			headers: {
				Accept: "application/json",
				"User-Agent": "ordo"
			},
			signal: AbortSignal.timeout(8e3)
		});
		const text = await res.text();
		if (!res.ok || text.trim().startsWith("<")) throw new Error("Мосбиржа не ответила");
		return JSON.parse(text);
	} catch (error) {
		last = error;
	}
	throw last instanceof Error ? last : /* @__PURE__ */ new Error("Мосбиржа не ответила");
}
function asCandles(payload) {
	return table(payload.candles).map((row) => ({
		t: moexTime(row.begin),
		o: num(row.open),
		h: num(row.high),
		l: num(row.low),
		c: num(row.close),
		v: num(row.volume)
	})).filter((candle) => candle.t > 0 && candle.c > 0);
}
async function candles(ticker, interval, from, ttl = 6e4) {
	const key = `${ticker}:${interval}:${from}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < ttl) return hit.candles;
	const all = [];
	for (let start = 0; start < 6e3; start += 500) {
		const page = asCandles(await iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}/candles.json?interval=${interval}&from=${from}&start=${start}&iss.meta=off`));
		all.push(...page);
		if (page.length < 500) break;
	}
	cache.set(key, {
		at: Date.now(),
		candles: all
	});
	return all;
}
function foldMinutes(candles, minutes) {
	const span = minutes * 6e4;
	const buckets = /* @__PURE__ */ new Map();
	for (const candle of candles) {
		const bucket = Math.floor(candle.t / span) * span;
		const prev = buckets.get(bucket);
		if (!prev) {
			buckets.set(bucket, {
				...candle,
				t: bucket
			});
			continue;
		}
		prev.h = Math.max(prev.h, candle.h);
		prev.l = Math.min(prev.l, candle.l);
		prev.c = candle.c;
		prev.v += candle.v;
	}
	return [...buckets.values()].sort((a, b) => a.t - b.t);
}
var ISS_INTERVAL = {
	"10": "10",
	"60": "60",
	"24": "24"
};
async function chartCandles(ticker, interval) {
	const token = tinkoffToken();
	if (token) {
		const remote = await tinkoffCandles(token, ticker, interval, interval === "24" ? 400 : interval === "60" ? 40 : 5);
		if (remote && remote.length >= 20) return remote;
	}
	const native = ISS_INTERVAL[interval];
	if (native) return candles(ticker, native, interval === "24" ? dayStamp(400) : interval === "60" ? dayStamp(40) : dayStamp(5), interval === "24" ? 9e5 : 2e4);
	const minutes = interval === "15" ? 15 : interval === "30" ? 30 : 5;
	return foldMinutes(await candles(ticker, "1", dayStamp(1), 2e4), minutes);
}
function dayStamp(offset) {
	return (/* @__PURE__ */ new Date(Date.now() - offset * 864e5)).toISOString().slice(0, 10);
}
function soon(promise, ms) {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), ms);
		promise.then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, () => {
			clearTimeout(timer);
			resolve(null);
		});
	});
}
function quoteFrom(ticker, payload) {
	const root = payload;
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
		changePct: prev > 0 ? (last - prev) / prev * 100 : 0,
		lot: Math.max(1, num(sec.LOTSIZE) || 1),
		decimals: Math.max(0, num(sec.DECIMALS) || 1),
		valueToday: num(md.VALTODAY),
		session,
		unit: "₽"
	};
}
var snaps = /* @__PURE__ */ new Map();
var inflight = /* @__PURE__ */ new Map();
async function fetchSnapshot(ticker, interval) {
	const token = tinkoffToken();
	const book = token ? await tinkoffBook(token, ticker) : null;
	const chartPromise = chartCandles(ticker, interval);
	const dailyPromise = token && interval !== "24" ? tinkoffCandles(token, ticker, "24", 400).then((rows) => rows ?? candles(ticker, "24", dayStamp(400), 9e5)) : candles(ticker, "24", dayStamp(400), 9e5);
	const [board, trades, chart, daily] = await Promise.all([
		book ? Promise.resolve(null) : iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?iss.meta=off`),
		book ? Promise.resolve(null) : soon(iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}/trades.json?iss.meta=off`), 3e3),
		chartPromise,
		dailyPromise
	]);
	const quote = book ? {
		...quoteFrom(ticker, {
			securities: [{
				SHORTNAME: nameOf(ticker),
				LOTSIZE: lotStep(ticker),
				DECIMALS: 2,
				PREVPRICE: book.last
			}],
			marketdata: [{
				LAST: book.last,
				BID: book.bid,
				OFFER: book.ask
			}]
		}),
		bid: book.bid,
		ask: book.ask,
		last: book.last,
		lot: lotStep(ticker),
		session: moexSession() && book.bid > 0 && book.ask > 0
	} : quoteFrom(ticker, board);
	const tape = (trades ? table(trades.trades).map((row) => ({
		id: num(row.TRADENO),
		price: num(row.PRICE),
		qty: num(row.QUANTITY),
		time: moexTime(`${row.TRADEDATE ?? ""} ${row.TRADETIME ?? ""}`.trim()),
		sell: row.BUYSELL === "S"
	})).filter((print) => print.price > 0 && print.qty > 0).sort((a, b) => a.time - b.time) : []).slice(-40);
	const market = table(board?.marketdata)[0];
	const bids = book?.bids ?? (quote.bid > 0 ? [{
		price: quote.bid,
		qty: num(market?.BIDDEPTH)
	}] : []);
	const asks = book?.asks ?? (quote.ask > 0 ? [{
		price: quote.ask,
		qty: num(market?.OFFERDEPTH)
	}] : []);
	return {
		...quote,
		interval,
		candles: chart,
		daily,
		bids,
		asks,
		tape
	};
}
function loadFresh(ticker, interval) {
	const key = `${ticker}:${interval}`;
	const pending = inflight.get(key);
	if (pending) return pending;
	const job = fetchSnapshot(ticker, interval).then((snap) => {
		snaps.set(key, {
			at: Date.now(),
			snap
		});
		return snap;
	}).finally(() => {
		if (inflight.get(key) === job) inflight.delete(key);
	});
	inflight.set(key, job);
	return job;
}
async function loadSnapshot(ticker, interval) {
	if (venueOf(ticker) === "crypto") return fetchCryptoSnapshot(ticker, interval);
	const key = `${ticker}:${interval}`;
	const hit = snaps.get(key);
	const age = hit ? Date.now() - hit.at : Infinity;
	if (hit && age < 4e3) return hit.snap;
	if (hit && age < 3e5) {
		loadFresh(ticker, interval).catch(() => {});
		return hit.snap;
	}
	return loadFresh(ticker, interval);
}
async function loadQuoteList(tickers) {
	const clean = tickers.filter((ticker) => allowed(ticker)).slice(0, 24);
	const crypto = clean.filter((ticker) => venueOf(ticker) === "crypto");
	const shares = clean.filter((ticker) => venueOf(ticker) === "moex");
	const [cryptoQuotes, boards] = await Promise.all([crypto.length ? fetchCryptoQuotes(crypto) : Promise.resolve([]), Promise.all(shares.map(async (ticker) => {
		try {
			return quoteFrom(ticker, await iss(`/engines/stock/markets/shares/boards/TQBR/securities/${ticker}.json?iss.meta=off&iss.only=securities,marketdata`));
		} catch {
			return null;
		}
	}))]);
	return [...cryptoQuotes, ...boards.filter((quote) => quote != null)];
}
var loadMarket_createServerFn_handler = createServerRpc({
	id: "4799583ec167b881fc736ed2da12aaa708ef1a58e474c54b6ab43d7ff41640ff",
	name: "loadMarket",
	filename: "src/lib/moex.functions.ts"
}, (opts) => loadMarket.__executeServer(opts));
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
}).handler(loadMarket_createServerFn_handler, async ({ data }) => loadSnapshot(data.ticker, data.interval));
var loadQuotes_createServerFn_handler = createServerRpc({
	id: "a5274d1bc11c8ccc3eac6ca3185ea120006bc0b323ea82376d4980aa244e34d7",
	name: "loadQuotes",
	filename: "src/lib/moex.functions.ts"
}, (opts) => loadQuotes.__executeServer(opts));
var loadQuotes = createServerFn({ method: "POST" }).validator((input) => {
	const tickers = input.tickers;
	if (!Array.isArray(tickers)) return { tickers: [] };
	return { tickers: tickers.filter((ticker) => typeof ticker === "string" && allowed(ticker)).slice(0, 8) };
}).handler(loadQuotes_createServerFn_handler, async ({ data }) => loadQuoteList(data.tickers));
var loadLooks_createServerFn_handler = createServerRpc({
	id: "d12b78ca237d57038046dbc32c56c5d06cd6841e61f5d1389927b81daf76e6e0",
	name: "loadLooks",
	filename: "src/lib/moex.functions.ts"
}, (opts) => loadLooks.__executeServer(opts));
var loadLooks = createServerFn({ method: "GET" }).handler(loadLooks_createServerFn_handler, async () => {
	return (globalThis.__ordoLooks ?? []).slice(0, 12);
});
//#endregion
export { loadLooks_createServerFn_handler, loadMarket_createServerFn_handler, loadQuotes_createServerFn_handler };
