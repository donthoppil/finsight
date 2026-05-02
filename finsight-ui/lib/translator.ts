export type Mode = "simple" | "detailed";

export type GlossaryEntry = {
  simple: string;
  detailed: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  volatility: { simple: "How wobbly", detailed: "Volatility" },
  drawdown: { simple: "Worst-case dip", detailed: "Drawdown" },
  rebalance: { simple: "Adjust the mix", detailed: "Rebalance" },
  stock: { simple: "Stocks", detailed: "Stocks" },
  fund: { simple: "Funds", detailed: "Mutual funds" },
  equity: { simple: "Stocks", detailed: "Equity" },
  bond: { simple: "Bonds", detailed: "Bond" },
  gold: { simple: "Gold", detailed: "Gold" },
  asset_allocation: { simple: "How your money is split", detailed: "Asset allocation" },
  diversification: { simple: "Spreading the risk", detailed: "Diversification" },
  expense_ratio: { simple: "Fund cost per year", detailed: "Expense ratio" },
  risk_tolerance: { simple: "How much wobble you're OK with", detailed: "Risk tolerance" },
  time_horizon: { simple: "When you'll need the money", detailed: "Time horizon" },
  dividend: { simple: "Cash payout", detailed: "Dividend" },
  capital_gain: { simple: "Profit when you sell", detailed: "Capital gain" },
  etf: { simple: "Bundle of stocks", detailed: "ETF" },
  concentration: { simple: "Eggs in one basket", detailed: "Concentration" },
};

export function translate(term: keyof typeof GLOSSARY, mode: Mode): string {
  const entry = GLOSSARY[term];
  if (!entry) return String(term);
  return entry[mode];
}

export type NumberType = "currency" | "percent" | "plain";

export function formatNumber(value: number, type: NumberType, mode: Mode): string {
  if (type === "currency") {
    if (mode === "simple") {
      const rounded = Math.round(value / 100) * 100;
      return rounded.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    }
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (type === "percent") {
    if (mode === "simple") {
      return `${Math.round(value)}%`;
    }
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString("en-US");
}

// Volatility band labels for the "wobbly meter"
export function volatilityLabel(volatilityPct: number, mode: Mode): string {
  if (mode === "detailed") return `Volatility ${volatilityPct.toFixed(1)}%`;
  if (volatilityPct < 8) return "Calm";
  if (volatilityPct < 15) return "A bit shaky";
  if (volatilityPct < 25) return "Wobbly";
  return "Very wobbly";
}
