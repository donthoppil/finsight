"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import type { ScenarioResult } from "@/lib/demo-data";

const FIELD_ORDER: { key: keyof ScenarioResult["transparency"]; label: string }[] = [
  { key: "goal_alignment", label: "Why this fits your goal" },
  { key: "cost_to_execute", label: "What it costs to do" },
  { key: "tax_implications", label: "Tax implications" },
  { key: "do_nothing", label: "If you do nothing" },
  { key: "do_act", label: "If you act" },
];

export function TransparencyCard({ result }: { result: ScenarioResult }) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="bg-white rounded-2xl shadow-card border border-line-soft overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-cream/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest-pale text-forest-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="font-serif text-lg text-ink-primary">Why this recommendation?</div>
            <div className="text-xs text-ink-tertiary">Full reasoning, costs, and sources</div>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-ink-secondary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-5 border-t border-line-soft pt-5">
              {FIELD_ORDER.map((f) => (
                <div key={f.key}>
                  <div className="text-xs font-medium text-forest-primary uppercase tracking-wide">
                    {f.label}
                  </div>
                  <div className="text-sm text-ink-secondary mt-1.5 leading-relaxed">
                    {result.transparency[f.key]}
                  </div>
                </div>
              ))}

              <div>
                <div className="text-xs font-medium text-forest-primary uppercase tracking-wide">
                  Confidence
                </div>
                <div className="mt-1.5">
                  <span className="bg-forest-mint text-forest-primary text-xs font-medium px-2.5 py-1 rounded-full capitalize">
                    Confidence: {result.transparency.confidence}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-forest-primary uppercase tracking-wide">
                  Sources
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.transparency.sources.map((s) => (
                    <span
                      key={s}
                      className="bg-cream-soft text-ink-secondary text-xs px-2.5 py-1 rounded-full border border-line-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
