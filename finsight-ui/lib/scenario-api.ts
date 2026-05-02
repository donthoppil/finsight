// Server-side helper + shared types for the live What-If scenarios.

export type ScenarioSuggestion = {
  type: string;
  text: string;
  detail?: string;
};

export type ScenarioApiResponse = {
  scenario_id: string;
  params: Record<string, unknown>;
  portfolio_today: number;
  portfolio_after: number;
  portfolio_after_nominal?: number;
  change: number;
  change_pct: number;
  cumulative_inflation_pct?: number;
  withdrawal_amount?: number;
  cash_needed?: number;
  cushion_pct?: number;
  holdings_breakdown?: Array<Record<string, unknown>>;
  sell_plan?: Array<{
    symbol: string;
    shares_to_sell: number;
    estimated_proceeds: number;
    reason: string;
  }>;
  suggestions: ScenarioSuggestion[];
  rationale: string;
  confidence: "high" | "medium" | "low";
  error?: string;
};

const SERVICE_URL = process.env.MATH_SERVICE_URL || "http://localhost:8000";

const ENDPOINT_MAP: Record<string, string> = {
  market_change: "/scenario/market-moves",
  market_moves: "/scenario/market-moves",
  inflation: "/scenario/inflation",
  withdrawal: "/scenario/withdraw",
  withdraw: "/scenario/withdraw",
  rate_change: "/scenario/rate-change",
  income_change: "/scenario/income-change",
};

export async function fetchScenario(
  scenarioId: string,
  payload: Record<string, unknown>
): Promise<ScenarioApiResponse | { error: string }> {
  const path = ENDPOINT_MAP[scenarioId];
  if (!path) return { error: `unknown scenario: ${scenarioId}` };
  try {
    const res = await fetch(`${SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) return { error: `${path} ${res.status}` };
    return (await res.json()) as ScenarioApiResponse;
  } catch (err) {
    console.warn("[scenario] fetch failed:", err);
    return { error: "math service unreachable" };
  }
}
