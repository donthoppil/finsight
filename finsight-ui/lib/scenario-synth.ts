import { DEMO_PORTFOLIO, type ScenarioResult } from "@/lib/demo-data";
import type { Direction } from "@/components/scenarios/ScenarioParamPanel";
import type { IncomeMode } from "@/components/scenarios/IncomeParamPanel";

const TOTAL = DEMO_PORTFOLIO.reduce((s, h) => s + h.shares * h.price, 0);
const MONTHLY_INCOME = 6000; // demo assumption
const MONTHLY_EXPENSES = 4000;
const EMERGENCY_FUND = 12000;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// =====================
// MARKET CHANGE (drop or rise, % magnitude)
// =====================
export function synthMarket(direction: Direction, pct: number): ScenarioResult {
  const total = TOTAL;
  const signed = direction === "drop" ? -pct : pct;
  const after = total * (1 + signed / 100);
  const mitigatedSigned = signed * 0.4;
  const afterAct = total * (1 + mitigatedSigned / 100);

  return {
    scenario_id: "market_change",
    before_value: total,
    after_no_action_value: after,
    after_with_action_value: direction === "drop" ? afterAct : after,
    loss_no_action_pct: signed,
    loss_with_action_pct: direction === "drop" ? mitigatedSigned : signed,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation:
      direction === "drop" ? { stock: 18, fund: 82 } : { stock: 30, fund: 70 },
    actions:
      direction === "drop"
        ? [
            `Move ~${fmt(total * 0.1)} from AAPL and TSLA into VOO/VTI before any drop`,
            "Hold cash equal to 3 months of expenses — about $12,000",
            "Keep VTI as your long-term core holding",
          ]
        : [
            "You'd be up — that's great. Don't add more risk just because you feel lucky.",
            `Lock in ~${fmt(total * 0.05)} of gains by trimming AAPL/TSLA into VOO`,
            "Stay close to your target mix; rebalance if you've drifted more than 10%",
          ],
    transparency: {
      goal_alignment:
        direction === "drop"
          ? `Your house goal is in 2 years. A ${pct}% market drop right before you buy would force you to sell at the bottom — broad-market funds spread the risk so a single bad month doesn't sink the goal.`
          : `Your house goal is in 2 years. A ${pct}% rise feels great, but markets cut both ways — locking in a slice of gains protects your down-payment if it reverses next quarter.`,
      cost_to_execute: "$0 in trading fees. Estimated bid-ask spread on a partial rebalance: ~$8.",
      tax_implications:
        direction === "drop"
          ? "Selling now would trigger ~$340+ in short-term capital gains tax. Selling from your TSLA position first is more tax-efficient."
          : "If you take some gains now, that's short-term capital gains tax (you've held under a year). Wait until shares are 1-year-old to roughly halve the rate.",
      do_nothing:
        direction === "drop"
          ? `In this scenario, you'd lose about ${fmt(total - after)} (−${pct}%).`
          : `You'd be up about ${fmt(after - total)} (+${pct}%) on paper — until you sell, it's just on paper.`,
      do_act:
        direction === "drop"
          ? `Estimated loss reduces to about ${fmt(total - afterAct)} (${mitigatedSigned.toFixed(1)}%). You stay on track for your 2028 house goal.`
          : "Locking in a slice of gains protects part of the run-up if the market reverses.",
      confidence: pct <= 30 ? "high" : pct <= 60 ? "medium" : "low",
      sources: [
        "S&P 500 historical drawdowns",
        "Vanguard ETF prospectus",
        "SEC Investor Bulletin: Asset Allocation",
      ],
    },
  };
}

