// Plain-English helpers for the user profile.
// Used by the TuneMyPlanPanel summary card and by Gemini context.

export type UserProfile = {
  id?: string;
  email?: string | null;
  name?: string | null;
  age?: number | null;
  goal?: string | null;
  goal_timeline_years?: number | null;
  risk_feel?: string | null;
  amount_invested?: number | null;
  income_range?: string | null;
  account_type?: string | null;
  has_emergency_fund?: string | null;
  monthly_contribution?: number | null;
  fund_preference?: string | null;
  concerns?: string | null;
  profile_updated_at?: string | null;
  [key: string]: unknown;
};

const GOAL_LABEL: Record<string, string> = {
  house: "a house",
  retirement: "retirement",
  education: "education",
  wealth: "growing your wealth",
  emergency: "an emergency fund",
  other: "your goal",
};

const RISK_LABEL: Record<string, string> = {
  fine: "You're comfortable with market ups and downs.",
  nervous: "You'd feel nervous if your portfolio dropped 20%, but would hold on.",
  panic: "You'd panic if your portfolio dropped 20%.",
  sell: "You'd want to sell everything if your portfolio dropped 20%.",
};

const ACCOUNT_LABEL: Record<string, string> = {
  brokerage: "a regular brokerage account",
  "401k": "your 401(k)",
  ira: "an IRA",
  mix: "a mix of brokerage, 401(k), and IRA accounts",
};

const EMERGENCY_LABEL: Record<string, string> = {
  yes: "You have an emergency fund — good foundation.",
  partial: "You have some emergency savings but not a full 3–6 months.",
  no: "You don't have an emergency fund yet — that's worth building before aggressive investing.",
};

const INCOME_LABEL: Record<string, string> = {
  under_50k: "You make under $50K a year.",
  "50_100k": "You make between $50K and $100K a year.",
  "100_200k": "You make between $100K and $200K a year.",
  over_200k: "You make over $200K a year.",
};

const FUND_PREF_LABEL: Record<string, string> = {
  etf: "You prefer ETFs.",
  mutual_fund: "You prefer mutual funds.",
  either: "You're fine with either ETFs or mutual funds.",
};

export function generateProfileSummary(profile: UserProfile | null | undefined): string {
  if (!profile) {
    return "I don't have much info about you yet. Fill in any section below to help me give better advice.";
  }

  const parts: string[] = [];

  if (profile.goal && profile.goal_timeline_years) {
    const years = profile.goal_timeline_years;
    const yearLabel =
      years === 1 ? "1 year" : years < 1 ? `${Math.round(years * 12)} months` : `${years} years`;
    parts.push(
      `You're saving for ${GOAL_LABEL[profile.goal] || profile.goal} in about ${yearLabel}.`
    );
  } else if (profile.goal) {
    parts.push(`You're saving for ${GOAL_LABEL[profile.goal] || profile.goal}.`);
  }

  if (profile.risk_feel && RISK_LABEL[profile.risk_feel]) {
    parts.push(RISK_LABEL[profile.risk_feel]);
  }

  if (profile.amount_invested && profile.amount_invested > 0) {
    parts.push(`You have $${Number(profile.amount_invested).toLocaleString()} invested right now.`);
  }

  if (profile.monthly_contribution && profile.monthly_contribution > 0) {
    parts.push(
      `You add about $${Number(profile.monthly_contribution).toLocaleString()} each month.`
    );
  }

  if (profile.account_type && ACCOUNT_LABEL[profile.account_type]) {
    parts.push(`Your money lives in ${ACCOUNT_LABEL[profile.account_type]}.`);
  }

  if (profile.income_range && INCOME_LABEL[profile.income_range]) {
    parts.push(INCOME_LABEL[profile.income_range]);
  }

  if (profile.has_emergency_fund && EMERGENCY_LABEL[profile.has_emergency_fund]) {
    parts.push(EMERGENCY_LABEL[profile.has_emergency_fund]);
  }

  if (profile.fund_preference && FUND_PREF_LABEL[profile.fund_preference]) {
    parts.push(FUND_PREF_LABEL[profile.fund_preference]);
  }

  if (profile.concerns && profile.concerns.trim()) {
    parts.push(`Things on your mind: "${profile.concerns.trim()}"`);
  }

  if (parts.length === 0) {
    return "I don't have much info about you yet. Fill in any section below to help me give better advice.";
  }

  return parts.join(" ");
}

const COMPLETENESS_FIELDS: (keyof UserProfile)[] = [
  "goal",
  "goal_timeline_years",
  "risk_feel",
  "amount_invested",
  "monthly_contribution",
  "account_type",
  "has_emergency_fund",
  "income_range",
  "fund_preference",
];

export function profileCompletenessPct(profile: UserProfile | null | undefined): number {
  if (!profile) return 0;
  const filled = COMPLETENESS_FIELDS.filter((f) => {
    const v = profile[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

export function getMissingProfileFields(profile: UserProfile | null | undefined): string[] {
  if (!profile) return ["everything"];
  const checks: { field: keyof UserProfile; label: string }[] = [
    { field: "goal", label: "their goal" },
    { field: "goal_timeline_years", label: "their timeline" },
    { field: "risk_feel", label: "how they feel about risk" },
    { field: "amount_invested", label: "their total invested" },
    { field: "income_range", label: "their income range (affects tax treatment)" },
    { field: "account_type", label: "their account type (brokerage vs 401k vs IRA)" },
    { field: "has_emergency_fund", label: "whether they have an emergency fund" },
  ];
  return checks
    .filter((c) => {
      const v = profile[c.field];
      return v === null || v === undefined || v === "";
    })
    .map((c) => c.label);
}
