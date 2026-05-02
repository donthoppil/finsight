"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { StepGoal } from "./StepGoal";
import { StepTimeline } from "./StepTimeline";
import { StepRiskFeel } from "./StepRiskFeel";
import { StepAmount } from "./StepAmount";

export function OnboardingShell() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [goal, setGoal] = useState<{ id: string; label: string } | null>(null);
  const [years, setYears] = useState(2);
  const [risk, setRisk] = useState<string | null>(null);
  const [amount, setAmount] = useState(54200);

  const goNext = (delay = 0) => {
    setDirection(1);
    setTimeout(() => setStep((s) => Math.min(3, s + 1)), delay);
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("onboarding_complete", "true");
      window.localStorage.setItem(
        "onboarding_data",
        JSON.stringify({
          goal: goal?.label ?? "",
          goal_timeline_years: years,
          risk_feel: risk ?? "nervous",
          amount_invested: amount,
        })
      );
    }
    router.push("/dashboard");
  };

  const canContinue = () => {
    if (step === 0) return goal !== null;
    if (step === 1) return years > 0;
    if (step === 2) return risk !== null;
    if (step === 3) return amount > 0;
    return false;
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-3xl shadow-card border border-line-soft p-8 lg:p-12">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 32 : 8,
                  backgroundColor: i <= step ? "#2563EB" : "#DBE3EE",
                }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full"
              />
            ))}
          </div>

          {/* Step content */}
          <div className="relative min-h-[420px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {step === 0 && (
                  <StepGoal
                    value={goal?.id ?? null}
                    onChange={(id, label) => {
                      setGoal({ id, label });
                      goNext(280);
                    }}
                  />
                )}
                {step === 1 && <StepTimeline value={years} onChange={setYears} />}
                {step === 2 && (
                  <StepRiskFeel
                    value={risk}
                    onChange={(id) => {
                      setRisk(id);
                      goNext(280);
                    }}
                  />
                )}
                {step === 3 && <StepAmount value={amount} onChange={setAmount} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={step === 0}
              className="flex items-center gap-2 text-ink-secondary hover:text-ink-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => goNext()}
                disabled={!canContinue()}
                className="flex items-center gap-2 bg-forest-primary hover:bg-forest-deep text-white font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none hover:translate-y-[-1px]"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!canContinue()}
                className="flex items-center gap-2 bg-forest-primary hover:bg-forest-deep text-white font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none hover:translate-y-[-1px]"
              >
                Finish setup
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
