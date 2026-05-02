"use client";

import { motion } from "framer-motion";
import { Smile, Meh, Frown, AlertTriangle } from "lucide-react";

const FEELINGS = [
  { id: "calm", label: "I'd be fine, that's normal", sub: "I know markets bounce around", icon: Smile },
  { id: "nervous", label: "I'd be nervous but hold on", sub: "I'd watch closely but stay in", icon: Meh },
  { id: "panic", label: "I'd panic", sub: "It would really stress me out", icon: Frown },
  { id: "sell", label: "I'd sell everything", sub: "I'd want to stop the bleeding", icon: AlertTriangle },
];

export function StepRiskFeel({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-4xl text-ink-primary">
        Imagine your investments dropped 20% tomorrow. How would you feel?
      </h2>
      <p className="mt-3 text-ink-secondary">
        There's no wrong answer — this just helps me tune things to you.
      </p>

      <div className="mt-8 space-y-3">
        {FEELINGS.map((f) => {
          const Icon = f.icon;
          const selected = value === f.id;
          return (
            <motion.button
              key={f.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onChange(f.id)}
              className={`w-full text-left p-5 rounded-2xl border transition-colors flex items-center gap-4 ${
                selected
                  ? "bg-forest-mint border-forest-soft"
                  : "bg-white border-line-soft hover:bg-forest-pale hover:border-forest-soft/40"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  selected ? "bg-forest-soft text-white" : "bg-cream-soft text-forest-primary"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-primary">{f.label}</div>
                <div className="text-sm text-ink-secondary mt-0.5">{f.sub}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
