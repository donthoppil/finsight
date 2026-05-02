"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, MessageSquareText } from "lucide-react";
import { useMode } from "@/components/toggle/ModeContext";
import { formatNumber } from "@/lib/translator";
import { useRisk } from "@/lib/store-risk";
import type { RiskSnapshot as RiskSnapshotType } from "@/lib/risk";

const LABEL_COLOR: Record<string, string> = {
  calm: "#2563EB",
  steady: "#60A5FA",
  moderate: "#F59E0B",
  wobbly: "#EF6961",
  stormy: "#E14F4F",
  empty: "#8B97AB",
};

// Each component gets its own fixed color so the eye can rank them by hue, not by score.
type ComponentKey = "concentration" | "heaviness" | "volatility";
const COMPONENT_COLOR: Record<ComponentKey, string> = {
  concentration: "#EF6961", // coral — most pressing
  heaviness: "#F59E0B", // amber — secondary
  volatility: "#B8915B", // warm tan — tertiary
};

function ComponentRow({
  number,
  title,
  score,
  label,
  description,
  componentKey,
  showScore,
}: {
  number: number;
  title: string;
  score: number;
  label: string;
  description: string;
  componentKey: ComponentKey;
  showScore: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <span className="text-sm font-medium text-ink-primary leading-snug">
          <span className="text-ink-tertiary mr-1">{number}.</span>
          {title}
        </span>
        <span className="text-xs text-ink-secondary capitalize shrink-0">
          {showScore && (
            <span className="tabular-nums mr-1.5 text-ink-primary font-medium">{score}</span>
          )}
          {label}
        </span>
      </div>
      <div className="relative h-2 bg-cream-soft rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: COMPONENT_COLOR[componentKey] }}
        />
      </div>
      <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">{description}</p>
    </div>
  );
}

export function RiskSnapshot() {
  const { mode } = useMode();
  const snapshot = useRisk((s) => s.snapshot);
  const loading = useRisk((s) => s.loading);
  const refresh = useRisk((s) => s.refresh);
  const showScore = mode === "detailed";

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("portfolio-updated", handler);
    return () => window.removeEventListener("portfolio-updated", handler);
  }, [refresh]);

  if (!snapshot && loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-card border border-line-soft">
        <div className="text-sm text-ink-tertiary">Crunching the risk numbers…</div>
      </div>
    );
  }

  if (!snapshot || snapshot.overall_label === "empty") {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-card border border-line-soft">
        <div className="font-serif text-lg text-ink-primary mb-2">Your risk snapshot</div>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Add some holdings and I&apos;ll show you the full risk picture — concentration, how
          heavy you are in single stocks, and how big a typical bad month could be.
        </p>
      </div>
    );
  }

  const data = snapshot as RiskSnapshotType & {
    components: NonNullable<RiskSnapshotType["components"]>;
  };
  const overallColor = LABEL_COLOR[data.overall_label] ?? LABEL_COLOR.empty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-card border border-line-soft"
    >
      <div className="flex items-baseline justify-between mb-5">
        <div className="font-serif text-lg text-ink-primary">Your risk snapshot</div>
        <span className="text-[10px] text-ink-tertiary uppercase tracking-wide">live</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: overall + dollars + CTA */}
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-xs text-ink-tertiary uppercase tracking-wide">Overall</div>
                <div
                  className="font-serif text-2xl capitalize leading-tight"
                  style={{ color: overallColor }}
                >
                  {data.overall_label}
                </div>
              </div>
              {showScore && (
                <div className="text-right">
                  <div className="font-serif text-3xl tabular-nums text-ink-primary leading-none">
                    {data.overall_score}
                    <span className="text-sm text-ink-tertiary">/100</span>
                  </div>
                </div>
              )}
            </div>
            <div
              className="relative h-3 rounded-full overflow-hidden"
              style={{
                background:
                  "linear-gradient(to right, #2563EB 0%, #60A5FA 25%, #F59E0B 50%, #EF6961 75%, #E14F4F 100%)",
              }}
            >
              <motion.div
                initial={{ left: "0%" }}
                animate={{ left: `${data.overall_score}%` }}
                transition={{ type: "spring", stiffness: 110, damping: 18 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 shadow-card"
                style={{ borderColor: overallColor }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-tertiary mt-1.5 uppercase tracking-wide">
              <span>Calm</span>
              <span>Stormy</span>
            </div>
          </div>

          {/* Dollar estimates */}
          <div className="bg-cream-soft rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
                What this means in dollars
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink-primary">In a bad month, around</span>
                <span className="font-medium tabular-nums text-warm-coral shrink-0">
                  −{formatNumber(data.estimates.bad_month_loss, "currency", mode)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-primary">2008-style crash, around</span>
                <span className="font-medium tabular-nums text-warm-rose shrink-0">
                  −{formatNumber(data.estimates.crash_loss, "currency", mode)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("chat-prefill", {
                  detail: { text: "Walk me through my risk snapshot — what should I do?" },
                })
              );
            }}
            className="w-full bg-forest-primary hover:bg-forest-deep text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:translate-y-[-1px] flex items-center justify-center gap-2"
          >
            <MessageSquareText className="w-4 h-4" />
            Talk to coach about this
          </button>
        </div>

        {/* RIGHT: 3 component bars */}
        <div>
          <p className="text-xs text-ink-secondary mb-3">Why? Three things drive it:</p>
          <div className="space-y-4">
            <ComponentRow
              number={1}
              componentKey="concentration"
              title={`Concentration in ${data.components.concentration.top_holding}`}
              score={data.components.concentration.score}
              label={data.components.concentration.label}
              description={
                mode === "simple"
                  ? `${data.components.concentration.top_holding} is most of your money.`
                  : `${data.components.concentration.top_holding} is ${data.components.concentration.top_holding_pct}% of your portfolio. Top 3: ${data.components.concentration.top_3_pct}%.`
              }
              showScore={showScore}
            />
            <ComponentRow
              number={2}
              componentKey="heaviness"
              title="Heavy in individual stocks"
              score={data.components.stock_heaviness.score}
              label={data.components.stock_heaviness.label}
              description={
                mode === "simple"
                  ? "Most of your money is in single companies, not spread-out funds."
                  : `${data.components.stock_heaviness.individual_stock_pct}% in single stocks; the rest in diversified funds.`
              }
              showScore={showScore}
            />
            <ComponentRow
              number={3}
              componentKey="volatility"
              title="Day-to-day swings"
              score={data.components.volatility.score}
              label={data.components.volatility.label}
              description={
                mode === "simple"
                  ? "Your holdings can move around a lot day to day."
                  : `Your holdings move about ${data.components.volatility.annualized_vol_pct}% per year on average.`
              }
              showScore={showScore}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
