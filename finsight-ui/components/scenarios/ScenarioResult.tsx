"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import {
  SAMPLE_SCENARIO_RESULT,
  SCENARIOS,
  type ScenarioResult as ScenarioResultData,
} from "@/lib/demo-data";
import { SCENARIO_CFG } from "@/lib/scenario-synth";
import type { ScenarioApiResponse } from "@/lib/scenario-api";
import { ImpactSummary } from "./ImpactSummary";
import { BeforeAfterDonut } from "./BeforeAfterDonut";
import { TransparencyCard } from "./TransparencyCard";
import { ScenarioParamPanel, type Direction } from "./ScenarioParamPanel";
import { IncomeParamPanel, type IncomeMode } from "./IncomeParamPanel";

// ---- Param mapping (UI state → math service payload) -----------------------

function buildPayload(args: {
  scenarioId: string;
  direction: Direction;
  value: number;
  secondary: number;
  incomeMode: IncomeMode;
  incomePct: number;
  incomeMonths: number;
}): { id: string; params: Record<string, unknown> } {
  const { scenarioId, direction, value, secondary, incomeMode, incomePct, incomeMonths } = args;

  if (scenarioId === "market_change") {
    return {
      id: "market_change",
      params: {
        direction: direction === "drop" ? "drops" : "rises",
        magnitude_pct: value,
      },
    };
  }
  if (scenarioId === "inflation") {
    return {
      id: "inflation",
      params: { annual_inflation_pct: value, years: secondary || 3 },
    };
  }
  if (scenarioId === "withdrawal") {
    return {
      id: "withdrawal",
      params: {
        withdrawal_pct: value,
        timeframe_months: Math.max(1, Math.round((secondary || 2) * 12)),
      },
    };
  }
  if (scenarioId === "rate_change") {
    // UI: drop = rate hike (bad for equities). Spec API: direction "rises" = rates rise.
    return {
      id: "rate_change",
      params: {
        direction: direction === "drop" ? "rises" : "falls",
        magnitude_bps: Math.round(value * 100), // % → bps
      },
    };
  }
  if (scenarioId === "income_change") {
    const change_type =
      incomeMode === "none" ? "loss" : incomeMode === "decrease" ? "cut" : "raise";
    return {
      id: "income_change",
      params: {
        change_type,
        months_affected: incomeMonths,
        monthly_expenses: 4000,
        magnitude_pct: incomePct,
      },
    };
  }
  return { id: scenarioId, params: {} };
}

// ---- API response → UI shape -----------------------------------------------

