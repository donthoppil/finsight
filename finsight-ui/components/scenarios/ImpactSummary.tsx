"use client";

import { motion } from "framer-motion";
import { useMode } from "@/components/toggle/ModeContext";
import { formatNumber } from "@/lib/translator";
import type { ScenarioResult } from "@/lib/demo-data";

export function ImpactSummary({ result }: { result: ScenarioResult }) {
  const { mode } = useMode();
  const delta = result.after_no_action_value - result.before_value; // negative = loss
  const isGain = delta >= 0;
  const magnitude = Math.abs(delta);

  const headline = isGain
    ? "If this happens, here's where you'd land 🎉"
    : "If this happens, here's where you'd land";

  const deltaLabel = isGain ? "Gain" : "Loss";
  const deltaColor = isGain ? "text-forest-primary" : "text-warm-coral";
  const deltaSign = isGain ? "+" : "−";
  const barColor = isGain ? "bg-forest-primary" : "bg-warm-coral";

  // Bar width proxy — for gains we cap at 130% so it visually overshoots the "today" bar
  const afterRatio = isGain
    ? Math.min(1.3, result.after_no_action_value / result.before_value)
    : result.after_no_action_value / result.before_value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-card border border-line-soft"
    >
      <div className="font-serif text-lg text-ink-primary">{headline}</div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-ink-tertiary uppercase tracking-wide">Your portfolio today</div>
          <motion.div
            key={`today-${result.before_value}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-serif text-3xl mt-1 tabular-nums text-ink-primary"
          >
            {formatNumber(result.before_value, "currency", mode)}
          </motion.div>
        </div>
        <div>
          <div className="text-xs text-ink-tertiary uppercase tracking-wide">After this scenario</div>
          <motion.div
            key={`after-${result.after_no_action_value}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`font-serif text-3xl mt-1 tabular-nums ${isGain ? "text-forest-primary" : "text-ink-primary"}`}
          >
            {formatNumber(result.after_no_action_value, "currency", mode)}
          </motion.div>
        </div>
        <div>
          <div className="text-xs text-ink-tertiary uppercase tracking-wide">{deltaLabel}</div>
          <motion.div
            key={`delta-${delta}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`font-serif text-3xl mt-1 tabular-nums ${deltaColor}`}
          >
            {deltaSign}
            {formatNumber(magnitude, "currency", mode)}
          </motion.div>
          <div className={`text-xs mt-0.5 tabular-nums ${deltaColor}`}>
            {deltaSign}
            {formatNumber(Math.abs(result.loss_no_action_pct), "percent", mode)}
          </div>
        </div>
      </div>

      {/* Mini bar comparison */}
      <div className="mt-6 space-y-2">
        <div>
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
            <span>Today</span>
            <span className="tabular-nums">{formatNumber(result.before_value, "currency", mode)}</span>
          </div>
          <div className="h-3 rounded-full bg-cream-soft overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="h-full rounded-full bg-forest-primary"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
            <span>After scenario</span>
            <span className="tabular-nums">{formatNumber(result.after_no_action_value, "currency", mode)}</span>
          </div>
          <div className="h-3 rounded-full bg-cream-soft overflow-hidden">
            <motion.div
              key={`bar-${delta}`}
              initial={{ width: 0 }}
              animate={{ width: `${afterRatio * 100}%` }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
