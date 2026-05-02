// Server-side helper: fetch the risk snapshot from the Python math service.
// Mirrors lib/prices.ts in shape so route handlers can call it cleanly.

export type RiskSnapshot = {
  overall_score: number;
  overall_label: "calm" | "steady" | "moderate" | "wobbly" | "stormy" | "empty";
  components: {
    concentration: {
      score: number;
      label: string;
      top_holding: string;
      top_holding_pct: number;
      top_3_pct: number;
    };
    stock_heaviness: {
      score: number;
      label: string;
      individual_stock_pct: number;
    };
    volatility: {
      score: number;
      label: string;
      annualized_vol_pct: number;
    };
  } | null;
  concentration_alert: {
    symbol: string;
    pct_of_portfolio: number;
    value: number;
  } | null;
  estimates: { bad_month_loss: number; crash_loss: number };
  mismatch: {
    user_says: string;
    portfolio_is: string;
    severity: "medium" | "high";
  } | null;
  portfolio_value: number;
  error?: string;
};

const SERVICE_URL = process.env.MATH_SERVICE_URL || "http://localhost:8000";

export async function fetchRiskSnapshot(
  holdings: Array<{ symbol: string; shares: number }>,
  riskFeel: string | null
): Promise<RiskSnapshot> {
  if (!holdings || holdings.length === 0) {
    return {
      overall_score: 0,
      overall_label: "empty",
      components: null,
      concentration_alert: null,
      estimates: { bad_month_loss: 0, crash_loss: 0 },
      mismatch: null,
      portfolio_value: 0,
    };
  }

  try {
    const res = await fetch(`${SERVICE_URL}/risk-snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings, risk_feel: riskFeel }),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`risk-snapshot ${res.status}`);
    }
    return (await res.json()) as RiskSnapshot;
  } catch (err) {
    console.warn("[risk] fetch failed:", err);
    return {
      overall_score: 0,
      overall_label: "empty",
      components: null,
      concentration_alert: null,
      estimates: { bad_month_loss: 0, crash_loss: 0 },
      mismatch: null,
      portfolio_value: 0,
      error: "math service unreachable",
    };
  }
}