function apiToScenarioResult(
  api: ScenarioApiResponse,
  scenarioId: string,
  incomeMode: IncomeMode
): ScenarioResultData {
  const before = api.portfolio_today;
  const after = api.portfolio_after;
  const changePct = api.change_pct;

  // Acting-now mitigation: 60% softer impact (consistent with the old synth)
  const after_with_action = before + (after - before) * 0.4;
  const loss_with_action_pct = changePct * 0.4;

  // Default fallback narrative bits
  let goal_alignment = api.rationale;
  let do_nothing =
    changePct === 0
      ? "No direct impact on portfolio value."
      : changePct < 0
      ? `If you do nothing, your portfolio falls about ${Math.abs(changePct).toFixed(1)}%.`
      : `If you do nothing, your portfolio is up about ${changePct.toFixed(1)}% on paper.`;
  let do_act =
    changePct === 0
      ? "Acting now is more about preparing your cash plan than your portfolio."
      : changePct < 0
      ? `Acting now softens the hit to about ${Math.abs(loss_with_action_pct).toFixed(1)}%.`
      : "Locking in a slice protects part of the gain if the market reverses.";

  // Income scenario uses cash-buffer semantics, not portfolio impact
  if (scenarioId === "income_change") {
    if (api.cash_needed) {
      goal_alignment = `${api.rationale} Cash buffer needed: $${Math.round(
        api.cash_needed
      ).toLocaleString()}.`;
      do_nothing =
        api.cushion_pct && api.cushion_pct > 15
          ? `You'd need to dip into the portfolio to cover ~$${Math.round(
              api.cash_needed
            ).toLocaleString()}.`
          : `Your buffer covers it — portfolio stays untouched.`;
      do_act =
        "Pause new buying first. Sell from highest-volatility positions only if the buffer runs out.";
    } else if (incomeMode === "increase") {
      goal_alignment = `${api.rationale}`;
      do_nothing = "If you don't redirect the extra income, it sits in cash and loses to inflation.";
      do_act = "Direct the surplus into VOO/VTI to fill any sector gaps.";
    }
  }

  return {
    scenario_id: scenarioId,
    before_value: before,
    after_no_action_value: after,
    after_with_action_value: after_with_action,
    loss_no_action_pct: changePct,
    loss_with_action_pct,
    current_allocation: { stock: 36, fund: 64 },
    recommended_allocation:
      changePct < -10 ? { stock: 18, fund: 82 } : changePct > 5 ? { stock: 30, fund: 70 } : { stock: 36, fund: 64 },
    actions: api.suggestions.map((s) => (s.detail ? `${s.text} — ${s.detail}` : s.text)),
    transparency: {
      goal_alignment,
      cost_to_execute: "$0 in trading fees on commission-free ETFs. Spread costs vary by fund.",
      tax_implications:
        "Selling triggers capital gains tax. Holdings >1 year qualify for the lower long-term rate.",
      do_nothing,
      do_act,
      confidence: api.confidence,
      sources: ["Live yfinance data", "Historical sector behavior", "Portfolio breakdown"],
    },
  };
}

// ---- Component -------------------------------------------------------------

