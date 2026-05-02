"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function ConcentrationAlert({
  symbol,
  pct,
  value,
  isFund,
}: {
  symbol: string;
  pct: number;
  value: number;
  isFund?: boolean;
}) {
  const askCoach = () => {
    window.dispatchEvent(
      new CustomEvent("chat-prefill", {
        detail: {
          text: `${symbol} is ${pct}% of my portfolio. How should I think about that?`,
        },
      })
    );
  };

  // A sector ETF still concentrates risk at the sector level — but it's not
  // "one company" risk. Phrase the warning accordingly.
  const positionLabel = isFund ? "one fund" : "one company";
  const riskBlurb = isFund
    ? `It's a fund holding many companies in one sector, so a sector-wide drop hits hard.`
    : `If ${symbol} has a bad day, your whole portfolio feels it.`;

  const suggestFix = () => {
    window.dispatchEvent(
      new CustomEvent("chat-prefill", {
        detail: { text: "I want to rebalance my portfolio. Suggest a plan." },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-warm-amber/10 border border-warm-amber/40 rounded-2xl p-4 flex gap-3"
    >
      <div className="w-9 h-9 rounded-xl bg-warm-amber/25 text-warm-amber flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-base text-ink-primary leading-tight">
          Heads up — {symbol} is {pct}% of your portfolio
        </p>
        <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
          That&apos;s a lot in {positionLabel} (
          <span className="tabular-nums">${Math.round(value).toLocaleString()}</span>). {riskBlurb}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={suggestFix}
            className="text-sm font-medium text-forest-primary hover:underline"
          >
            Suggest a fix →
          </button>
          <button
            onClick={askCoach}
            className="text-sm font-medium text-warm-amber hover:underline"
          >
            Talk to coach
          </button>
        </div>
      </div>
    </motion.div>
  );
}
