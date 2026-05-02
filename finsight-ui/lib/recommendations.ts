// Server-side helper: fetch fund recommendations from the Python math service.

export type FundOption = {
  ticker: string;
  name: string;
  type: "etf" | "mutual_fund";
  asset_class: string;
  description: string;
  current_price: number;
  expense_ratio: number;
  volatility: number;
  max_drawdown: number;
  return_1y: number;
  avg_dollar_volume: number;
  stability_score: number;
  resilience_score: number;
  cost_score: number;
  liquidity_score: number;
  fit_score: number;
  behavior: {
    swings_label: string;
    swings_pct: number;
    worst_drop_label: string;
    worst_drop_3y: number;
    annual_cost_per_10k: number;
  };
};

export type RecommendationsResponse = {
  slot: string;
  user_timeline_years: number;
  user_risk_feel: string;
  options: FundOption[];
  disclaimer: string;
};

const SERVICE_URL = process.env.MATH_SERVICE_URL || "http://localhost:8000";

export async function fetchRecommendations(args: {
  timeline_years: number;
  risk_feel: string;
  account_type?: string | null;
  fund_preference?: string | null;
}): Promise<RecommendationsResponse | { error: string }> {
  try {
    const res = await fetch(`${SERVICE_URL}/recommend-funds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      return { error: `recommend-funds ${res.status}` };
    }
    return (await res.json()) as RecommendationsResponse;
  } catch (err) {
    console.warn("[recommendations] fetch failed:", err);
    return { error: "math service unreachable" };
  }
}
