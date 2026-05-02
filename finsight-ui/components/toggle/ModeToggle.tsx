"use client";

import { motion } from "framer-motion";
import { useMode } from "./ModeContext";

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className="relative bg-cream-soft rounded-full p-1 flex items-center text-sm select-none">
      {/* Slider pill */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="absolute top-1 bottom-1 bg-white rounded-full shadow-card"
        style={{
          left: mode === "simple" ? 4 : "50%",
          right: mode === "simple" ? "50%" : 4,
        }}
      />
      <button
        onClick={() => setMode("simple")}
        className={`relative z-10 px-4 py-1.5 rounded-full font-medium transition-colors ${
          mode === "simple" ? "text-forest-primary" : "text-ink-tertiary"
        }`}
      >
        Simple
      </button>
      <button
        onClick={() => setMode("detailed")}
        className={`relative z-10 px-4 py-1.5 rounded-full font-medium transition-colors ${
          mode === "detailed" ? "text-forest-primary" : "text-ink-tertiary"
        }`}
      >
        Detailed
      </button>
    </div>
  );
}
