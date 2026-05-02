"use client";

import { motion } from "framer-motion";

export function SuggestedReplies({
  replies,
  onPick,
}: {
  replies: string[];
  onPick: (text: string) => void;
}) {
  if (!replies || replies.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap gap-2 mt-2 ml-1"
    >
      {replies.map((r) => (
        <button
          key={r}
          onClick={() => onPick(r)}
          className="text-sm bg-white border border-line-soft hover:border-forest-soft hover:bg-forest-pale text-ink-primary px-3.5 py-1.5 rounded-full transition-all hover:translate-y-[-1px]"
        >
          {r}
        </button>
      ))}
    </motion.div>
  );
}
