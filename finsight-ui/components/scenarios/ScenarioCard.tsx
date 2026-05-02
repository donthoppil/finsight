"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Flame, Wallet, Briefcase, Smartphone, BarChart3, Percent, type LucideIcon } from "lucide-react";
import type { Scenario } from "@/lib/demo-data";

const ICON_MAP: Record<string, LucideIcon> = {
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "bar-chart": BarChart3,
  flame: Flame,
  wallet: Wallet,
  briefcase: Briefcase,
  smartphone: Smartphone,
  percent: Percent,
};

export function ScenarioCard({
  scenario,
  onClick,
  index,
}: {
  scenario: Scenario;
  onClick: () => void;
  index: number;
}) {
  const Icon = ICON_MAP[scenario.icon] ?? TrendingDown;

  return (
    <motion.button
      layoutId={`scenario-${scenario.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left bg-white hover:bg-forest-pale border border-line-soft hover:border-forest-soft/40 rounded-2xl p-6 shadow-card transition-colors"
    >
      <div className="w-11 h-11 rounded-xl bg-forest-pale text-forest-primary flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-serif text-base text-ink-primary leading-snug">{scenario.title}</div>
      <div className="text-sm text-ink-tertiary mt-1">{scenario.subtitle}</div>
    </motion.button>
  );
}
