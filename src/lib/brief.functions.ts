import { createServerFn } from "@tanstack/react-start";

export type BriefResult =
  | { ok: true; bias: "long" | "short" | "flat" | null; note: string }
  | { ok: false; error: string };

function parseBrief(text: string): { bias: "long" | "short" | "flat" | null; note: string } {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { bias?: unknown; note?: unknown };
      const bias =
        parsed.bias === "long" || parsed.bias === "short" || parsed.bias === "flat" ? parsed.bias : null;
      const note = typeof parsed.note === "string" ? parsed.note.slice(0, 420) : cleaned.slice(0, 420);
      return { bias, note };
    } catch {
      /* raw text */
    }
  }
  return { bias: null, note: cleaned.slice(0, 420) };
}

export const briefMarket = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const prompt = typeof input === "object" && input && "prompt" in input ? (input as { prompt: unknown }).prompt : "";
    if (typeof prompt !== "string" || prompt.length < 8 || prompt.length > 4000) {
      throw new Error("Пустой разбор");
    }
    return { prompt };
  })
  .handler(async ({ data }): Promise<BriefResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "ИИ сейчас недоступен" };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "Ты помощник бумажного торгового стола. Не обещай прибыль и не выдумывай цифры. Отвечай только JSON: {\"bias\":\"long\"|\"short\"|\"flat\",\"note\":\"до 280 символов по-русски\"}. bias=flat, если сигнала нет.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) return { ok: false, error: `ИИ ответил ошибкой ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) return { ok: false, error: "Пустой ответ ИИ" };
    const parsed = parseBrief(text);
    return { ok: true, bias: parsed.bias, note: parsed.note };
  });
