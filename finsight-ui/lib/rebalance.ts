// Server-side helper + shared types for the rebalance engine.

export type RebalancePhaseItem = {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  description: string;
  amount_usd: number;
  current_price: number;
  estimated_shares: number;
  behavior: {
    swings_label: string;
    swings_pct: number;
    worst_drop_label: string;
    worst_drop_3y: number;
    annual_cost_per_10k: number;
  } | null;
  status?: "pending" | "completed" | "rejected";
};

export type RebalancePhase = {
  id: string;
  phase_number: number;
  type: "stop_buying_more" | "add_sector_diversity" | "add_stability";
  title: string;
  explanation: string;
  current_state: string;
  target_state: string;
  items: RebalancePhaseItem[];
  expected_impact: string;
};

export type RebalancePlan = {
  diagnosis: {
    issues?: Array<Record<string, unknown>>;
    primary_issue?: string;
    current_top_holding?: { symbol: string; pct: number };
    sector_breakdown?: Record<string, number>;
    asset_class_breakdown?: Record<string, number>;
    missing_sectors?: string[];
  };
  plan_summary: string;
  phases: RebalancePhase[];
  expected_after?: {
    new_portfolio_value: number;
    new_top_concentration_pct: number;
    new_top_holding: string;
    sectors_count_after: number;
    estimated_risk_improvement: string;
  };
  disclaimer?: string;
  error?: string;
};

const SERVICE_URL = process.env.MATH_SERVICE_URL || "http://localhost:8000";

export async function fetchRebalancePlan(args: {
  holdings: Array<{ symbol: string; shares: number }>;
  timeline_years: number;
  risk_feel: string;
  monthly_contribution: number;
}): Promise<RebalancePlan | { error: string }> {
  try {
    const res = await fetch(`${SERVICE_URL}/rebalance-suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) return { error: `rebalance-suggest ${res.status}` };
    return (await res.json()) as RebalancePlan;
  } catch (err) {
    console.warn("[rebalance] fetch failed:", err);
    return { error: "math service unreachable" };
  }
}
