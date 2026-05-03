"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ScenarioGrid } from "@/components/scenarios/ScenarioGrid";
import { ScenarioResult } from "@/components/scenarios/ScenarioResult";
import { Sparkles } from "lucide-react";

type Tab = "chat" | "whatif" | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "whatif", label: "What If?" },
  { id: "insights", label: "Insights" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CenterTabs({
  messages,
  setMessages,
  thinking,
  setThinking,
  scenarioRequest,
  onScenarioConsumed,
}: {
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  thinking: boolean;
  setThinking: (b: boolean) => void;
  scenarioRequest?: string | null;
  onScenarioConsumed?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("chat");
  const [openScenario, setOpenScenario] = useState<string | null>(null);

  // External request from chat to open a scenario tab + pick the scenario.
  useEffect(() => {
    if (scenarioRequest) {
      setTab("whatif");
      setOpenScenario(scenarioRequest);
      onScenarioConsumed?.();
    }
  }, [scenarioRequest, onScenarioConsumed]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-line-soft flex flex-col h-full min-w-0 overflow-hidden">
      <div className="px-6 pt-4 border-b border-line-soft shrink-0">
        <div className="relative flex items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  // Clicking the What-If tab itself should always land on the
                  // scenario grid — not on whatever scenario was last open.
                  // Deep-links from chat (scenarioRequest) still work because
                  // they set openScenario in their own effect.
                  if (t.id === "whatif") setOpenScenario(null);
                }}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "text-forest-primary" : "text-ink-tertiary hover:text-ink-primary"
                }`}
              >
                {t.label}
                {active && (
                  <motion.div
                    layoutId="active-tab-underline"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute left-2 right-2 bottom-0 h-0.5 bg-forest-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <ChatInterface
                messages={messages}
                setMessages={setMessages}
                thinking={thinking}
                setThinking={setThinking}
                onScenarioOpen={(id) => {
                  setTab("whatif");
                  setOpenScenario(id);
                }}
              />
            </motion.div>
          )}

          {tab === "whatif" && (
            <motion.div
              key="whatif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto p-6"
            >
              {openScenario ? (
                <ScenarioResult
                  scenarioId={openScenario}
                  onBack={() => setOpenScenario(null)}
                />
              ) : (
                <ScenarioGrid onPick={(id) => setOpenScenario(id)} />
              )}
            </motion.div>
          )}

          {tab === "insights" && (
            <motion.div
              key="insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full flex flex-col items-center justify-center p-10 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-forest-pale text-forest-primary flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-2xl text-ink-primary">Insights, coming soon</h3>
              <p className="mt-2 max-w-sm text-ink-secondary">
                Your personalized insights will appear here — patterns, drift alerts, and tax
                opportunities tuned to your goals.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
