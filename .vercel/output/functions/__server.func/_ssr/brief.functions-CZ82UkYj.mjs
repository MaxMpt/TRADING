import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brief.functions-CZ82UkYj.js
function parseBrief(text) {
	const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start >= 0 && end > start) try {
		const parsed = JSON.parse(cleaned.slice(start, end + 1));
		return {
			bias: parsed.bias === "long" || parsed.bias === "short" || parsed.bias === "flat" ? parsed.bias : null,
			note: typeof parsed.note === "string" ? parsed.note.slice(0, 420) : cleaned.slice(0, 420)
		};
	} catch {}
	return {
		bias: null,
		note: cleaned.slice(0, 420)
	};
}
var briefMarket_createServerFn_handler = createServerRpc({
	id: "7ed25a8bf92040745229b51e32f99c885db8e19be3c40c2723e76c5d824f3a33",
	name: "briefMarket",
	filename: "src/lib/brief.functions.ts"
}, (opts) => briefMarket.__executeServer(opts));
var briefMarket = createServerFn({ method: "POST" }).validator((input) => {
	const prompt = typeof input === "object" && input && "prompt" in input ? input.prompt : "";
	if (typeof prompt !== "string" || prompt.length < 8 || prompt.length > 4e3) throw new Error("Пустой разбор");
	return { prompt };
}).handler(briefMarket_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "ИИ сейчас недоступен"
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: .2,
			max_tokens: 220,
			messages: [{
				role: "system",
				content: "Ты помощник бумажного торгового стола. Не обещай прибыль и не выдумывай цифры. Отвечай только JSON: {\"bias\":\"long\"|\"short\"|\"flat\",\"note\":\"до 280 символов по-русски\"}. bias=flat, если сигнала нет."
			}, {
				role: "user",
				content: data.prompt
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `ИИ ответил ошибкой ${res.status}`
	};
	const text = (await res.json()).choices?.[0]?.message?.content ?? "";
	if (!text) return {
		ok: false,
		error: "Пустой ответ ИИ"
	};
	const parsed = parseBrief(text);
	return {
		ok: true,
		bias: parsed.bias,
		note: parsed.note
	};
});
//#endregion
export { briefMarket_createServerFn_handler };