// =====================
// INFLATION (annual %, years)
// =====================
export function synthInflation(pct: number, years: number): ScenarioResult {
  const total = TOTAL;
  const erosionRate = 1 - Math.pow(1 / (1 + pct / 100), years);
  const after = total * (1 - erosionRate);
  const afterAct = total * (1 - erosionRate * 0.6);

  return {
    scenario_id: "inflation",
    before_value: total,
    after_no_action_value: after,
    after_with_action_value: afterAct,
    loss_no_action_pct: -erosionRate * 100,
    loss_with_action_pct: -erosionRate * 60,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation: { stock: 40, fund: 60 },
    actions: [
      "Tilt slightly more toward stock funds (VOO, VTI) — they tend to outpace inflation over multi-year periods",
      `At ${pct}% inflation, $10,000 sitting in cash loses about ${fmt(10000 * erosionRate)} of buying power over ${years} years — keep cash to a minimum`,
      "SCHD's dividend payouts can help offset inflation in the income they pay out",
    ],
    transparency: {
      goal_alignment: `If inflation runs at ${pct}% per year for ${years} ${years === 1 ? "year" : "years"}, your ${fmt(total)} would buy what only ${fmt(after)} buys today. With a 2-year house goal, your portfolio needs to at least keep pace.`,
      cost_to_execute: "$0 in trading fees on commission-free ETFs.",
      tax_implications: "Most rebalances inside tax-advantaged accounts have no tax impact. Inside a brokerage account, rebalancing can trigger short-term gains.",
      do_nothing: `Your purchasing power drops by about ${(erosionRate * 100).toFixed(1)}% over ${years} ${years === 1 ? "year" : "years"}.`,
      do_act: `Tilting toward stocks softens it — purchasing-power loss falls to roughly ${(erosionRate * 60).toFixed(1)}%.`,
      confidence: pct <= 8 && years <= 10 ? "high" : pct <= 20 ? "medium" : "low",
      sources: [
        "Federal Reserve inflation data (CPI)",
        "Long-term equity returns vs inflation",
        "Vanguard inflation hedging research",
      ],
    },
  };
}

// =====================
// WITHDRAWAL (% of portfolio, in N years)
// =====================
export function synthWithdrawal(pct: number, years: number): ScenarioResult {
  const total = TOTAL;
  // Assume modest 5%/yr growth between now and the withdrawal — so the % gets applied to a larger pot
  const futureValue = total * Math.pow(1.05, years);
  const withdraw = futureValue * (pct / 100);
  const after = futureValue - withdraw;
  const longTerm = years >= 1;
  const taxApprox = Math.round(withdraw * (longTerm ? 0.03 : 0.06));

  return {
    scenario_id: "withdrawal",
    before_value: total,
    after_no_action_value: after,
    after_with_action_value: after,
    loss_no_action_pct: -pct,
    loss_with_action_pct: -pct,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation: { stock: 36, fund: 64 },
    actions: [
      `In ${years} ${years === 1 ? "year" : "years"} your portfolio could be ~${fmt(futureValue)} — withdrawing ${pct}% means selling about ${fmt(withdraw)}`,
      "Sell from VOO/VTI first — most liquid, and gains taxed less when long-term",
      longTerm
        ? "Since you'd hold these shares 1+ year before selling, you'd qualify for the lower long-term capital gains rate"
        : "Selling within 1 year of buying means short-term capital gains rates — usually 10-15% higher than long-term",
    ],
    transparency: {
      goal_alignment: `Withdrawing ${pct}% in ${years} ${years === 1 ? "year" : "years"} means selling about ${fmt(withdraw)} from your future balance. ${
        years <= 2
          ? "On a 2-year house goal timeline, this is fine if it's for that purchase."
          : `Over ${years} years your portfolio has more time to grow before the withdrawal.`
      }`,
      cost_to_execute: "$0 in trading fees on commission-free ETFs.",
      tax_implications: `Selling triggers capital gains tax. Rough estimate: ~${fmt(taxApprox)} ${
        longTerm ? "at long-term rates" : "at short-term rates (you'd hold less than a year)"
      }. Exact number depends on cost basis.`,
      do_nothing: `If you skip this withdrawal, your portfolio stays invested at ~${fmt(futureValue)}.`,
      do_act: `After the withdrawal, you have ${fmt(after)} still invested.`,
      confidence: years <= 5 ? "high" : "medium",
      sources: [
        "IRS capital gains tax brackets",
        "FIFO vs specific-share-identification rules",
      ],
    },
  };
}

