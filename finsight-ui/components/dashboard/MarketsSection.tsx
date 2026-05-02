"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Briefcase, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from "lucide-react";

const POPULAR: string[] = ["SPY", "QQQ", "DIA", "VTI", "NVDA", "GOOGL", "AMZN", "META"];

const FRIENDLY: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  DIA: "Dow Jones",
  IWM: "Russell 2000",
  VTI: "Total US",
  VOO: "S&P 500",
  SCHD: "Dividend",
  NVDA: "Nvidia",
  GOOGL: "Google",
  AMZN: "Amazon",
  META: "Meta",
  AAPL: "Apple",
  MSFT: "Microsoft",
  TSLA: "Tesla",
  BND: "US Bonds",
  GLD: "Gold",
};

type Quote = {
  symbol: string;
  name?: string;
  price: number | null;
  change_pct?: number;
  error?: string;
};

function QuoteRow({ q, highlighted }: { q: Quote; highlighted?: boolean }) {
  const change = q.change_pct ?? 0;
  const positive = change >= 0;
  const friendly = FRIENDLY[q.symbol] ?? q.name ?? q.symbol;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl min-w-0 transition-colors ${
        highlighted ? "bg-forest-pale/40 hover:bg-forest-pale" : "hover:bg-cream-soft"
      }`}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-semibold text-ink-primary tabular-nums leading-tight">
          {q.symbol}
        </span>
        <span className="text-xs text-ink-tertiary truncate mt-0.5">{friendly}</span>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm text-ink-primary tabular-nums font-medium leading-tight">
          {q.price !== null ? `$${q.price.toFixed(2)}` : "—"}
        </span>
        {q.price !== null && (
          <span
            className={`text-xs font-medium tabular-nums mt-0.5 flex items-center gap-0.5 ${
              positive ? "text-forest-primary" : "text-warm-coral"
            }`}
          >
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {positive ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

const POPULAR_DEFAULT_VISIBLE = 3;

export function MarketsSection({ userSymbols }: { userSymbols: string[] }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllPopular, setShowAllPopular] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const symbols = Array.from(new Set([...userSymbols, ...POPULAR]));
      if (symbols.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        });
        if (!res.ok) throw new Error(`prices ${res.status}`);
        const data = (await res.json()) as Quote[];
        if (alive) {
          setQuotes(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[markets] fetch failed:", err);
        if (alive) setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [userSymbols.join(",")]);

  const userQuotes = quotes.filter((q) => userSymbols.includes(q.symbol));
  const popularQuotes = quotes.filter(
    (q) => POPULAR.includes(q.symbol) && !userSymbols.includes(q.symbol)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {userQuotes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2 px-2">
            <Briefcase className="w-3.5 h-3.5" />
            Your holdings
          </div>
          <div className="space-y-1">
            {userQuotes.map((q) => (
              <QuoteRow key={q.symbol} q={q} highlighted />
            ))}
          </div>
        </div>
      )}

      {popularQuotes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary uppercase tracking-wider mb-2 px-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {userQuotes.length > 0 ? "Other popular" : "Popular today"}
          </div>

          {/* First N rows always visible */}
          <div className="space-y-1">
            {popularQuotes.slice(0, POPULAR_DEFAULT_VISIBLE).map((q) => (
              <QuoteRow key={q.symbol} q={q} />
            ))}
          </div>

          {/* Remainder collapses behind a toggle */}
          {popularQuotes.length > POPULAR_DEFAULT_VISIBLE && (
            <>
              <AnimatePresence initial={false}>
                {showAllPopular && (
                  <motion.div
                    key="extra"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 mt-1">
                      {popularQuotes.slice(POPULAR_DEFAULT_VISIBLE).map((q) => (
                        <QuoteRow key={q.symbol} q={q} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowAllPopular((v) => !v)}
                className="mt-2 px-2 flex items-center gap-1 text-xs text-ink-secondary hover:text-forest-primary transition-colors"
              >
                {showAllPopular ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show {popularQuotes.length - POPULAR_DEFAULT_VISIBLE} more
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {loading && quotes.length === 0 && (
        <div className="text-sm text-ink-tertiary px-2 py-4 text-center">Pulling live prices…</div>
      )}

      {!loading && quotes.length === 0 && (
        <div className="text-sm text-ink-tertiary px-2 py-4 text-center leading-relaxed">
          Markets unavailable.<br />
          <span className="text-xs">Check that the math service is running.</span>
        </div>
      )}
    </motion.div>
  );
}
