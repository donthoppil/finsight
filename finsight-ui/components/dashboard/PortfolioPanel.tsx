"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Wallet } from "lucide-react";
import { useMode } from "@/components/toggle/ModeContext";
import { formatNumber, translate } from "@/lib/translator";
import { Card } from "@/components/ui/Card";
import { HoldingRow } from "./HoldingRow";
import { RiskSnapshot } from "./RiskSnapshot";
import { ConcentrationAlert } from "./ConcentrationAlert";
import { MismatchAlert } from "./MismatchAlert";
import { usePortfolio, type LiveHolding } from "@/lib/store";
import { useRisk } from "@/lib/store-risk";

const COLOR_BY_CLASS: Record<string, string> = {
  stock: "#2563EB",
  equity: "#2563EB",
  fund: "#60A5FA",
  etf: "#60A5FA",
  bond: "#F59E0B",
  gold: "#FBBF24",
  unknown: "#8B97AB",
};

// Plain-English breakdown — Finsight only tracks individual stocks vs mutual funds / ETFs.
// Both rows always render so a 0% on either side is visible.
const SIMPLE_BUCKETS = {
  Stocks: { color: "#2563EB", classes: ["stock", "equity"] },
  "Mutual funds": { color: "#60A5FA", classes: ["fund", "etf", "bond", "gold", "unknown"] },
};
type BucketKey = keyof typeof SIMPLE_BUCKETS;

function bucketAllocation(
  allocation: Record<string, number>
): Array<{ name: BucketKey; pct: number; color: string }> {
  return (Object.keys(SIMPLE_BUCKETS) as BucketKey[]).map((bucket) => {
    const cfg = SIMPLE_BUCKETS[bucket];
    const pct = cfg.classes.reduce((sum, cls) => sum + (allocation[cls] ?? 0), 0);
    return { name: bucket, pct, color: cfg.color };
  });
}

export function PortfolioPanel() {
  const { mode } = useMode();
  const snapshot = usePortfolio((s) => s.snapshot);
  const loading = usePortfolio((s) => s.loading);
  const refresh = usePortfolio((s) => s.refresh);
  const risk = useRisk((s) => s.snapshot);

  // Initial fetch on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const holdings: LiveHolding[] = snapshot?.holdings ?? [];
  const totalValue = snapshot?.total ?? 0;
  const allocation = snapshot?.allocation ?? {};

  const buckets = bucketAllocation(allocation);
  // Donut data — only non-zero slices, so 0% buckets don't draw weird tiny arcs.
  const donutData = buckets.filter((b) => b.pct > 0);
  const stocksPct = buckets.find((b) => b.name === "Stocks")?.pct ?? 0;

  const dayChange = 0.8; // demo until we have a real day-change calc
  const isEmpty = holdings.length === 0;

  return (
    <div className="space-y-4">
      {/* 1. Conditional alerts */}
      <AnimatePresence>
        {risk?.concentration_alert && (
          <ConcentrationAlert
            key="conc"
            symbol={risk.concentration_alert.symbol}
            pct={risk.concentration_alert.pct_of_portfolio}
            value={risk.concentration_alert.value}
            isFund={risk.concentration_alert.is_fund}
          />
        )}
        {risk?.mismatch && (
          <MismatchAlert
            key="mismatch"
            userSays={risk.mismatch.user_says}
            portfolioIs={risk.mismatch.portfolio_is}
            severity={risk.mismatch.severity}
          />
        )}
      </AnimatePresence>

      {/* 3. Risk Snapshot — above the fold now */}
      <RiskSnapshot />

      {/* 4. Merged "Your money" card — money on the left, donut + 3-row legend on the right */}
      <Card className="min-w-0">
        <div className="font-serif text-lg text-ink-primary mb-3">Your money</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* LEFT: dollar amount + day change */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`val-${mode}-${totalValue}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="font-serif text-4xl xl:text-5xl text-ink-primary tabular-nums leading-none break-words"
              >
                {loading && !snapshot ? "—" : formatNumber(totalValue, "currency", mode)}
              </motion.div>
            </AnimatePresence>
            <span className="inline-block mt-3 bg-forest-pale text-forest-primary text-xs font-medium px-2.5 py-1 rounded-full tabular-nums">
              {isEmpty ? "Add holdings to start" : `+${dayChange.toFixed(1)}% today`}
            </span>
          </div>

          {/* RIGHT: donut + 3-row legend (Stocks/Bonds/Cash) */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-24 h-24 shrink-0">
              {donutData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={donutData}
                        dataKey="pct"
                        nameKey="name"
                        innerRadius="60%"
                        outerRadius="100%"
                        stroke="none"
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`center-${mode}-${stocksPct}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.3 }}
                        className="text-center"
                      >
                        <div className="font-serif text-lg text-forest-primary tabular-nums leading-none">
                          {formatNumber(stocksPct, "percent", mode)}
                        </div>
                        <div className="text-[10px] text-ink-tertiary leading-none mt-0.5">
                          stocks
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="w-full h-full rounded-full bg-cream-soft" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              {buckets.map((b) => (
                <div key={b.name} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="text-ink-secondary truncate">{b.name}</span>
                  </div>
                  <span
                    className={`tabular-nums shrink-0 ${
                      b.pct > 0 ? "text-ink-primary font-medium" : "text-ink-tertiary"
                    }`}
                  >
                    {b.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Holdings */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-2 flex items-baseline justify-between">
          <div className="font-serif text-lg text-ink-primary">Holdings</div>
          <div className="text-xs text-ink-tertiary tabular-nums">
            {isEmpty ? "no positions yet" : `${holdings.length} ${holdings.length === 1 ? "position" : "positions"}`}
          </div>
        </div>
        <div className="px-6 pb-4 max-h-[340px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-forest-pale text-forest-primary mb-3">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-sm text-ink-primary font-medium">Your portfolio is empty</div>
                <p className="text-xs text-ink-tertiary mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Tell the coach what you own — like &quot;I have 25 shares of Apple&quot;.
                </p>
              </motion.div>
            ) : (
              holdings.map((h, i) => (
                <HoldingRow
                  key={h.symbol}
                  index={i}
                  holding={{
                    symbol: h.symbol,
                    name: h.name,
                    shares: h.shares,
                    price: h.current_price,
                    change: h.change_pct,
                    asset_class: (h.asset_class === "stock" || h.asset_class === "fund"
                      ? h.asset_class
                      : h.asset_class === "etf" || h.asset_class === "bond" || h.asset_class === "gold"
                      ? "fund"
                      : "stock") as "stock" | "fund",
                    description: `Live position. Avg cost: ${
                      h.avg_cost_basis ? `$${h.avg_cost_basis.toFixed(2)}/share` : "n/a"
                    }. Current: $${h.current_price.toFixed(2)}.`,
                  }}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
