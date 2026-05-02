"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Panel, Group } from "react-resizable-panels";
import { TopBar } from "@/components/dashboard/TopBar";
import { PortfolioPanel } from "@/components/dashboard/PortfolioPanel";
import { CenterTabs } from "@/components/dashboard/CenterTabs";
import { ThinkingPanel } from "@/components/dashboard/ThinkingPanel";
import { ResizeHandle } from "@/components/dashboard/ResizeHandle";
import { TuneMyPlanPanel } from "@/components/profile/TuneMyPlanPanel";
import { usePortfolio } from "@/lib/store";

function AmbientBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="blob animate-float"
        style={{
          width: 480,
          height: 480,
          left: "-10%",
          top: "-12%",
          background:
            "radial-gradient(circle, rgba(96,165,250,0.30) 0%, rgba(96,165,250,0) 70%)",
        }}
      />
      <div
        className="blob animate-float-slow"
        style={{
          width: 460,
          height: 460,
          right: "-8%",
          top: "30%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)",
          animationDelay: "-6s",
        }}
      />
    </div>
  );
}

const EMPTY_PORTFOLIO_GREETING = {
  id: "greeting-empty",
  role: "assistant" as const,
  text:
    "Welcome Alex! Your portfolio is empty. Tell me what you already own — like \"I have 25 shares of Apple\" — or ask me to suggest some funds to start with.",
  suggested_replies: [
    "What should I invest in?",
    "I have 25 shares of Apple",
    "How does this work?",
  ],
  citations: [],
  confidence: "high" as const,
  kind: "text" as const,
};

const RETURNING_GREETING = {
  id: "greeting-return",
  role: "assistant" as const,
  text:
    "Welcome back! I've got your portfolio loaded. Ask me anything — \"How am I doing?\" — or tell me about a trade.",
  suggested_replies: [
    "How am I doing?",
    "Suggest a rebalance plan",
    "What if the market drops?",
  ],
  citations: [],
  confidence: "high" as const,
  kind: "text" as const,
};

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [messages, setMessages] = useState<any[]>([]);
  const [thinking, setThinking] = useState(false);
  const [scenarioRequest, setScenarioRequest] = useState<string | null>(null);

  const refreshPortfolio = usePortfolio((s) => s.refresh);
  const snapshot = usePortfolio((s) => s.snapshot);

  // Auto-set demo flags + initial portfolio fetch
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("demo_logged_in") !== "true") {
      window.localStorage.setItem("demo_logged_in", "true");
    }
    if (window.localStorage.getItem("onboarding_complete") !== "true") {
      window.localStorage.setItem("onboarding_complete", "true");
    }
    refreshPortfolio();
  }, [refreshPortfolio]);

  // Greeting depends on whether the portfolio has anything in it.
  // Wait for the snapshot to load before deciding.
  useEffect(() => {
    if (messages.length > 0) return;
    if (snapshot) {
      setMessages([snapshot.holdings.length === 0 ? EMPTY_PORTFOLIO_GREETING : RETURNING_GREETING]);
    }
  }, [snapshot, messages.length]);

  return (
    <div className="relative min-h-screen lg:h-screen app-bg flex flex-col overflow-hidden">
      <AmbientBlobs />
      <TuneMyPlanPanel />

      <TopBar />

      <main className="relative flex-1 px-3 sm:px-4 pb-4 pt-3 min-h-0">
        <div className="lg:hidden space-y-4">
          <ThinkingPanel active={thinking} />
          <PortfolioPanel />
          <div className="min-h-[600px]">
            <CenterTabs
              messages={messages}
              setMessages={setMessages}
              thinking={thinking}
              setThinking={setThinking}
              scenarioRequest={scenarioRequest}
              onScenarioConsumed={() => setScenarioRequest(null)}
            />
          </div>
        </div>

        <div className="hidden lg:block h-full">
          <Group orientation="horizontal" className="h-full">
            <Panel defaultSize="20%" minSize="10%" maxSize="40%" className="h-full min-w-0 overflow-hidden">
              <motion.aside
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
                className="h-full min-w-0"
              >
                <ThinkingPanel active={thinking} />
              </motion.aside>
            </Panel>

            <ResizeHandle />

            <Panel defaultSize="50%" minSize="25%" maxSize="70%" className="h-full min-w-0 overflow-hidden">
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
                className="h-full overflow-y-auto min-w-0"
              >
                <PortfolioPanel />
              </motion.section>
            </Panel>

            <ResizeHandle />

            <Panel defaultSize="30%" minSize="20%" maxSize="60%" className="h-full min-w-0 overflow-hidden">
              <motion.section
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
                className="h-full min-w-0"
              >
                <CenterTabs
                  messages={messages}
                  setMessages={setMessages}
                  thinking={thinking}
                  setThinking={setThinking}
                  scenarioRequest={scenarioRequest}
                  onScenarioConsumed={() => setScenarioRequest(null)}
                />
              </motion.section>
            </Panel>
          </Group>
        </div>
      </main>
    </div>
  );
}
