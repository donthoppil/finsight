import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = "claude-haiku-4-5-20251001";

export type ParsedHolding = {
  symbol: string;
  shares: number;
  price?: number | null;
};

export type ParsedTrade = {
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  price?: number | null;
};

export type Intent =
  | { type: "add_holding"; parsed: ParsedHolding[] }
  | { type: "update_holding"; parsed: ParsedTrade[] }
  | { type: "ask_question"; query: string }
  | { type: "run_scenario"; scenario_id: string }
  | { type: "recommend_funds" }
  | { type: "rebalance" }
  | { type: "unclear"; original: string };

const ROUTER_PROMPT = `
You are an intent classifier for a portfolio management chatbot.
Given the user's message, return STRICT JSON in one of these shapes:

1. ADD HOLDING — user is telling you what they own:
{ "type": "add_holding", "parsed": [{ "symbol": "AAPL", "shares": 25, "price": null }] }

2. UPDATE HOLDING — user bought or sold:
{ "type": "update_holding", "parsed": [{ "symbol": "TSLA", "action": "sell", "shares": 5, "price": 245 }] }

3. ASK QUESTION — user is asking about their portfolio, performance, or finance topics:
{ "type": "ask_question", "query": "<the user's full question>" }

4. RUN SCENARIO — user wants a what-if analysis. ONLY classify here if the message contains explicit hypothetical phrasing: "what if", "imagine", "suppose", "what would happen". Choose the closest of these IDs:
   "market_change" | "inflation" | "withdrawal" | "rate_change" | "income_change"
{ "type": "run_scenario", "scenario_id": "market_change" }

5. RECOMMEND FUNDS — user is asking what to invest in / what to buy / how to start:
{ "type": "recommend_funds" }
- Triggers: "what should I invest in", "what should I buy", "suggest funds", "show me good options",
  "how do I start", "where should I put my money", "give me some picks".
- Do NOT classify here for analysis of EXISTING holdings ("how is AAPL doing?") — that's ask_question.

6. REBALANCE — user wants a plan to fix concentration / diversify / spread their money:
{ "type": "rebalance" }
- Triggers: "rebalance", "rebalance my portfolio", "diversify", "spread my money", "fix my portfolio",
  "what sectors am I missing", "suggest a plan", "make a rebalance plan", "balance things out",
  "I'm too concentrated in X — what should I do".
- Differs from recommend_funds: rebalance considers EXISTING holdings and prescribes phases.
  recommend_funds is for fresh-start picks.

7. UNCLEAR — anything else, including STATEMENTS about the user themselves ("I just got a raise", "I have an emergency fund now", "I'm worried about a recession"):
{ "type": "unclear", "original": "<user message>" }

RULES:
- Convert company names to tickers ("Apple" -> "AAPL", "Microsoft" -> "MSFT", "Tesla" -> "TSLA", "Nvidia" -> "NVDA").
- Common ETFs / funds: VTI, QQQ, SPY, VOO, BND, GLD, AGG, VEA, IWM, VTV, SCHD.
- "I have N shares of X", "I own X", "I bought X" with no prior trade context AND a quantity -> add_holding.
- "I sold N", explicit sell with a quantity -> update_holding action=sell.
- "I bought more N of X", "added N to my position" -> update_holding action=buy.
- "I just got a raise", "my income is now X", "I have a 401k", "I'm worried about Y" -> UNCLEAR (these are personal facts, handled by a separate profile-update step).
- If the user gives a price, capture it as a number; otherwise null.
- Scenario classification requires the hypothetical phrasing — do NOT infer scenarios from real-life statements.
- Output ONLY the JSON object. No prose, no markdown fences.

USER MESSAGE: """{message}"""
`;

function extractJson(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1);
  }
  return raw.trim();
}

export async function classifyIntent(message: string): Promise<Intent> {
  if (!client) {
    return { type: "unclear", original: message };
  }

  const prompt = ROUTER_PROMPT.replace("{message}", message.replace(/"""/g, '"""'));

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    return JSON.parse(extractJson(text)) as Intent;
  } catch (err) {
    console.error("[intent-router] failed:", err);
    return { type: "unclear", original: message };
  }
}
