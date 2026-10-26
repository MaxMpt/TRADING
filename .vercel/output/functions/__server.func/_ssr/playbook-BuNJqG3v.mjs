//#region node_modules/.nitro/vite/services/ssr/assets/playbook-BuNJqG3v.js
function moscowDay(ts) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(new Date(ts));
}
function explainLoss(input) {
	const risk = input.entry > 0 ? Math.abs(input.stop - input.entry) / input.entry : 0;
	const lines = [];
	if (risk > 0 && risk < .01) lines.push(`Стоп был всего ${(risk * 100).toFixed(2)}% от цены. Это шум, не уровень.`);
	if (input.heldMs >= 0 && input.heldMs < 12e5) lines.push("Цена пошла против почти сразу. Вход попал в пилу или в устаревшую котировку.");
	if (input.side === "short" && input.exit > input.entry) lines.push("После шорта покупатели продолжили вверх.");
	if (input.side === "long" && input.exit < input.entry) lines.push("После лонга продавцы продолжили вниз.");
	lines.push(`${input.ticker} сегодня повторно не беру. Новый шорт только ниже VWAP, лонг только выше, и только если ADX от 20.`);
	return lines.join(" ");
}
function lostTickersToday(closed, now = Date.now()) {
	const day = moscowDay(now);
	return closed.filter((trade) => trade.via === "agent" && trade.pnl != null && trade.pnl < 0 && trade.closedAt != null && moscowDay(trade.closedAt) === day).map((trade) => trade.ticker);
}
function agentLossesToday(closed, now = Date.now()) {
	const day = moscowDay(now);
	return closed.filter((trade) => trade.via === "agent" && trade.pnl != null && trade.pnl < 0 && trade.closedAt != null && moscowDay(trade.closedAt) === day).length;
}
function brackets(side, entry, riskPct) {
	const risk = riskPct / 100;
	if (side === "short") return {
		stop: entry * (1 + risk),
		target: entry * (1 - 3 * risk)
	};
	return {
		stop: entry * (1 - risk),
		target: entry * (1 + 3 * risk)
	};
}
function tradePnl(side, qty, entry, exit, commissionPct) {
	const gross = side === "long" ? (exit - entry) * qty : (entry - exit) * qty;
	const feeOpen = Math.abs(entry * qty) * (commissionPct / 100);
	const feeClose = Math.abs(exit * qty) * (commissionPct / 100);
	return {
		gross,
		feeOpen,
		feeClose,
		commission: feeOpen + feeClose,
		pnl: gross - feeOpen - feeClose
	};
}
function sizeOrder(args) {
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
	return {
		qty,
		amount,
		fee
	};
}
function exitHit(side, stop, target, bid, ask, last) {
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
function livePnl(side, qty, entry, commissionPaid, bid, ask, last, commissionPct) {
	const px = side === "long" ? bid || last : ask || last;
	if (!(px > 0)) return {
		pnl: 0,
		px: last
	};
	const gross = side === "long" ? (px - entry) * qty : (entry - px) * qty;
	const feeClose = Math.abs(px * qty) * (commissionPct / 100);
	return {
		pnl: gross - commissionPaid - feeClose,
		px
	};
}
function decide(input) {
	if (input.inPosition && input.side) {
		const hit = exitHit(input.side, input.stop, input.target, input.bid, input.ask, input.last);
		if (hit === "target" || hit === "stop") return {
			intent: {
				type: "close",
				reason: hit
			},
			streakSide: null,
			streakN: 0,
			holdNote: null
		};
		return {
			intent: { type: "none" },
			streakSide: null,
			streakN: 0,
			holdNote: input.session ? null : "Позиция открыта. Цена обновится в сессию."
		};
	}
	if (!input.agentOn) return {
		intent: { type: "none" },
		streakSide: null,
		streakN: 0,
		holdNote: null
	};
	if (!input.session) return {
		intent: { type: "none" },
		streakSide: null,
		streakN: 0,
		holdNote: "Торги закрыты. Утро с 6:50, основная до 19:00, вечерняя до 23:50 МСК. В выходные с 9:50 до 19:00."
	};
	if (input.call === "flat" || input.bias === "flat") return {
		intent: { type: "none" },
		streakSide: null,
		streakN: 0,
		holdNote: input.bias === "flat" ? "Смещение ИИ: вне рынка" : "История не даёт перевеса. Жду."
	};
	let want = null;
	if (input.call === "short" && input.score <= -58 && input.bias !== "long") want = "short";
	if (input.call === "long" && input.score >= 58 && input.bias !== "short") want = "long";
	const need = Math.abs(input.score) >= 74 ? 1 : 2;
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
	if (want && streakN >= need) return {
		intent: {
			type: "open",
			side: want
		},
		streakSide,
		streakN,
		holdNote: null
	};
	return {
		intent: { type: "none" },
		streakSide,
		streakN,
		holdNote: null
	};
}
function sma(values, period, end = values.length) {
	if (period < 1 || end < period || end > values.length) return null;
	let sum = 0;
	for (let i = end - period; i < end; i++) sum += values[i] ?? 0;
	return sum / period;
}
function stageOf(daily) {
	const closes = daily.map((bar) => bar.c);
	const empty = {
		side: "flat",
		reason: "Мало дневной истории для средних 200.",
		aboveLow: 0,
		offHigh: 0,
		slope: 0
	};
	if (closes.length < 220) return empty;
	const price = closes[closes.length - 1] ?? 0;
	const sma50 = sma(closes, 50);
	const sma150 = sma(closes, 150);
	const sma200 = sma(closes, 200);
	const sma200prev = sma(closes, 200, closes.length - 20);
	if (!(price > 0) || sma50 == null || sma150 == null || sma200 == null || sma200prev == null) return empty;
	const year = daily.slice(-252);
	const low = Math.min(...year.map((bar) => bar.l));
	const high = Math.max(...year.map((bar) => bar.h));
	const aboveLow = low > 0 ? price / low - 1 : 0;
	const offHigh = high > 0 ? 1 - price / high : 0;
	const slope = sma200prev > 0 ? sma200 / sma200prev - 1 : 0;
	const longStack = price > sma50 && sma50 > sma150 && sma150 > sma200 && slope > 0 && aboveLow >= .3 && offHigh <= .25;
	const shortStack = price < sma50 && sma50 < sma150 && sma150 < sma200 && slope < 0 && aboveLow <= .25 && offHigh >= .3;
	if (longStack) return {
		side: "long",
		reason: "Стадия роста: средние 50, 150 и 200 стоят по порядку, цена у максимума года.",
		aboveLow,
		offHigh,
		slope
	};
	if (shortStack) return {
		side: "short",
		reason: "Стадия падения: средние перевернуты, цена у минимума года.",
		aboveLow,
		offHigh,
		slope
	};
	return {
		side: "flat",
		reason: slope > 0 && price > sma200 ? "Рост есть, но шаблон неполный: цена далеко от максимума или средние не по порядку." : slope < 0 && price < sma200 ? "Падение есть, но шаблон неполный: цена далеко от минимума или средние не по порядку." : "Нет ни стадии роста, ни стадии падения.",
		aboveLow,
		offHigh,
		slope
	};
}
function span(bars) {
	let high = -Infinity;
	let low = Infinity;
	let volume = 0;
	for (const bar of bars) {
		high = Math.max(high, bar.h);
		low = Math.min(low, bar.l);
		volume += bar.v ?? 0;
	}
	return {
		high,
		low,
		width: high - low,
		volume
	};
}
function falseBreak(intra, levelHigh, levelLow) {
	const window = intra.slice(-12);
	if (window.length < 4 || !(levelHigh > levelLow)) return null;
	const last = window[window.length - 1];
	if (!last) return null;
	let piercedHigh = false;
	let piercedLow = false;
	let highExt = levelHigh;
	let lowExt = levelLow;
	for (const bar of window) {
		if (bar.h > levelHigh * 1.0015) {
			piercedHigh = true;
			highExt = Math.max(highExt, bar.h);
		}
		if (bar.l < levelLow * .9985) {
			piercedLow = true;
			lowExt = Math.min(lowExt, bar.l);
		}
	}
	const backShort = piercedHigh && last.c < levelHigh * .997 && last.c > levelLow;
	const backLong = piercedLow && last.c > levelLow * 1.003 && last.c < levelHigh;
	if (backShort && !backLong) return {
		side: "short",
		extreme: highExt
	};
	if (backLong && !backShort) return {
		side: "long",
		extreme: lowExt
	};
	return null;
}
function squeeze(daily, price, volRatio, side) {
	const done = daily.length > 1 ? daily.slice(0, -1) : daily;
	if (done.length < 12) return null;
	const recent = span(done.slice(-6));
	const prior = span(done.slice(-12, -6));
	if (!(prior.width > 0) || recent.width >= prior.width * .8) return null;
	if (prior.volume > 0 && recent.volume >= prior.volume * .9) return null;
	if (volRatio < 1.15) return null;
	if (side === "long" && price > recent.high) return { stop: recent.low };
	if (side === "short" && price < recent.low) return { stop: recent.high };
	return null;
}
function structuralStop(side, extreme) {
	if (!(extreme > 0)) return 0;
	return side === "short" ? extreme * 1.001 : extreme * .999;
}
function withEntry(side, entry, stop) {
	if (!(entry > 0) || !(stop > 0)) return null;
	const risk = side === "long" ? entry - stop : stop - entry;
	if (!(risk > 0)) return null;
	const pct = risk / entry;
	if (pct < .01 || pct > .08) return null;
	const target = side === "long" ? entry + 3 * risk : entry - 3 * risk;
	if (!(target > 0)) return null;
	return {
		stop,
		target
	};
}
function findSetup(args) {
	const stage = stageOf(args.daily);
	const floor = Math.max(args.price * .01, (args.atr ?? 0) * .5);
	const wideEnough = (side, stop) => {
		return (side === "long" ? args.price - stop : stop - args.price) >= floor;
	};
	const pierced = falseBreak(args.intra, args.levelHigh, args.levelLow);
	if (pierced && stage.side === pierced.side) {
		const stop = structuralStop(pierced.side, pierced.extreme);
		if (wideEnough(pierced.side, stop) && withEntry(pierced.side, args.price, stop)) return {
			stage,
			setup: {
				side: pierced.side,
				stop,
				model: "ложный пробой"
			}
		};
	}
	if (stage.side === "long" || stage.side === "short") {
		const broke = squeeze(args.daily, args.price, args.volRatio, stage.side);
		if (broke && wideEnough(stage.side, broke.stop) && withEntry(stage.side, args.price, broke.stop)) return {
			stage,
			setup: {
				side: stage.side,
				stop: broke.stop,
				model: "сжатие"
			}
		};
	}
	return {
		stage,
		setup: null
	};
}
//#endregion
export { findSetup as a, moscowDay as c, withEntry as d, explainLoss as i, sizeOrder as l, brackets as n, livePnl as o, decide as r, lostTickersToday as s, agentLossesToday as t, tradePnl as u };
