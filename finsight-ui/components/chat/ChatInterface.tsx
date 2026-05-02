"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ConfirmationCard, type ConfirmationItem } from "./ConfirmationCard";
import { RecommendationCards } from "./RecommendationCards";
import { RebalancePlanCard } from "./RebalancePlanCard";
import type { ChatMessage } from "@/lib/demo-data";
import type { FundOption } from "@/lib/recommendations";
import type { RebalancePhase, RebalancePlan } from "@/lib/rebalance";
import { usePortfolio, useThinking, useProfile } from "@/lib/store";

type ChatActivity = { icon: string; text: string };
type WithCommon = { activity?: ChatActivity[]; profile_updated?: boolean };

type ChatApiResponse =
  | (WithCommon & {
      kind: "confirmation_request";
      intent_type: "add_holding" | "update_holding";
      items: ConfirmationItem[];
      message: string;
    })
  | (WithCommon & {
      kind: "answer";
      text: string;
      citations?: Array<{ source: string; claim: string }>;
      confidence?: "high" | "medium" | "low";
      suggested_followups?: string[];
    })
  | (WithCommon & {
      kind: "scenario_redirect";
      scenario_id: string;
      message: string;
    })
  | (WithCommon & {
      kind: "recommendation";
      options: FundOption[];
      intro_text: string;
      disclaimer: string;
    })
  | (WithCommon & {
      kind: "rebalance_plan";
      plan_id: string;
      plan_summary: string;
      diagnosis: RebalancePlan["diagnosis"];
      phases: RebalancePhase[];
      expected_after?: RebalancePlan["expected_after"];
      disclaimer: string;
      intro_text?: string;
    })
  | (WithCommon & { kind: "clarify"; message: string });

type LocalMessage =
  | (ChatMessage & { kind?: "text" })
  | {
      id: string;
      role: "assistant";
      kind: "confirmation";
      intent_type: "add_holding" | "update_holding";
      items: ConfirmationItem[];
      message: string;
      handled?: boolean;
    }
  | {
      id: string;
      role: "assistant";
      kind: "recommendation";
      options: FundOption[];
      intro_text: string;
      disclaimer: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "rebalance_plan";
      plan_id: string;
      plan_summary: string;
      phases: RebalancePhase[];
      expected_after?: RebalancePlan["expected_after"];
      disclaimer: string;
      intro_text?: string;
    };

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 bg-forest-pale rounded-2xl rounded-bl-md px-4 py-3 w-fit"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          className="w-1.5 h-1.5 rounded-full bg-forest-primary"
        />
      ))}
    </motion.div>
  );
}

