"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { useMode } from "@/components/toggle/ModeContext";
import { formatNumber, translate } from "@/lib/translator";
import type { Holding } from "@/lib/demo-data";

export function HoldingRow({ holding, index }: { holding: Holding; index: number }) {
  const { mode } = useMode();
  const [open, setOpen] = useState(false);
  const value = holding.shares * holding.price;
  const positive = holding.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="border-b border-line-soft/60 last:border-b-0 min-w-0"
    >
      <motion.div
        whileHover={{ x: 2 }}
        className="flex items-center gap-3 py-3 cursor-default group min-w-0"
      >
        <div className="w-9 h-9 rounded-lg bg-cream-soft text-ink-primary text-xs font-semibold flex items-center justify-center shrink-0">
          {holding.symbol.slice(0, 4)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="text-sm font-medium text-ink-primary truncate">{holding.symbol}</div>
            <span className="text-[10px] uppercase tracking-wide text-ink-tertiary bg-cream-soft rounded-full px-1.5 py-0.5 shrink-0">
              {translate(holding.asset_class, mode)}
            </span>
          </div>
          <div className="text-xs text-ink-tertiary truncate">{holding.name}</div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={`What is ${holding.symbol}?`}
          aria-expanded={open}
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            open
              ? "bg-forest-primary text-white"
              : "bg-cream-soft text-ink-tertiary hover:bg-forest-pale hover:text-forest-primary"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-ink-primary tabular-nums">
            {formatNumber(value, "currency", mode)}
          </div>
          <div
            className={`text-xs inline-flex items-center px-1.5 py-0.5 rounded-full mt-0.5 tabular-nums ${
              positive
                ? "bg-forest-pale text-forest-primary"
                : "bg-warm-rose/10 text-warm-rose"
            }`}
          >
            {positive ? "+" : ""}
            {holding.change.toFixed(1)}%
          </div>
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="info"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mb-3 ml-12 mr-1 p-3 rounded-xl bg-forest-pale border border-forest-soft/20">
              <div className="text-xs font-medium text-forest-primary uppercase tracking-wide">
                What is {holding.symbol}?
              </div>
              <p className="mt-2 text-sm text-ink-secondary leading-relaxed">
                {holding.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
