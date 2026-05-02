"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMode } from "@/components/toggle/ModeContext";
import type { FundOption } from "@/lib/recommendations";
import { useProfile } from "@/lib/store";

// Shares to suggest per pick: split one month of contribution across all picks.
// Round to whole shares, clamp to >= 1 so the prefill is always a valid trade.
function suggestSharesPerPick(monthlyContribution: number, optionCount: number, price: number): number {
  if (!monthlyContribution || monthlyContribution <= 0 || optionCount <= 0 || price <= 0) return 0;
  const dollarsPerPick = monthlyContribution / optionCount;
  return Math.max(1, Math.round(dollarsPerPick / price));
}

export function RecommendationCards({
  options,
  intro_text,
  disclaimer,
}: {
  options: FundOption[];
  intro_text: string;
  disclaimer: string;
}) {
  const { mode } = useMode();
  const monthlyContribution = useProfile((s) => Number(s.profile?.monthly_contribution ?? 0));
  const topFitScore = options.length > 0 ? options[0].fit_score : 0;

  return (
    <div className="my-3">
      <p className="text-sm text-ink-primary mb-3">{intro_text}</p>

      {monthlyContribution > 0 && (
        <p className="text-xs text-ink-tertiary mb-3">
          Buy amounts below are sized from your ${monthlyContribution.toLocaleString()}/month
          contribution, split across these picks.
        </p>
      )}

      {/* Stack vertically inside the chat panel — chat width is too narrow for 3-up. */}
      <div className="space-y-2.5">
        {options.map((option, i) => (
          <FundCard
            key={option.ticker}
            option={option}
            rank={i + 1}
            isTopPick={option.fit_score === topFitScore && i === 0}
            mode={mode}
            suggestedShares={suggestSharesPerPick(monthlyContribution, options.length, option.current_price)}
          />
        ))}
      </div>

      <p className="text-[11px] text-ink-tertiary mt-3 italic leading-relaxed">{disclaimer}</p>
    </div>
  );
}

function FundCard({
  option,
  rank,
  isTopPick,
  mode,
  suggestedShares,
}: {
  option: FundOption;
  rank: number;
  isTopPick: boolean;
  mode: "simple" | "detailed";
  suggestedShares: number;
}) {
  // If we don't have a monthly_contribution to size against, leave the share count blank
  // so the user types it themselves rather than committing to a fake 10-share default.
  const handleAdd = () => {
    const text =
      suggestedShares > 0
        ? `I bought ${suggestedShares} ${suggestedShares === 1 ? "share" : "shares"} of ${option.ticker}`
        : `I bought  shares of ${option.ticker}`;
    window.dispatchEvent(new CustomEvent("chat-prefill", { detail: { text } }));
  };

  const buttonLabel =
    suggestedShares > 0
      ? `Buy ~${suggestedShares} ${suggestedShares === 1 ? "share" : "shares"} (~$${Math.round(suggestedShares * option.current_price).toLocaleString()})`
      : "Add to portfolio";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, duration: 0.3 }}
      className={`bg-white border rounded-xl p-3 flex flex-col ${
        isTopPick ? "border-forest-primary ring-1 ring-forest-primary/30" : "border-line-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-ink-primary tabular-nums">{option.ticker}</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                option.type === "etf"
                  ? "bg-cream-soft text-ink-secondary"
                  : "bg-warm-amber/15 text-warm-amber"
              }`}
            >
              {option.type === "etf" ? "ETF" : "MUTUAL FUND"}
            </span>
          </div>
          <p className="text-xs text-ink-tertiary leading-snug truncate">{option.name}</p>
        </div>
        {isTopPick && (
          <span className="shrink-0 text-[10px] font-medium bg-forest-mint text-forest-primary px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Top match
          </span>
        )}
      </div>

      <p className="text-xs text-ink-secondary mt-1.5 mb-2.5 leading-relaxed">{option.description}</p>

      <div className="space-y-1 text-xs mb-3">
        <BehaviorRow
          label="Swings"
          simpleValue={option.behavior.swings_label}
          detailedValue={`${option.behavior.swings_pct}% per year`}
          mode={mode}
        />
        <BehaviorRow
          label="Worst drop (3yr)"
          simpleValue={option.behavior.worst_drop_label}
          detailedValue={`${option.behavior.worst_drop_3y}%`}
          mode={mode}
        />
        <BehaviorRow
          label="Cost per $10K/yr"
          simpleValue={`$${option.behavior.annual_cost_per_10k}`}
          detailedValue={`$${option.behavior.annual_cost_per_10k} (${(option.expense_ratio * 100).toFixed(2)}% ER)`}
          mode={mode}
        />
      </div>

      {mode === "detailed" && (
        <div className="text-[10px] text-ink-tertiary mb-2.5 pb-2 border-t border-line-soft pt-2 tabular-nums">
          Fit <span className="font-medium text-ink-primary">{option.fit_score}/100</span>
          {" · "}Stability {option.stability_score}
          {" · "}Resilience {option.resilience_score}
          {" · "}Cost {option.cost_score}
          {" · "}Liquidity {option.liquidity_score}
        </div>
      )}

      <button
        onClick={handleAdd}
        className="w-full bg-forest-primary hover:bg-forest-deep text-white text-xs font-medium py-2 rounded-lg transition-all hover:translate-y-[-1px] mt-auto"
      >
        {buttonLabel}
      </button>
    </motion.div>
  );
}

function BehaviorRow({
  label,
  simpleValue,
  detailedValue,
  mode,
}: {
  label: string;
  simpleValue: string;
  detailedValue: string;
  mode: "simple" | "detailed";
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-tertiary">{label}</span>
      <span className="text-ink-primary font-medium tabular-nums shrink-0">
        {mode === "detailed" ? detailedValue : simpleValue}
      </span>
    </div>
  );
}
