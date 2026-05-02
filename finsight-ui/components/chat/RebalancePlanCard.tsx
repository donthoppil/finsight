"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, ArrowRight, Lock, ShieldCheck, X } from "lucide-react";
import type { RebalancePhase, RebalancePhaseItem, RebalancePlan } from "@/lib/rebalance";

type ItemStatus = "pending" | "completed" | "rejected";

export function RebalancePlanCard({
  plan_id,
  plan_summary,
  phases,
  expected_after,
  disclaimer,
  intro_text,
}: {
  plan_id: string;
  plan_summary: string;
  phases: RebalancePhase[];
  expected_after?: RebalancePlan["expected_after"];
  disclaimer: string;
  intro_text?: string;
}) {
  const [planSaved, setPlanSaved] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [saving, setSaving] = useState(false);

  const allItems = phases.flatMap((p) =>
    p.items.map((it) => ({ ...it, phase_number: p.phase_number }))
  );

  const handleApply = async () => {
    if (allItems.length === 0) {
      // Behavioral plan only — nothing to save
      toast("This phase is behavioral — just stop adding more", {
        description: "Let new money flow to other holdings instead.",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id,
          items: allItems.map((it) => ({
            phase_number: it.phase_number,
            ticker: it.ticker,
            amount_usd: it.amount_usd,
            estimated_shares: it.estimated_shares,
          })),
        }),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      setPlanSaved(true);
      toast.success("Plan saved", {
        description: "Mark each item as bought when you finish in your broker.",
      });
    } catch {
      toast.error("Couldn't save the plan. Try again?");
    } finally {
      setSaving(false);
    }
  };

  const handleItemAction = async (item: RebalancePhaseItem, action: ItemStatus) => {
    setStatuses((prev) => ({ ...prev, [item.ticker]: action }));

    // Persist status
    try {
      await fetch("/api/rebalance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id,
          ticker: item.ticker,
          status: action,
        }),
      });
    } catch (err) {
      console.warn("[rebalance] status patch failed", err);
    }

    if (action === "completed") {
      window.dispatchEvent(
        new CustomEvent("chat-prefill", {
          detail: {
            text: `I bought ${item.estimated_shares} shares of ${item.ticker} at $${item.current_price.toFixed(
              2
            )}`,
            autoSend: true,
          },
        })
      );
      toast.success(`Marked ${item.ticker} as bought`, {
        description: "Confirm in chat to add it to your portfolio.",
      });
    } else if (action === "rejected") {
      toast(`${item.ticker} skipped`, {
        description: "No problem — you can revisit this anytime.",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="my-3 bg-white border border-line-soft rounded-2xl p-4 shadow-card"
    >
      <div className="border-b border-line-soft/60 pb-3 mb-4">
        <p className="text-[10px] font-medium text-ink-tertiary uppercase tracking-wider mb-1">
          Your rebalance plan
        </p>
        <p className="font-serif text-base text-ink-primary leading-snug">{plan_summary}</p>
        {intro_text && (
          <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">{intro_text}</p>
        )}
      </div>

      <div className="space-y-4 mb-4">
        {phases.map((phase, idx) => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            isLast={idx === phases.length - 1}
            statuses={statuses}
            planSaved={planSaved}
            onItemAction={handleItemAction}
          />
        ))}
      </div>

      {expected_after && (
        <div className="bg-forest-pale border border-forest-soft/30 rounded-xl p-3.5 mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-primary" />
            <p className="text-[10px] font-medium text-forest-primary uppercase tracking-wider">
              If you complete this plan
            </p>
          </div>
          <div className="space-y-1 text-sm text-ink-primary">
            <RowKV
              k={`${expected_after.new_top_holding} concentration`}
              v={`→ ${expected_after.new_top_concentration_pct}%`}
            />
            <RowKV k="Sectors covered" v={`${expected_after.sectors_count_after}+`} />
            <RowKV k="Risk read" v={expected_after.estimated_risk_improvement} />
          </div>
        </div>
      )}

      {!planSaved ? (
        <button
          onClick={handleApply}
          disabled={saving || allItems.length === 0}
          className="w-full bg-forest-primary hover:bg-forest-deep disabled:opacity-50 disabled:pointer-events-none text-white font-medium py-2.5 rounded-xl transition-all hover:translate-y-[-1px] flex items-center justify-center gap-2"
        >
          {saving ? "Saving…" : allItems.length === 0 ? "Behavioral only — no apply needed" : "Apply this plan"}
          {!saving && allItems.length > 0 && <ArrowRight className="w-4 h-4" />}
        </button>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-forest-primary font-medium flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" strokeWidth={3} />
            Plan saved
          </p>
          <p className="text-xs text-ink-secondary mt-1 leading-snug">
            Execute in your broker, then mark each item as bought below.
          </p>
        </div>
      )}

      <p className="text-[10px] text-ink-tertiary mt-3 text-center italic leading-relaxed">
        {disclaimer}
      </p>
    </motion.div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-ink-secondary">{k}</span>
      <span className="font-medium tabular-nums text-ink-primary">{v}</span>
    </div>
  );
}

