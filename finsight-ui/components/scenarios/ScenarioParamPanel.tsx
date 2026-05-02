"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Sliders, type LucideIcon } from "lucide-react";

export type Direction = "drop" | "rise";

export type SecondaryConfig = {
  value: number;
  onValue: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  label: string;
};

export function ScenarioParamPanel({
  showDirection = true,
  direction,
  onDirection,
  value,
  onValue,
  min = 5,
  max = 50,
  step = 1,
  unit = "%",
  showSign = true,
  label = "Magnitude",
  subjectLabel = "Direction",
  dropLabel = "Drops",
  riseLabel = "Rises",
  dropIcon: DropIcon = TrendingDown,
  riseIcon: RiseIcon = TrendingUp,
  secondary,
}: {
  showDirection?: boolean;
  direction?: Direction;
  onDirection?: (d: Direction) => void;
  value: number;
  onValue: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showSign?: boolean;
  label?: string;
  subjectLabel?: string;
  dropLabel?: string;
  riseLabel?: string;
  dropIcon?: LucideIcon;
  riseIcon?: LucideIcon;
  secondary?: SecondaryConfig;
}) {
  const sign = !showSign ? "" : direction === "rise" ? "+" : direction === "drop" ? "−" : "";

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

      <div
        className={`mt-4 grid grid-cols-1 ${
          showDirection ? "sm:grid-cols-[auto_1fr]" : "grid-cols-1"
        } gap-4 sm:gap-6 items-end`}
      >
        {showDirection && direction && onDirection && (
          <div>
            <div className="text-xs text-ink-secondary mb-1.5">{subjectLabel}</div>
            <div className="relative bg-cream-soft rounded-full p-1 flex items-center text-sm select-none w-fit">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute top-1 bottom-1 bg-white rounded-full shadow-card"
                style={{
                  left: direction === "drop" ? 4 : "50%",
                  right: direction === "drop" ? "50%" : 4,
                }}
              />
              <button
                onClick={() => onDirection("drop")}
                className={`relative z-10 px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors ${
                  direction === "drop" ? "text-warm-coral" : "text-ink-tertiary"
                }`}
              >
                <DropIcon className="w-3.5 h-3.5" />
                {dropLabel}
              </button>
              <button
                onClick={() => onDirection("rise")}
                className={`relative z-10 px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-colors ${
                  direction === "rise" ? "text-forest-primary" : "text-ink-tertiary"
                }`}
              >
                <RiseIcon className="w-3.5 h-3.5" />
                {riseLabel}
              </button>
            </div>
          </div>
        )}

        {/* Primary slider */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-ink-secondary">{label}</span>
            <span className="font-serif text-2xl text-ink-primary tabular-nums leading-none">
              {sign}
              {value}
              {unit}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onValue(Number(e.target.value))}
            className="range-warm"
          />
          <div className="flex justify-between mt-1 text-[10px] text-ink-tertiary">
            <span>
              {min}
              {unit}
            </span>
            <span>
              {max}
              {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary slider — full width below */}
      {secondary && (
        <div className="mt-5 pt-5 border-t border-line-soft">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-ink-secondary">{secondary.label}</span>
            <span className="font-serif text-2xl text-ink-primary tabular-nums leading-none">
              {secondary.value}
              {secondary.unit}
            </span>
          </div>
          <input
            type="range"
            min={secondary.min}
            max={secondary.max}
            step={secondary.step ?? 1}
            value={secondary.value}
            onChange={(e) => secondary.onValue(Number(e.target.value))}
            className="range-warm"
          />
          <div className="flex justify-between mt-1 text-[10px] text-ink-tertiary">
            <span>
              {secondary.min}
              {secondary.unit}
            </span>
            <span>
              {secondary.max}
              {secondary.unit}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
