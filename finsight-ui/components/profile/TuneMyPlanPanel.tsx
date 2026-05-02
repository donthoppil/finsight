"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  ChevronDown,
  Target,
  HeartPulse,
  Wallet,
  Building2,
  ShieldCheck,
  Sliders,
  MessageSquare,
  Check,
  Home,
  Palmtree,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { usePanelStore, useProfile, useThinking, usePortfolio } from "@/lib/store";
import {
  generateProfileSummary,
  profileCompletenessPct,
  type UserProfile,
} from "@/lib/profile-summary";

// ===========================================================
// Helpers
// ===========================================================

function useDebouncedSave() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const patch = useProfile((s) => s.patch);
  const pushThinking = useThinking((s) => s.push);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  const save = (field: string, value: unknown) => {
    const timer = timers.current.get(field);
    if (timer) clearTimeout(timer);
    const next = setTimeout(async () => {
      try {
        await patch({ [field]: value } as Partial<UserProfile>);
        toast.success("Plan updated", { duration: 1500 });
        pushThinking("📝", `Updated: ${prettyFieldName(field)}`);
        setSavedFields((prev) => {
          const copy = new Set(prev);
          copy.add(field);
          return copy;
        });
        setTimeout(() => {
          setSavedFields((prev) => {
            const copy = new Set(prev);
            copy.delete(field);
            return copy;
          });
        }, 1800);
      } catch {
        toast.error("Couldn't save — try again");
      }
    }, 500);
    timers.current.set(field, next);
  };

  return { save, savedFields };
}

function prettyFieldName(field: string): string {
  const map: Record<string, string> = {
    goal: "your goal",
    goal_timeline_years: "your timeline",
    risk_feel: "how you feel about risk",
    amount_invested: "amount invested",
    monthly_contribution: "monthly contribution",
    account_type: "account type",
    has_emergency_fund: "emergency fund",
    income_range: "income range",
    fund_preference: "fund preference",
    concerns: "your notes",
  };
  return map[field] ?? field;
}

// ===========================================================
// Generic primitives
// ===========================================================

