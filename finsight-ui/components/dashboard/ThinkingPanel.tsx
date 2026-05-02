"use client";

import { motion } from "framer-motion";
import { LineChart } from "lucide-react";
import { usePortfolio } from "@/lib/store";
import { MarketsSection } from "./MarketsSection";

// Renamed-in-spirit to "Markets" — the prop signature stays so existing
// dashboard wiring (and any "active" indicator in the future) keeps working.
export function ThinkingPanel({ active }: { active: boolean }) {
  const snapshot = usePortfolio((s) => s.snapshot);
  const userSymbols = (snapshot?.holdings ?? []).map((h) => h.symbol);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-line-soft p-6 h-full flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-forest-pale text-forest-primary flex items-center justify-center shrink-0">
          <LineChart className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-xl text-ink-primary leading-tight">Markets</div>
          <div className="text-xs text-ink-tertiary truncate">Live prices, refreshed every minute</div>
        </div>
        {active && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto text-[10px] text-ink-tertiary uppercase tracking-wide flex items-center gap-1 shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-forest-soft animate-pulse" />
            live
          </motion.span>
        )}
      </div>

      {/* Markets — fills the panel, scrolls if needed */}
      <div className="mt-5 flex-1 overflow-y-auto overflow-x-hidden min-h-0 -mx-1 px-1">
        <MarketsSection userSymbols={userSymbols} />
      </div>
    </div>
  );
}
