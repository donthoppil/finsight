"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export function MismatchAlert({
  userSays,
  portfolioIs,
  severity,
}: {
  userSays: string;
  portfolioIs: string;
  severity: "medium" | "high";
}) {
  const isHigh = severity === "high";
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("chat-prefill", {
        detail: {
          text: "My risk feel and portfolio don't match. Help me figure out what to do.",
        },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl p-4 flex gap-3 border ${
        isHigh
          ? "bg-warm-rose/10 border-warm-rose/40"
          : "bg-warm-amber/10 border-warm-amber/40"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isHigh ? "bg-warm-rose/25 text-warm-rose" : "bg-warm-amber/25 text-warm-amber"
        }`}
      >
        <AlertCircle className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-base text-ink-primary leading-tight">
          Your comfort and your portfolio don&apos;t match
        </p>
        <p className="text-sm text-ink-secondary mt-1 leading-relaxed">
          You said you&apos;d be {userSays}, but your portfolio is currently{" "}
          <span className="font-medium capitalize text-ink-primary">{portfolioIs}</span>. That&apos;s
          a mismatch worth fixing.
        </p>
        <button
          onClick={handleClick}
          className={`text-sm font-medium hover:underline mt-2 ${
            isHigh ? "text-warm-rose" : "text-warm-amber"
          }`}
        >
          Fix the mismatch →
        </button>
      </div>
    </motion.div>
  );
}