function CardOption({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start gap-3 ${
        selected
          ? "bg-forest-mint border-forest-soft"
          : "bg-white border-line-soft hover:bg-forest-pale hover:border-forest-soft/40"
      }`}
    >
      {Icon && (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            selected ? "bg-forest-primary text-white" : "bg-cream-soft text-forest-primary"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink-primary leading-snug">{title}</div>
        {subtitle && <div className="text-xs text-ink-tertiary mt-0.5">{subtitle}</div>}
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-forest-primary text-white flex items-center justify-center shrink-0">
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  defaultOpen,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-white border border-line-soft rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-cream-soft/40 transition-colors"
        aria-expanded={open}
        aria-controls={`section-${id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forest-pale text-forest-primary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-serif text-base text-ink-primary">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-ink-secondary" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`section-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-line-soft/60">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldLabel({ children, saved }: { children: ReactNode; saved?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-3 first:mt-0">
      <span className="text-xs font-medium text-ink-secondary">{children}</span>
      <AnimatePresence>
        {saved && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-forest-primary flex items-center gap-1"
          >
            <Check className="w-3 h-3" strokeWidth={3} /> Saved
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================
// Section bodies
// ===========================================================

const GOAL_OPTIONS = [
  { id: "house", label: "A house", icon: Home },
  { id: "retirement", label: "Retirement", icon: Palmtree },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "wealth", label: "Just growing my wealth", icon: Sparkles },
  { id: "other", label: "Something else", icon: HelpCircle },
];

function GoalsSection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  // Local mirror of the slider so dragging updates the UI instantly.
  // Sync from profile whenever it changes externally (chat update, panel reopen).
  const remoteYears = (profile?.goal_timeline_years as number | null) ?? 2;
  const [years, setYears] = useState<number>(remoteYears);
  useEffect(() => {
    setYears(remoteYears);
  }, [remoteYears]);

  const targetYear = new Date().getFullYear() + (years || 0);

  return (
    <>
      <FieldLabel saved={saved.has("goal")}>What are you saving for?</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        {GOAL_OPTIONS.map((g) => (
          <CardOption
            key={g.id}
            selected={profile?.goal === g.id}
            onClick={() => onSave("goal", g.id)}
            icon={g.icon}
            title={g.label}
          />
        ))}
      </div>

      <FieldLabel saved={saved.has("goal_timeline_years")}>When do you need it?</FieldLabel>
      <div className="bg-cream-soft/40 rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-ink-tertiary">In about</span>
          <span className="font-serif text-2xl text-ink-primary tabular-nums leading-none">
            {years} {years === 1 ? "year" : "years"}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={40}
          value={years}
          onChange={(e) => {
            const v = Number(e.target.value);
            setYears(v);
            onSave("goal_timeline_years", v);
          }}
          className="range-warm"
        />
        <div className="flex justify-between mt-1 text-[10px] text-ink-tertiary">
          <span>1 yr</span>
          <span>around {targetYear}</span>
          <span>40 yrs</span>
        </div>
      </div>
    </>
  );
}

// Self-contained money input that mirrors the saved value while letting
// the user type freely (no controlled-input lag).
function MoneyInput({
  field,
  value,
  onSave,
}: {
  field: string;
  value: number;
  onSave: (f: string, v: unknown) => void;
}) {
  const [local, setLocal] = useState<number>(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
    const v = cleaned ? parseFloat(cleaned) : 0;
    setLocal(Number.isFinite(v) ? v : 0);
    onSave(field, Number.isFinite(v) ? v : 0);
  };

  return (
    <div className="flex items-baseline gap-1.5 bg-cream-soft/40 rounded-xl p-3">
      <span className="font-serif text-xl text-ink-tertiary">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={local.toLocaleString("en-US")}
        onChange={handle}
        className="font-serif text-2xl bg-transparent text-forest-primary w-full outline-none tabular-nums"
      />
    </div>
  );
}

const RISK_OPTIONS = [
  { id: "fine", label: "I'd be fine, that's normal", icon: Smile },
  { id: "nervous", label: "I'd be nervous but hold on", icon: Meh },
  { id: "panic", label: "I'd panic", icon: Frown },
  { id: "sell", label: "I'd sell everything", icon: AlertTriangle },
];

function RiskSection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <FieldLabel saved={saved.has("risk_feel")}>
        Imagine your investments dropped 20% tomorrow. How would you feel?
      </FieldLabel>
      <div className="space-y-2">
        {RISK_OPTIONS.map((r) => (
          <CardOption
            key={r.id}
            selected={profile?.risk_feel === r.id}
            onClick={() => onSave("risk_feel", r.id)}
            icon={r.icon}
            title={r.label}
          />
        ))}
      </div>
    </>
  );
}

function MoneySection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  // Read the live portfolio total straight from the dashboard's store
  // so this section always mirrors what's in the holdings.
  const liveTotal = usePortfolio((s) => s.snapshot?.total ?? 0);
  const liveCount = usePortfolio((s) => s.snapshot?.holdings.length ?? 0);

  return (
    <>
      <FieldLabel>How much do you have invested right now?</FieldLabel>
      <div className="bg-cream-soft/40 rounded-xl p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl text-ink-tertiary">$</span>
          <span className="font-serif text-2xl text-forest-primary tabular-nums">
            {liveTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </span>
          <span className="ml-auto text-[10px] text-ink-tertiary uppercase tracking-wide">
            Live · {liveCount} {liveCount === 1 ? "position" : "positions"}
          </span>
        </div>
        <p className="text-xs text-ink-tertiary mt-1">
          This mirrors your holdings on the dashboard. Tell the coach about a buy/sell to update it.
        </p>
      </div>

      <FieldLabel saved={saved.has("monthly_contribution")}>
        How much can you add each month?
      </FieldLabel>
      <MoneyInput
        field="monthly_contribution"
        value={Number(profile?.monthly_contribution ?? 0)}
        onSave={onSave}
      />
      <p className="text-xs text-ink-tertiary mt-1">(or $0 if you can&apos;t right now)</p>
    </>
  );
}

const ACCOUNT_OPTIONS = [
  { id: "brokerage", label: "Regular brokerage account", subtitle: "Robinhood, Schwab, Fidelity, etc." },
  { id: "401k", label: "401(k) through my employer", subtitle: "Workplace retirement account" },
  { id: "ira", label: "IRA", subtitle: "Traditional or Roth" },
  { id: "mix", label: "A mix of these", subtitle: "Some of each" },
];

function AccountSection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <FieldLabel saved={saved.has("account_type")}>
        What kind of account is your money in?
      </FieldLabel>
      <div className="space-y-2">
        {ACCOUNT_OPTIONS.map((a) => (
          <CardOption
            key={a.id}
            selected={profile?.account_type === a.id}
            onClick={() => onSave("account_type", a.id)}
            title={a.label}
            subtitle={a.subtitle}
          />
        ))}
      </div>
    </>
  );
}

const EMERGENCY_OPTIONS = [
  { id: "yes", label: "Yes, I'm covered", subtitle: "3–6 months of expenses in cash" },
  { id: "partial", label: "Partial — I have some saved", subtitle: "Less than 3 months" },
  { id: "no", label: "No, not yet", subtitle: "I'll build this" },
];

function EmergencySection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <FieldLabel saved={saved.has("has_emergency_fund")}>
        Do you have an emergency fund (3–6 months of expenses in cash)?
      </FieldLabel>
      <div className="space-y-2">
        {EMERGENCY_OPTIONS.map((o) => (
          <CardOption
            key={o.id}
            selected={profile?.has_emergency_fund === o.id}
            onClick={() => onSave("has_emergency_fund", o.id)}
            title={o.label}
            subtitle={o.subtitle}
          />
        ))}
      </div>
    </>
  );
}

const INCOME_OPTIONS = [
  { id: "under_50k", label: "Under $50K" },
  { id: "50_100k", label: "$50K – $100K" },
  { id: "100_200k", label: "$100K – $200K" },
  { id: "over_200k", label: "Over $200K" },
];

const FUND_PREF_OPTIONS = [
  { id: "etf", label: "ETFs", subtitle: "Lower minimums, trade like stocks" },
  { id: "mutual_fund", label: "Mutual funds", subtitle: "Good for retirement accounts" },
  { id: "either", label: "Either is fine", subtitle: "I don't have a preference" },
];

function PreferencesSection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <FieldLabel saved={saved.has("income_range")}>What&apos;s your income range?</FieldLabel>
      <p className="text-xs text-ink-tertiary mb-2 -mt-1">Helps me suggest funds with the right tax treatment.</p>
      <div className="grid grid-cols-2 gap-2">
        {INCOME_OPTIONS.map((o) => (
          <CardOption
            key={o.id}
            selected={profile?.income_range === o.id}
            onClick={() => onSave("income_range", o.id)}
            title={o.label}
          />
        ))}
      </div>

      <FieldLabel saved={saved.has("fund_preference")}>
        Do you prefer ETFs or mutual funds?
      </FieldLabel>
      <div className="space-y-2">
        {FUND_PREF_OPTIONS.map((o) => (
          <CardOption
            key={o.id}
            selected={profile?.fund_preference === o.id}
            onClick={() => onSave("fund_preference", o.id)}
            title={o.label}
            subtitle={o.subtitle}
          />
        ))}
      </div>
    </>
  );
}

function ConcernsSection({
  profile,
  saved,
  onSave,
}: {
  profile: UserProfile | null;
  saved: Set<string>;
  onSave: (f: string, v: unknown) => void;
}) {
  return (
    <>
      <FieldLabel saved={saved.has("concerns")}>
        Tell me anything you want me to consider.
      </FieldLabel>
      <p className="text-xs text-ink-tertiary mb-2 -mt-1">
        Concerns, life changes, things you&apos;re worried about. The coach uses this when giving advice.
      </p>
      <textarea
        rows={4}
        defaultValue={profile?.concerns ?? ""}
        onChange={(e) => onSave("concerns", e.target.value)}
        placeholder="e.g., 'I'm worried about a recession' or 'I want to avoid tech stocks' or 'My partner just lost their job'"
        className="w-full bg-cream-soft/40 border border-line-soft rounded-xl p-3 text-sm text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-forest-soft transition-colors resize-none"
      />
    </>
  );
}

// ===========================================================
// The panel
// ===========================================================

export function TuneMyPlanPanel() {
  const open = usePanelStore((s) => s.tunePanelOpen);
  const close = usePanelStore((s) => s.close);
  const profile = useProfile((s) => s.profile);
  const refreshProfile = useProfile((s) => s.refresh);
  const { save, savedFields } = useDebouncedSave();

  // Hydrate when panel opens; also listen for chat-driven updates.
  useEffect(() => {
    if (open) refreshProfile();
  }, [open, refreshProfile]);

  useEffect(() => {
    const handler = () => refreshProfile();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [refreshProfile]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const completeness = profileCompletenessPct(profile);
  const summary = generateProfileSummary(profile);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tune-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-ink-primary/30 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.aside
            key="tune-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-[480px] bg-cream shadow-card-hover flex flex-col"
            role="dialog"
            aria-label="Tune my plan"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line-soft shrink-0 bg-cream/95 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest-primary text-white flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif text-xl text-ink-primary leading-tight">Tune my plan</div>
                  <div className="text-xs text-ink-tertiary">Auto-saves as you go</div>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-cream-soft hover:bg-line-soft text-ink-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
              {/* Summary card */}
              <div className="bg-forest-pale border border-forest-soft/30 rounded-2xl p-4">
                <p className="text-xs font-medium text-forest-primary uppercase tracking-wide mb-2">
                  What I know about you
                </p>
                <p className="text-sm text-ink-primary leading-relaxed">{summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${completeness}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-forest-primary rounded-full"
                    />
                  </div>
                  <span className="text-xs font-medium text-ink-secondary tabular-nums">
                    {completeness}% complete
                  </span>
                </div>
              </div>

              <Section id="goals" title="Your goals" icon={Target} defaultOpen>
                <GoalsSection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="risk" title="How you feel about risk" icon={HeartPulse}>
                <RiskSection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="money" title="Your money" icon={Wallet}>
                <MoneySection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="account" title="Where your money lives" icon={Building2}>
                <AccountSection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="emergency" title="Your safety net" icon={ShieldCheck}>
                <EmergencySection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="prefs" title="Your preferences" icon={Sliders}>
                <PreferencesSection profile={profile} saved={savedFields} onSave={save} />
              </Section>

              <Section id="concerns" title="Anything else on your mind" icon={MessageSquare}>
                <ConcernsSection profile={profile} saved={savedFields} onSave={save} />
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