// =====================
// RATE CHANGE (hike / cut, %)
// =====================
export function synthRateChange(direction: Direction, pct: number): ScenarioResult {
  const total = TOTAL;
  // A 1% hike historically pulls broad equities ~3% short-term; cuts are roughly the inverse
  const directionMul = direction === "drop" ? -1 : 1; // hike (drop) hurts equities; cut (rise) helps
  const rawImpact = pct * 3 * directionMul;
  const after = total * (1 + rawImpact / 100);
  const afterAct = total * (1 + (rawImpact * 0.5) / 100);

  return {
    scenario_id: "rate_change",
    before_value: total,
    after_no_action_value: after,
    after_with_action_value: afterAct,
    loss_no_action_pct: rawImpact,
    loss_with_action_pct: rawImpact * 0.5,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation: { stock: 30, fund: 70 },
    actions:
      direction === "drop"
        ? [
            `If rates rise ${pct}%, expect your portfolio to dip about ${Math.abs(rawImpact).toFixed(1)}% in the first 3 months`,
            "Most funds (VTI, VOO, QQQ, SCHD) recover within 12–24 months historically",
            "Trim TSLA before any hike — it amplifies rate-driven swings",
          ]
        : [
            `Rate cuts of ${pct}% are usually bullish — expect roughly a ${Math.abs(rawImpact).toFixed(1)}% portfolio bump`,
            "Don't chase the rally — your existing fund holdings benefit naturally",
            "Watch for inflation as a side-effect — see the inflation scenario for that risk",
          ],
    transparency: {
      goal_alignment:
        direction === "drop"
          ? `A ${pct}% rate hike usually pulls equities down ~${Math.abs(rawImpact).toFixed(0)}% short-term. With a 2-year goal, that recovery window is tight — worth de-risking before hike rumors get serious.`
          : `A ${pct}% rate cut typically lifts equities. With a 2-year goal, this is usually a good time to trim risky single stocks while you're up.`,
      cost_to_execute: "$0 in trading fees.",
      tax_implications: "Trimming for rebalancing can trigger short-term capital gains. Wait until shares are 1-year-old to roughly halve the tax.",
      do_nothing:
        direction === "drop"
          ? `Paper loss of about ${fmt(Math.abs(after - total))} (${rawImpact.toFixed(1)}%), recovering over 12–24 months.`
          : `Portfolio gains roughly ${fmt(after - total)} (+${rawImpact.toFixed(1)}%) on the news.`,
      do_act:
        direction === "drop"
          ? `Trim TSLA and AAPL before — the impact halves to about ${fmt(Math.abs(afterAct - total))}.`
          : "Trim winners into VOO to lock in the bump without giving up future upside.",
      confidence: pct <= 5 ? "medium" : "low",
      sources: [
        "Historical Fed rate-hike cycles",
        "Equity sensitivity to interest rates",
      ],
    },
  };
}

