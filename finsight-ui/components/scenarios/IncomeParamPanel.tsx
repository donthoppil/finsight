"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Ban, Sliders } from "lucide-react";

export type IncomeMode = "decrease" | "none" | "increase";

const MODES: { id: IncomeMode; label: string; icon: typeof TrendingDown; activeText: string }[] = [
  { id: "decrease", label: "Decrease", icon: TrendingDown, activeText: "text-warm-coral" },
  { id: "none", label: "No income", icon: Ban, activeText: "text-warm-rose" },
  { id: "increase", label: "Increase", icon: TrendingUp, activeText: "text-forest-primary" },
];

export function IncomeParamPanel({
  mode,
  onMode,
  pct,
  onPct,
  months,
  onMonths,
}: {
  mode: IncomeMode;
  onMode: (m: IncomeMode) => void;
  pct: number;
  onPct: (n: number) => void;
  months: number;
  onMonths: (n: number) => void;
}) {
  const idx = MODES.findIndex((m) => m.id === mode);
  // Pill position: each segment is 1/3 of the bar
  const leftPct = (idx * 100) / 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-line-soft shadow-card p-5"
    >
      <div className="flex items-center gap-2 text-xs text-ink-tertiary uppercase tracking-wide">
        <Sliders className="w-3.5 h-3.5" />
        Adjust the scenario
      </div>

      {/* 3-state mode toggle */}
      <div className="mt-4">
        <div className="text-xs text-ink-secondary mb-1.5">What changes about your income?</div>
        <div className="relative bg-cream-soft rounded-full p-1 grid grid-cols-3 text-sm select-none w-full max-w-md">
          <motion.div
            animate={{ left: `calc(${leftPct}% + 4px)` }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-card"
            style={{ width: "calc(33.33% - 8px)" }}
          />
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onMode(m.id)}
                className={`relative z-10 py-1.5 px-2 rounded-full font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  active ? m.activeText : "text-ink-tertiary"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Magnitude slider — only shown if not "no income" */}
      {mode !== "none" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-5 pt-5 border-t border-line-soft"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-ink-secondary">
              {mode === "decrease" ? "How much pay cut" : "How much raise"}
            </span>
            <span className="font-serif text-2xl text-ink-primary tabular-nums leading-none">
              {mode === "decrease" ? "−" : "+"}
              {pct}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={pct}
            onChange={(e) => onPct(Number(e.target.value))}
            className="range-warm"
          />
          <div className="flex justify-between mt-1 text-[10px] text-ink-tertiary">
            <span>1%</span>
            <span>100%</span>
          </div>
        </motion.div>
      )}

      {/* Duration slider */}
      <div className={`${mode !== "none" ? "mt-5" : "mt-5 pt-5 border-t border-line-soft"}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-ink-secondary">For how long</span>
          <span className="font-serif text-2xl text-ink-primary tabular-nums leading-none">
            {months} {months === 1 ? "month" : "months"}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={36}
          value={months}
          onChange={(e) => onMonths(Number(e.target.value))}
          className="range-warm"
        />
        <div className="flex justify-between mt-1 text-[10px] text-ink-tertiary">
          <span>1 mo</span>
          <span>36 mo</span>
        </div>
      </div>
    </motion.div>
  );
}
