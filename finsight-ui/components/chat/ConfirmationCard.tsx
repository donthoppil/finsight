"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export type ConfirmationItem = {
  symbol: string;
  shares: number;
  price?: number | null;
  live_price?: number | null;
  name?: string;
  action?: "buy" | "sell";
  asset_class?: string;
  total?: number;
};

export function ConfirmationCard({
  intent_type,
  items,
  onConfirm,
  onCancel,
}: {
  intent_type: "add_holding" | "update_holding";
  items: ConfirmationItem[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [state, setState] = useState<"idle" | "confirming" | "done" | "cancelled" | "error">("idle");

  const handleConfirm = async () => {
    setState("confirming");
    try {
      await onConfirm();
      setState("done");
    } catch {
      setState("error");
    }
  };

  const totalValue = items.reduce((sum, item) => {
    const px = item.price ?? item.live_price ?? 0;
    return sum + (item.total ?? item.shares * px);
  }, 0);

  const headerText = intent_type === "add_holding"
    ? "I'll add these to your portfolio:"
    : "I'll record this trade:";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-warm-amber/10 border border-warm-amber/40 rounded-2xl p-4 my-2 max-w-lg"
    >
      <p className="font-medium text-sm mb-3 text-ink-primary">{headerText}</p>

      <ul className="space-y-2 mb-3">
        {items.map((item, i) => {
          const px = item.price ?? item.live_price ?? 0;
          const verb =
            item.action === "sell" ? "Sell" : item.action === "buy" ? "Buy" : "Add";
          return (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-ink-primary font-medium">
                  {verb} {item.shares} {item.shares === 1 ? "share" : "shares"} of {item.symbol}
                </span>
                {item.name && item.name !== item.symbol && (
                  <span className="text-ink-tertiary text-xs ml-1.5 truncate">
                    ({item.name})
                  </span>
                )}
              </div>
              <span className="text-ink-secondary tabular-nums shrink-0 text-xs">
                ${px.toFixed(2)} × {item.shares} = ${(item.shares * px).toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>

      {items.length > 1 && (
        <p className="text-sm text-ink-primary font-medium border-t border-warm-amber/30 pt-2 mb-3 flex justify-between">
          <span>Total</span>
          <span className="tabular-nums">${totalValue.toFixed(2)}</span>
        </p>
      )}

      {state === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="bg-forest-primary hover:bg-forest-deep text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Confirm
          </button>
          <button
            onClick={() => {
              setState("cancelled");
              onCancel();
            }}
            className="bg-cream-soft hover:bg-line-soft text-ink-primary text-sm px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}

      {state === "confirming" && (
        <p className="text-sm text-ink-secondary flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-3 h-3 border-2 border-forest-primary border-t-transparent rounded-full"
          />
          Updating…
        </p>
      )}

      {state === "done" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-forest-primary font-medium flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Done — your portfolio is updated.
        </motion.p>
      )}

      {state === "cancelled" && (
        <p className="text-sm text-ink-tertiary">No problem — nothing changed.</p>
      )}

      {state === "error" && (
        <p className="text-sm text-warm-coral">Something went wrong. Try again?</p>
      )}
    </motion.div>
  );
}
