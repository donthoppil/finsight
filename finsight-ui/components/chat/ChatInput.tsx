"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

export function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Listen for prefill events fired by alert / plan-card "Talk to coach" / "I bought it" buttons.
  // Two modes:
  //   • default: fill the input + focus, user reviews then hits Enter
  //   • autoSend: fire onSend immediately, skip the manual confirmation step
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ text: string; autoSend?: boolean }>;
      if (!ce.detail?.text) return;

      if (ce.detail.autoSend && !disabled) {
        onSend(ce.detail.text);
        setValue("");
        return;
      }

      setValue(ce.detail.text);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(ce.detail.text.length, ce.detail.text.length);
        }
      });
    };
    window.addEventListener("chat-prefill", handler as EventListener);
    return () => window.removeEventListener("chat-prefill", handler as EventListener);
  }, [onSend, disabled]);

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-full border border-line-soft shadow-card min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask anything about your portfolio…"
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent px-4 py-2 outline-none text-[15px] text-ink-primary placeholder:text-ink-tertiary"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="w-10 h-10 rounded-full bg-forest-primary hover:bg-forest-deep disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition-all hover:translate-y-[-1px]"
        aria-label="Send"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
