"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/demo-data";
import { Sparkles } from "lucide-react";
import { SuggestedReplies } from "./SuggestedReplies";

export function MessageBubble({
  message,
  onPickReply,
  showReplies,
}: {
  message: ChatMessage;
  onPickReply?: (text: string) => void;
  showReplies?: boolean;
}) {
  const isBot = message.role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex w-full min-w-0 ${isBot ? "justify-start" : "justify-end"}`}
    >
      <div className="max-w-[72%] min-w-0">
        {isBot && message.proactive && (
          <div className="flex items-center gap-1.5 mb-1.5 text-xs text-warm-amber font-medium">
            <Sparkles className="w-3 h-3" />
            <span>I noticed something</span>
          </div>
        )}

        <div
          className={`px-4 py-3 ${
            isBot
              ? "bg-forest-pale text-ink-primary rounded-2xl rounded-bl-md"
              : "bg-white border border-line-soft text-ink-primary rounded-2xl rounded-br-md"
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">
            {message.text}
          </p>
        </div>

        {isBot && (message.confidence || (message.citations && message.citations.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {message.confidence && (
              <span className="text-xs bg-forest-mint text-forest-primary px-2 py-0.5 rounded-full font-medium">
                Confidence: {message.confidence}
              </span>
            )}
            {message.citations?.map((c, i) => (
              <span
                key={i}
                className="text-xs bg-cream-soft text-ink-secondary px-2 py-0.5 rounded-full border border-line-soft"
                title={c.claim}
              >
                [{c.source}]
              </span>
            ))}
          </div>
        )}

        {isBot && showReplies && message.suggested_replies && onPickReply && (
          <SuggestedReplies replies={message.suggested_replies} onPick={onPickReply} />
        )}
      </div>
    </motion.div>
  );
}
