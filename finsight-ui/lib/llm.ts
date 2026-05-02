import Anthropic from "@anthropic-ai/sdk";
import {
  generateProfileSummary,
  getMissingProfileFields,
  type UserProfile,
} from "@/lib/profile-summary";
import { fetchRiskSnapshot } from "@/lib/risk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `
You are Finsight, a financial coach for non-savvy investors.

ABSOLUTE RULES:
- NEVER invent any number. Use only numbers from the data provided to you in this turn.
- NEVER invent a fact about a fund, stock, tax rule, or regulation.
- Always cite sources for factual claims. Use [SEC Investor Bulletin], [Yahoo Finance], etc.
- End every recommendation with a confidence label: high / medium / low.

MONEY RULES (CRITICAL — read carefully):
- "Money already invested" (amount_invested) is what the user ALREADY has in the market. NEVER suggest buying that amount again. NEVER frame buy advice as "invest $X" where $X equals or approaches amount_invested.
- "Deployable cash per month" (monthly_contribution) is the only money the user has to BUY new investments with. Buy suggestions must be anchored to this number — typically 1 month of contribution, or split a single month's contribution across recommended funds.
- If monthly_contribution is missing or zero, do NOT suggest a dollar amount. Suggest percentage allocations instead (e.g., "split your next contribution 70% VOO, 30% BND").
- A user's annual income is NOT their buying power for this turn. Do not multiply income by anything to produce a buy amount.
- When in doubt about how much to deploy, ASK the user how much they want to invest right now rather than guessing.

CONVERSATION STYLE:
- Plain English. Short sentences. No jargon (no "alpha", "beta", "Sharpe ratio", "volatility" without translation).
- Use ONE analogy per response if helpful.
- If portfolio data is empty, suggest the user add holdings first.
- Be warm but precise.

PROFILE NUDGE:
- If profile fields are missing AND the user's question depends on them, briefly answer with what you have, then suggest:
  "To give better advice on this, tap 'Tune my plan' in the top bar to fill in [specific missing field]."

OUTPUT FORMAT (strict JSON, no markdown fences, no prose outside the JSON):
{
  "text": "the reply text in plain English",
  "citations": [{"source": "...", "claim": "..."}],
  "confidence": "high" | "medium" | "low",
  "suggested_followups": ["...", "...", "..."]
}
`;

export type AdviceContext = {
  query: string;
  holdings: Array<{
    symbol: string;
    shares: number;
    avg_cost_basis?: number | null;
    asset_class?: string | null;
  }>;
  prices: Array<{
    symbol: string;
    name?: string;
    price?: number | null;
    change_pct?: number;
    asset_class?: string;
  }>;
  profile?: UserProfile | null;
};

export type AdviceResponse = {
  text: string;
  citations: Array<{ source: string; claim: string }>;
  confidence: "high" | "medium" | "low";
  suggested_followups: string[];
};

// Strip ```json ... ``` fences and surrounding prose so JSON.parse always succeeds
// on Claude's text output (it usually returns clean JSON, but occasionally adds prose).
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

async function callClaude(opts: {
  system?: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  if (!client) throw new Error("ANTHROPIC_API_KEY missing");
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function generateAdvice(ctx: AdviceContext): Promise<AdviceResponse> {
  if (!client) {
    return {
      text: "I can't reach the AI right now — the ANTHROPIC_API_KEY is missing on the server.",
      citations: [],
      confidence: "low",
      suggested_followups: [],
    };
  }

  let total = 0;
  const enriched = ctx.holdings.map((h) => {
    const live = ctx.prices.find((p) => p.symbol === h.symbol);
    const value = h.shares * (live?.price ?? 0);
    total += value;
    return {
      ...h,
      current_price: live?.price ?? null,
      current_value: value,
      asset_class: live?.asset_class ?? h.asset_class ?? "unknown",
      name: live?.name ?? h.symbol,
    };
  });

  const allocation: Record<string, number> = {};
  enriched.forEach((h) => {
    const cls = h.asset_class ?? "unknown";
    allocation[cls] = (allocation[cls] ?? 0) + h.current_value;
  });
  Object.keys(allocation).forEach((k) => {
    allocation[k] = total > 0 ? Math.round((allocation[k] / total) * 1000) / 10 : 0;
  });

  const profileSummary = generateProfileSummary(ctx.profile ?? null);
  const missingFields = getMissingProfileFields(ctx.profile ?? null);

  const risk = await fetchRiskSnapshot(
    ctx.holdings.map((h) => ({ symbol: h.symbol, shares: h.shares })),
    (ctx.profile?.risk_feel as string | null) ?? null
  );

  const riskBlock =
    risk.overall_label === "empty"
      ? "RISK SNAPSHOT: portfolio is empty."
      : `RISK SNAPSHOT (live):