function PhaseSection({
  phase,
  isLast,
  statuses,
  planSaved,
  onItemAction,
}: {
  phase: RebalancePhase;
  isLast: boolean;
  statuses: Record<string, ItemStatus>;
  planSaved: boolean;
  onItemAction: (item: RebalancePhaseItem, action: ItemStatus) => void;
}) {
  return (
    <div className={!isLast ? "pb-4 border-b border-line-soft/60" : ""}>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-7 h-7 rounded-full bg-forest-primary text-white flex items-center justify-center text-xs font-medium shrink-0">
          {phase.phase_number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-ink-primary leading-snug">{phase.title}</p>
          <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{phase.explanation}</p>
        </div>
      </div>

      {phase.items.length > 0 ? (
        <div className="ml-10 space-y-2 mt-3">
          {phase.items.map((item) => (
            <PlanItemRow
              key={item.id}
              item={item}
              status={statuses[item.ticker] ?? "pending"}
              planSaved={planSaved}
              onAction={(action) => onItemAction(item, action)}
            />
          ))}
        </div>
      ) : (
        <div className="ml-10 mt-3 flex items-start gap-2 bg-cream-soft/60 border border-line-soft rounded-xl p-3">
          <Lock className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 shrink-0" />
          <p className="text-xs text-ink-secondary leading-relaxed italic">
            {phase.expected_impact}
          </p>
        </div>
      )}
    </div>
  );
}

function PlanItemRow({
  item,
  status,
  planSaved,
  onAction,
}: {
  item: RebalancePhaseItem;
  status: ItemStatus;
  planSaved: boolean;
  onAction: (action: ItemStatus) => void;
}) {
  return (
    <div className="bg-cream-soft/60 border border-line-soft rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-primary leading-snug">
            Buy <span className="tabular-nums">{item.ticker}</span>
            <span className="text-ink-tertiary font-normal"> — {item.name}</span>
          </p>
          <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{item.description}</p>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs mb-2 tabular-nums">
        <span className="text-ink-secondary">
          ~{item.estimated_shares} shares @ ${item.current_price.toFixed(2)}
        </span>
        <span className="font-medium text-ink-primary">
          ~${item.amount_usd.toLocaleString()}
        </span>
      </div>

      {planSaved && status === "pending" && (
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={() => onAction("completed")}
            className="flex-1 bg-forest-primary hover:bg-forest-deep text-white text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            <Check className="w-3 h-3" strokeWidth={3} />
            I bought it
          </button>
          <button
            onClick={() => onAction("rejected")}
            className="flex-1 bg-cream-soft hover:bg-line-soft text-ink-secondary text-xs font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Skip
          </button>
        </div>
      )}

      {status === "completed" && (
        <p className="text-xs text-forest-primary font-medium mt-2 flex items-center gap-1">
          <Check className="w-3 h-3" strokeWidth={3} />
          Marked as bought
        </p>
      )}
      {status === "rejected" && (
        <p className="text-xs text-ink-tertiary italic mt-2">Skipped</p>
      )}
    </div>
  );
}