// =====================
// INCOME CHANGE (decrease / no income / increase, %, months)
// =====================
export function synthIncomeChange(mode: IncomeMode, pct: number, months: number): ScenarioResult {
  const total = TOTAL;
  const monthlyIncome = MONTHLY_INCOME;
  const monthlyExpenses = MONTHLY_EXPENSES;

  let monthlyDelta = 0; // change in monthly take-home
  if (mode === "decrease") monthlyDelta = -monthlyIncome * (pct / 100);
  else if (mode === "increase") monthlyDelta = monthlyIncome * (pct / 100);
  else if (mode === "none") monthlyDelta = -monthlyIncome;

  const totalDelta = monthlyDelta * months; // negative = need to draw from savings; positive = extra to invest

  // For the decrease/none cases: deficit calculation
  // Available cash for expenses = (incomeAfter * months) + EMERGENCY_FUND - (expenses * months)
  const incomeAfter = monthlyIncome + monthlyDelta;
  const cashShortfall = Math.max(0, monthlyExpenses * months - incomeAfter * months - EMERGENCY_FUND);
  const cashSurplus = Math.max(0, totalDelta);

  let after = total;
  let afterAct = total;
  if (mode === "decrease" || mode === "none") {
    after = total - cashShortfall;
    afterAct = total - cashShortfall * 0.7; // mitigation cuts the dip by 30%
  } else if (mode === "increase") {
    // Surplus invested
    after = total + cashSurplus;
    afterAct = total + cashSurplus; // no mitigation needed
  }

  const lossPct = ((after - total) / total) * 100;
  const lossPctAct = ((afterAct - total) / total) * 100;

  // Actions text per mode
  let actions: string[];
  if (mode === "none") {
    actions = [
      `${months} ${months === 1 ? "month" : "months"} without income = about ${fmt(monthlyExpenses * months)} in expenses`,
      `Your emergency cash (~${fmt(EMERGENCY_FUND)}) covers ~${Math.round(EMERGENCY_FUND / monthlyExpenses)} months. After that, you'd draw from your portfolio.`,
      "Sell from VOO/VTI first; SCHD's dividend payouts help cover monthly expenses",
    ];
  } else if (mode === "decrease") {
    actions = [
      `A ${pct}% pay cut for ${months} ${months === 1 ? "month" : "months"} reduces your monthly income by ${fmt(Math.abs(monthlyDelta))}`,
      cashShortfall > 0
        ? `Total shortfall over the period: ~${fmt(cashShortfall)} that you'd need from savings or your portfolio`
        : "Your reduced income still covers expenses — emergency fund stays intact",
      "Cut discretionary spending first; pause new investing contributions until income recovers",
    ];
  } else {
    actions = [
      `A ${pct}% raise for ${months} ${months === 1 ? "month" : "months"} adds ~${fmt(monthlyDelta)} per month to your take-home`,
      `Total extra over the period: ~${fmt(cashSurplus)} — most of this should go straight to investing`,
      "Tilt new contributions into VOO/VTI to keep your mix balanced — don't pile it into AAPL or TSLA",
    ];
  }

  // Transparency text per mode
  let goalText: string;
  let doNothingText: string;
  let doActText: string;
  if (mode === "none") {
    goalText = `Losing income for ${months} ${months === 1 ? "month" : "months"} means spending about ${fmt(monthlyExpenses * months)} from savings. Your emergency fund covers ~${Math.round(EMERGENCY_FUND / monthlyExpenses)} months; after that, the portfolio dips.`;
    doNothingText = cashShortfall > 0 ? `Your portfolio drops to about ${fmt(after)} after covering expenses.` : "Your emergency fund covers it — your portfolio stays untouched.";
    doActText = cashShortfall > 0 ? "Cutting discretionary spending and refinancing any debt can shrink the portfolio dip by ~30%." : "You're in good shape — keep the emergency fund topped up.";
  } else if (mode === "decrease") {
    goalText = `A ${pct}% pay cut for ${months} ${months === 1 ? "month" : "months"} ${cashShortfall > 0 ? `creates a shortfall of about ${fmt(cashShortfall)}` : "is manageable on your current budget"}. House goal is still on track.`;
    doNothingText = cashShortfall > 0 ? `You'd draw about ${fmt(cashShortfall)} from savings/portfolio over the period.` : "Reduced income still covers expenses — no portfolio impact.";
    doActText = "Trimming discretionary expenses and pausing new contributions softens the impact by ~30%.";
  } else {
    goalText = `A ${pct}% raise for ${months} ${months === 1 ? "month" : "months"} gives you ~${fmt(cashSurplus)} extra. Best use: accelerate progress toward your house goal.`;
    doNothingText = `If you don't redirect the extra income, it sits in cash and loses to inflation.`;
    doActText = `Investing the ${fmt(cashSurplus)} surplus could grow your portfolio to ~${fmt(after)} over the same period.`;
  }

  return {
    scenario_id: "income_change",
    before_value: total,
    after_no_action_value: after,
    after_with_action_value: afterAct,
    loss_no_action_pct: lossPct,
    loss_with_action_pct: lossPctAct,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation: { stock: 36, fund: 64 },
    actions,
    transparency: {
      goal_alignment: goalText,
      cost_to_execute: "$0 in trading fees on commission-free ETFs.",
      tax_implications: mode === "increase"
        ? "Higher income may push you into a higher tax bracket — consider increasing 401(k) or IRA contributions to soften the hit."
        : cashShortfall > 0
        ? `Drawing from taxable accounts triggers capital gains. Rough estimate: ~${fmt(Math.round(cashShortfall * 0.07))} in tax over the period.`
        : "No portfolio activity needed — no taxable events.",
      do_nothing: doNothingText,
      do_act: doActText,
      confidence: "high",
      sources: [
        "FDIC emergency fund guidance (3–6 months)",
        "BLS consumer spending averages",
        "IRS contribution limits (401(k), IRA)",
      ],
    },
  };
}

