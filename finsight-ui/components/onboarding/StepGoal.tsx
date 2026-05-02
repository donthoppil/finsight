"use client";

import { motion } from "framer-motion";
import { Home, Palmtree, GraduationCap, Sparkles, HelpCircle } from "lucide-react";

const GOALS = [
  { id: "house", label: "A house", icon: Home },
  { id: "retirement", label: "Retirement", icon: Palmtree },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "wealth", label: "Just growing my wealth", icon: Sparkles },
  { id: "other", label: "Something else", icon: HelpCircle },
];

export function StepGoal({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string, label: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-4xl text-ink-primary">What are you saving for?</h2>
      <p className="mt-3 text-ink-secondary">Pick the one that matters most right now.</p>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        {GOALS.map((g) => {
          const Icon = g.icon;
          const selected = value === g.id;
          return (
            <motion.button
              key={g.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(g.id, g.label)}
              className={`relative text-left p-5 rounded-2xl border transition-colors ${
                selected
                  ? "bg-forest-mint border-forest-soft"
                  : "bg-white border-line-soft hover:bg-forest-pale hover:border-forest-soft/40"
              }`}
            >
              <Icon className="w-6 h-6 text-forest-primary mb-3" />
              <div className="font-medium text-ink-primary">{g.label}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