export function ScenarioResult({
  scenarioId,
  onBack,
}: {
  scenarioId: string;
  onBack: () => void;
}) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const cfg = SCENARIO_CFG[scenarioId];
  const isIncome = scenarioId === "income_change";

  const [direction, setDirection] = useState<Direction>(cfg?.defaultDirection ?? "drop");
  const [value, setValue] = useState<number>(cfg?.defaultValue ?? 20);
  const [secondary, setSecondary] = useState<number>(cfg?.defaultSecondary ?? 0);

  const [incomeMode, setIncomeMode] = useState<IncomeMode>("decrease");
  const [incomePct, setIncomePct] = useState<number>(20);
  const [incomeMonths, setIncomeMonths] = useState<number>(6);

  const [apiResult, setApiResult] = useState<ScenarioApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"empty" | "incomplete" | "service" | null>(null);

  // Reset state when scenarioId changes
  useEffect(() => {
    if (cfg) {
      setDirection(cfg.defaultDirection);
      setValue(cfg.defaultValue);
      setSecondary(cfg.defaultSecondary ?? 0);
    }
    if (isIncome) {
      setIncomeMode("decrease");
      setIncomePct(20);
      setIncomeMonths(6);
    }
    setApiResult(null);
    setError(null);
  }, [scenarioId, cfg, isIncome]);

  // Debounced fetch on any param change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { id, params } = buildPayload({
        scenarioId,
        direction,
        value,
        secondary,
        incomeMode,
        incomePct,
        incomeMonths,
      });
      setLoading(true);
      try {
        const res = await fetch("/api/scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario_id: id, params }),
        });
        const data = (await res.json()) as ScenarioApiResponse | { error: string };
        if ("error" in data && data.error) {
          if (data.error === "empty_portfolio") setError("empty");
          else setError("service");
          setApiResult(null);
        } else {
          setError(null);
          setApiResult(data as ScenarioApiResponse);
        }
      } catch {
        setError("service");
        setApiResult(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scenarioId, direction, value, secondary, incomeMode, incomePct, incomeMonths]);

  const result: ScenarioResultData = useMemo(() => {
    if (apiResult) return apiToScenarioResult(apiResult, scenarioId, incomeMode);
    return SAMPLE_SCENARIO_RESULT;
  }, [apiResult, scenarioId, incomeMode]);

  const dynamicTitle = isIncome
    ? incomeMode === "none"
      ? `No income for ${incomeMonths} ${incomeMonths === 1 ? "month" : "months"}`
      : incomeMode === "decrease"
      ? `Income drops ${incomePct}% for ${incomeMonths} ${incomeMonths === 1 ? "month" : "months"}`
      : `Income rises ${incomePct}% for ${incomeMonths} ${incomeMonths === 1 ? "month" : "months"}`
    : cfg
    ? cfg.formatTitle(direction, value, secondary)
    : scenario.title;

  const dynamicSubtitle = isIncome
    ? incomeMode === "none"
      ? "No paychecks coming in"
      : incomeMode === "decrease"
      ? "Pay cut or reduced hours"
      : "Raise or new role"
    : cfg
    ? cfg.formatSubtitle(direction, value, secondary)
    : scenario.subtitle;

  return (
    <motion.div
      layoutId={`scenario-${scenario.id}`}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to scenarios
        </button>
        {loading && (
          <span className="text-xs text-ink-tertiary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-forest-soft animate-pulse" />
            updating…
          </span>
        )}
      </div>

      <div>
        <motion.h2
          key={dynamicTitle}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-serif text-3xl text-ink-primary"
        >
          {dynamicTitle}
        </motion.h2>
        <p className="text-ink-secondary mt-1">{dynamicSubtitle}</p>
      </div>

      {isIncome ? (
        <IncomeParamPanel
          mode={incomeMode}
          onMode={setIncomeMode}
          pct={incomePct}
          onPct={setIncomePct}
          months={incomeMonths}
          onMonths={setIncomeMonths}
        />
      ) : (
        cfg && (
          <ScenarioParamPanel
            showDirection={cfg.showDirection}
            direction={direction}
            onDirection={setDirection}
            value={value}
            onValue={setValue}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            unit={cfg.unit}
            showSign={cfg.showSign}
            label={cfg.label}
            subjectLabel={cfg.subjectLabel}
            dropLabel={cfg.dropLabel}
            riseLabel={cfg.riseLabel}
            secondary={
              cfg.secondaryConfig
                ? {
                    value: secondary,
                    onValue: setSecondary,
                    min: cfg.secondaryConfig.min,
                    max: cfg.secondaryConfig.max,
                    step: cfg.secondaryConfig.step,
                    unit: cfg.secondaryConfig.unit,
                    label: cfg.secondaryConfig.label,
                  }
                : undefined
            }
          />
        )
      )}

      {error === "empty" ? (
        <EmptyState
          title="Your portfolio is empty"
          body="Add holdings first — tell the coach what you own (e.g. &quot;I have 25 shares of Apple&quot;), then come back to run scenarios."
        />
      ) : error === "service" ? (
        <EmptyState
          title="Couldn't run the scenario"
          body="The math service didn't respond. Try again in a moment."
        />
      ) : (
        <>
          <ImpactSummary result={result} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-card border border-line-soft"
          >
            <div className="font-serif text-lg text-ink-primary">Here&apos;s what we&apos;d suggest</div>
            <ul className="mt-4 space-y-3">
              {result.actions.map((a, i) => (
                <motion.li
                  key={`${a}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-forest-pale text-forest-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                  <span className="text-ink-primary leading-relaxed">{a}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <BeforeAfterDonut result={result} />

          <TransparencyCard result={result} />
        </>
      )}
    </motion.div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-line-soft flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-warm-amber/15 text-warm-amber flex items-center justify-center shrink-0">
        <AlertCircle className="w-4 h-4" />
      </div>
      <div>
        <div className="font-serif text-base text-ink-primary">{title}</div>
        <p className="text-sm text-ink-secondary mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