// ===========================================================
// CONFIG: Maps scenario id → param shape + synthesizer + titles
// ===========================================================
export type ScenarioConfig = {
  showDirection: boolean;
  defaultDirection: Direction;
  defaultValue: number;
  defaultSecondary?: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  showSign: boolean;
  label: string;
  subjectLabel: string;
  dropLabel?: string;
  riseLabel?: string;
  secondaryConfig?: {
    min: number;
    max: number;
    step?: number;
    unit: string;
    label: string;
  };
  synth: (direction: Direction, value: number, secondary?: number) => ScenarioResult;
  formatTitle: (direction: Direction, value: number, secondary?: number) => string;
  formatSubtitle: (direction: Direction, value: number, secondary?: number) => string;
};

export const SCENARIO_CFG: Record<string, ScenarioConfig> = {
  market_change: {
    showDirection: true,
    defaultDirection: "drop",
    defaultValue: 20,
    min: 1,
    max: 100,
    unit: "%",
    showSign: true,
    label: "How big a move",
    subjectLabel: "Market",
    synth: (dir, v) => synthMarket(dir, v),
    formatTitle: (dir, v) => `Market ${dir === "drop" ? "drops" : "rises"} ${v}%`,
    formatSubtitle: (dir) => (dir === "drop" ? "A correction or recession" : "A bull-market run"),
  },
  inflation: {
    showDirection: false,
    defaultDirection: "drop",
    defaultValue: 6,
    defaultSecondary: 3,
    min: 1,
    max: 50,
    unit: "%",
    showSign: false,
    label: "Annual inflation",
    subjectLabel: "Inflation",
    secondaryConfig: { min: 1, max: 30, unit: " yrs", label: "For how many years" },
    synth: (_dir, v, sec) => synthInflation(v, sec ?? 3),
    formatTitle: (_dir, v, sec) => `${v}% inflation for ${sec ?? 3} ${(sec ?? 3) === 1 ? "year" : "years"}`,
    formatSubtitle: () => "Costs rising, money buys less",
  },
  withdrawal: {
    showDirection: false,
    defaultDirection: "drop",
    defaultValue: 20,
    defaultSecondary: 2,
    min: 1,
    max: 100,
    unit: "%",
    showSign: false,
    label: "Amount to withdraw",
    subjectLabel: "Withdrawal",
    secondaryConfig: { min: 1, max: 15, unit: " yrs", label: "When you'll need it" },
    synth: (_dir, v, sec) => synthWithdrawal(v, sec ?? 2),
    formatTitle: (_dir, v, sec) => `Withdraw ${v}% in ${sec ?? 2} ${(sec ?? 2) === 1 ? "year" : "years"}`,
    formatSubtitle: () => "A planned cash need",
  },
  rate_change: {
    showDirection: true,
    defaultDirection: "drop",
    defaultValue: 2,
    min: 1,
    max: 15,
    unit: "%",
    showSign: false,
    label: "Rate change",
    subjectLabel: "Fed action",
    dropLabel: "Hike",
    riseLabel: "Cut",
    synth: (dir, v) => synthRateChange(dir, v),
    formatTitle: (dir, v) => `Rates ${dir === "drop" ? "rise" : "fall"} ${v}%`,
    formatSubtitle: (dir) => (dir === "drop" ? "Fed tightens policy" : "Fed eases policy"),
  },
};