- Overall: ${risk.overall_label} (${risk.overall_score}/100)
- Top holding: ${risk.components?.concentration.top_holding} (${risk.components?.concentration.top_holding_pct}% of portfolio)
- Stock heaviness: ${risk.components?.stock_heaviness.label} (${risk.components?.stock_heaviness.individual_stock_pct}% in single stocks)
- Day-to-day swings: ${risk.components?.volatility.label} (annual volatility ~${risk.components?.volatility.annualized_vol_pct}%)
- Estimated bad-month loss: $${risk.estimates.bad_month_loss}
- Estimated 2008-style crash loss: $${risk.estimates.crash_loss}
${risk.concentration_alert ? `- ⚠ CONCENTRATION ALERT: ${risk.concentration_alert.symbol} is ${risk.concentration_alert.pct_of_portfolio}% of portfolio` : ""}
${risk.mismatch ? `- ⚠ MISMATCH: user says they would feel ${risk.mismatch.user_says}, but the portfolio is currently ${risk.mismatch.portfolio_is}` : ""}`;

  const userPrompt = `
USER QUESTION: "${ctx.query}"

WHO THE USER IS:
${profileSummary}

${
  missingFields.length > 0
    ? `MISSING PROFILE DATA: ${missingFields.join(", ")}.\nIf the user's question depends on missing fields, suggest they tap "Tune my plan" in the top bar.\n`
    : ""
}

PORTFOLIO DATA (live):
Holdings: ${JSON.stringify(enriched, null, 2)}
Total value: $${total.toFixed(2)}
Allocation by asset class (%): ${JSON.stringify(allocation)}

${riskBlock}

Use ONLY the numbers above. Do not invent. When discussing risk, reference the snapshot numbers above. Reply with ONLY the JSON object specified in the system instructions — no markdown fences, no commentary.
`;

  try {
    const text = await callClaude({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 1500,
    });
    const parsed = JSON.parse(extractJson(text)) as AdviceResponse;
    return parsed;
  } catch (err) {
    console.error("[claude] generateAdvice failed:", err);
    return {
      text: "Sorry — I had trouble forming that answer. Could you rephrase?",
      citations: [],
      confidence: "low",
      suggested_followups: [],
    };
  }
}

// ===========================================================
// Profile-update detection (used as a "tool" without function-calling SDK overhead)
// ===========================================================

export type ProfileUpdateProposal = {
  detected: boolean;
  field?: string;
  value?: string | number;
  user_phrase?: string;
};

const PROFILE_DETECT_PROMPT = `
You read a single user message and decide whether it tells the coach a NEW fact about themselves
that should update their profile (e.g., new income, emergency fund status, monthly contribution,
risk tolerance, goal, timeline, account type, fund preference, or general concerns).

Respond with STRICT JSON, one of:

A) Detected — return the field, value, and the original phrase:
{ "detected": true, "field": "<one of: goal | goal_timeline_years | risk_feel | amount_invested | monthly_contribution | income_range | account_type | has_emergency_fund | fund_preference | concerns>",
  "value": "<the new value as a STRING — for numbers send digits only, no $ or commas>",
  "user_phrase": "<the user's words>" }

B) Not detected:
{ "detected": false }

VALUE FORMATS:
- goal: "house" | "retirement" | "education" | "wealth" | "other"
- goal_timeline_years: number-as-string ("2", "5")
- risk_feel: "fine" | "nervous" | "panic" | "sell"
- amount_invested: digits only ("50000")
- monthly_contribution: digits only ("500")
- income_range: "under_50k" | "50_100k" | "100_200k" | "over_200k"
- account_type: "brokerage" | "401k" | "ira" | "mix"
- has_emergency_fund: "yes" | "no" | "partial"
- fund_preference: "etf" | "mutual_fund" | "either"
- concerns: free text

Output ONLY the JSON object. No markdown fences, no prose.

USER MESSAGE: """{message}"""
`;

export async function detectProfileUpdate(message: string): Promise<ProfileUpdateProposal> {
  if (!client) return { detected: false };
  try {
    const text = await callClaude({
      user: PROFILE_DETECT_PROMPT.replace("{message}", message),
      maxTokens: 256,
    });
    const parsed = JSON.parse(extractJson(text)) as ProfileUpdateProposal;
    return parsed;
  } catch (err) {
    console.warn("[claude] detectProfileUpdate failed:", err);
    return { detected: false };
  }
}
