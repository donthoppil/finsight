"use client";

import { motion } from "framer-motion";

export function StepTimeline({
  value,
  onChange,
}: {
  value: number;
  onChange: (years: number) => void;
}) {
  const targetYear = new Date().getFullYear() + value;

  return (
    <div>
      <h2 className="font-serif text-4xl text-ink-primary">When do you need this money?</h2>
      <p className="mt-3 text-ink-secondary">
        Drag the slider to your target — closer dates mean less risk.
      </p>

      <div className="mt-12 text-center">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="font-serif text-7xl text-forest-primary tabular-nums"
        >
          {value} {value === 1 ? "year" : "years"}
        </motion.div>
        <div className="mt-2 text-ink-tertiary">About {targetYear}</div>
      </div>

      <div className="mt-12 px-2">
        <input
          type="range"
          min={1}
          max={30}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-warm"
        />
        <div className="flex justify-between mt-3 text-xs text-ink-tertiary">
          <span>1 yr</span>
          <span>15 yrs</span>
          <span>30 yrs</span>
        </div>
      </div>
    </div>
  );
}