export function ChatInterface({
  messages,
  setMessages,
  thinking,
  setThinking,
  onScenarioOpen,
}: {
  messages: LocalMessage[];
  setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>;
  thinking: boolean;
  setThinking: (b: boolean) => void;
  onScenarioOpen?: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [confirmingIndex, setConfirmingIndex] = useState<string | null>(null);
  const refreshPortfolio = usePortfolio((s) => s.refresh);
  const refreshProfile = useProfile((s) => s.refresh);
  const pushThinking = useThinking((s) => s.push);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, thinking]);

  const handleSend = async (text: string) => {
    const userMsg: LocalMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      kind: "text",
    };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const data = (await res.json()) as ChatApiResponse;

      // Stream activity events into the thinking panel.
      if (data.activity) {
        data.activity.forEach((evt, i) => {
          setTimeout(() => pushThinking(evt.icon, evt.text), i * 220);
        });
      }

      // If the bot detected & applied a profile update, refresh + broadcast.
      if (data.profile_updated) {
        refreshProfile();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile-updated"));
        }
      }

      let botMsg: LocalMessage;
      if (data.kind === "confirmation_request") {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          kind: "confirmation",
          intent_type: data.intent_type,
          items: data.items,
          message: data.message,
        };
      } else if (data.kind === "answer") {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.text,
          citations: data.citations ?? [],
          confidence: data.confidence,
          suggested_replies: data.suggested_followups,
          kind: "text",
        };
      } else if (data.kind === "scenario_redirect") {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.message,
          kind: "text",
        };
        if (onScenarioOpen) {
          // Briefly delay so the user sees the message before the tab switches.
          setTimeout(() => onScenarioOpen(data.scenario_id), 600);
        }
      } else if (data.kind === "recommendation") {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          kind: "recommendation",
          options: data.options,
          intro_text: data.intro_text,
          disclaimer: data.disclaimer,
        };
      } else if (data.kind === "rebalance_plan") {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          kind: "rebalance_plan",
          plan_id: data.plan_id,
          plan_summary: data.plan_summary,
          phases: data.phases,
          expected_after: data.expected_after,
          disclaimer: data.disclaimer,
          intro_text: data.intro_text,
        };
      } else {
        botMsg = {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.message,
          kind: "text",
        };
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: "Hmm, I couldn't reach the server. Make sure the math service is running and the API keys are set.",
          kind: "text",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const confirmItems = async (msgId: string, intent_type: "add_holding" | "update_holding", items: ConfirmationItem[]) => {
    setConfirmingIndex(msgId);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_type, items }),
      });
      if (!res.ok) throw new Error("portfolio update failed");
      pushThinking("💾", "Saved to your portfolio");
      await refreshPortfolio();
      // Tell the rest of the app the portfolio changed (RiskSnapshot, etc.)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("portfolio-updated"));
      }

      // Mark the confirmation card as handled and post a follow-up bubble.
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.kind === "confirmation" ? { ...m, handled: true } : m))
      );

      const summaryText =
        intent_type === "add_holding"
          ? `Added ${items.length} ${items.length === 1 ? "holding" : "holdings"}.`
          : `Recorded the trade.`;

      toast.success(summaryText, {
        description:
          items
            .map((it) => `${it.action === "sell" ? "Sold" : it.action === "buy" ? "Bought" : "Added"} ${it.shares} ${it.symbol}`)
            .slice(0, 3)
            .join(" · "),
      });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update your portfolio. Try again?");
      throw err;
    } finally {
      setConfirmingIndex(null);
    }
  };

  const lastAssistantTextId = [...messages]
    .reverse()
    .find(
      (m) =>
        m.role === "assistant" &&
        m.kind !== "confirmation" &&
        m.kind !== "recommendation" &&
        m.kind !== "rebalance_plan"
    )?.id;

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="px-6 py-4 border-b border-line-soft flex items-center gap-3 shrink-0 min-w-0">
        <div className="relative w-9 h-9 rounded-full bg-forest-primary flex items-center justify-center text-white shrink-0">
          <span className="font-serif text-lg leading-none">F</span>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-forest-soft rounded-full ring-2 ring-white animate-live-pulse" />
        </div>
        <div className="min-w-0">
          <div className="font-serif text-lg text-ink-primary leading-tight truncate">Finsight Coach</div>
          <div className="text-xs text-ink-tertiary truncate">Online · usually replies instantly</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 space-y-4 min-h-0 min-w-0">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            if (m.kind === "confirmation") {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] min-w-0">
                    <p className="text-sm text-ink-secondary mb-2">{m.message}</p>
                    {m.handled ? (
                      <div className="text-xs text-ink-tertiary italic">Already saved.</div>
                    ) : (
                      <ConfirmationCard
                        intent_type={m.intent_type}
                        items={m.items}
                        onConfirm={() => confirmItems(m.id, m.intent_type, m.items)}
                        onCancel={() =>
                          setMessages((prev) =>
                            prev.map((x) =>
                              x.id === m.id && x.kind === "confirmation" ? { ...x, handled: true } : x
                            )
                          )
                        }
                      />
                    )}
                  </div>
                </motion.div>
              );
            }
            if (m.kind === "recommendation") {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="w-full max-w-[92%] min-w-0">
                    <RecommendationCards
                      options={m.options}
                      intro_text={m.intro_text}
                      disclaimer={m.disclaimer}
                    />
                  </div>
                </motion.div>
              );
            }
            if (m.kind === "rebalance_plan") {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="w-full max-w-[95%] min-w-0">
                    <RebalancePlanCard
                      plan_id={m.plan_id}
                      plan_summary={m.plan_summary}
                      phases={m.phases}
                      expected_after={m.expected_after}
                      disclaimer={m.disclaimer}
                      intro_text={m.intro_text}
                    />
                  </div>
                </motion.div>
              );
            }
            return (
              <MessageBubble
                key={m.id}
                message={m as ChatMessage}
                showReplies={!thinking && m.id === lastAssistantTextId}
                onPickReply={handleSend}
              />
            );
          })}
          {thinking && (
            <motion.div key="typing" className="flex justify-start">
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-line-soft px-6 py-4 bg-cream/40 shrink-0 min-w-0">
        <ChatInput
          onSend={handleSend}
          disabled={thinking || confirmingIndex !== null}
        />
      </div>
    </div>
  );
}
