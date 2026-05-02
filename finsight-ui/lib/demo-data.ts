export const DEMO_USER = {
  name: "Priya",
  email: "priya@demo.com",
  age: 32,
  goal: "Buy a house",
  goal_timeline_years: 2,
  risk_feel: "nervous",
  amount_invested: 54200,
};

export type AssetClass = "stock" | "fund";

export type Holding = {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  change: number;
  asset_class: AssetClass;
  description: string;
};

export const DEMO_PORTFOLIO: Holding[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 25,
    price: 178.5,
    change: 1.2,
    asset_class: "stock",
    description:
      "Apple makes iPhones, Macs, AirPods, and the App Store. It's one of the biggest companies in the world — pretty steady, but it's still just one company.",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 15,
    price: 412.3,
    change: 0.8,
    asset_class: "stock",
    description:
      "Microsoft makes Windows, Word, Excel, Xbox, and runs a big chunk of the internet behind the scenes. Huge and pretty steady — but still one company.",
  },
  {
    symbol: "VTI",
    name: "Vanguard Total Stock",
    shares: 30,
    price: 268.4,
    change: -0.3,
    asset_class: "fund",
    description:
      "A bundle that owns a tiny piece of almost every US company — around 4,000 of them in one buy. Very spread out, very cheap, and a common 'safe starter' pick.",
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ",
    shares: 10,
    price: 488.2,
    change: 1.5,
    asset_class: "fund",
    description:
      "A bundle of 100 mostly-tech companies — Apple, Microsoft, Nvidia, Tesla, that crowd. Can grow fast in good years, can drop hard in bad ones.",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    shares: 5,
    price: 245.6,
    change: -2.1,
    asset_class: "stock",
    description:
      "Tesla makes electric cars, solar panels, and home batteries. The price jumps around a lot — exciting on good days, stressful on bad ones.",
  },
  {
    symbol: "SCHD",
    name: "Schwab US Dividend",
    shares: 22,
    price: 78.4,
    change: 0.4,
    asset_class: "fund",
    description:
      "A bundle of about 100 reliable US companies that send you a small cash payout every few months. Slower-growing, but calmer than chasing big winners.",
  },
  {
    symbol: "VOO",
    name: "Vanguard S&P 500",
    shares: 12,
    price: 512.6,
    change: 0.6,
    asset_class: "fund",
    description:
      "A bundle that owns the 500 biggest US companies in one buy. The 'plain vanilla' way to invest in the US — boring in a good way.",
  },
];

export type ChatCitation = {
  source: string;
  claim: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  proactive?: boolean;
  text: string;
  suggested_replies?: string[];
  citations?: ChatCitation[];
  confidence?: "high" | "medium" | "low";
};

export const PROACTIVE_MESSAGE: ChatMessage = {
  id: "proactive-1",
  role: "assistant",
  proactive: true,
  text:
    "Hi Priya — I noticed your portfolio drifted from your target this month. Your house goal is in 2 years, but ~36% of your money is sitting in single stocks. Want to talk about what we should do?",
  suggested_replies: ["Yes, what should I do?", "What does this mean?", "Not now, thanks"],
  citations: [],
  confidence: "high",
};

export type Scenario = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
};

export const SCENARIOS: Scenario[] = [
  { id: "market_change", icon: "bar-chart", title: "Market moves", subtitle: "A drop or a rally" },
  { id: "inflation", icon: "flame", title: "Inflation", subtitle: "Costs rising over time" },
  { id: "withdrawal", icon: "wallet", title: "Need to withdraw", subtitle: "Cash out for a planned expense" },
  { id: "rate_change", icon: "percent", title: "Interest rate change", subtitle: "Fed tightens or eases" },
  { id: "income_change", icon: "briefcase", title: "Income changes", subtitle: "Raise, pay cut, or job loss" },
];

export type ScenarioResult = {
  scenario_id: string;
  before_value: number;
  after_no_action_value: number;
  after_with_action_value: number;
  loss_no_action_pct: number;
  loss_with_action_pct: number;
  current_allocation: { stock: number; fund: number };
  recommended_allocation: { stock: number; fund: number };
  actions: string[];
  transparency: {
    goal_alignment: string;
    cost_to_execute: string;
    tax_implications: string;
    do_nothing: string;
    do_act: string;
    confidence: "high" | "medium" | "low";
    sources: string[];
  };
};

export const SAMPLE_SCENARIO_RESULT: ScenarioResult = {
  scenario_id: "market_drop_20",
  before_value: 54200,
  after_no_action_value: 43360,
  after_with_action_value: 50016,
  loss_no_action_pct: -20,
  loss_with_action_pct: -7.7,
  current_allocation: { stock: 36, fund: 64 },
  recommended_allocation: { stock: 15, fund: 85 },
  actions: [
    "Move ~$3,500 out of AAPL and TSLA into your VOO and VTI funds",
    "Hold cash equal to 3 months of expenses — about $12,000",
    "Keep VTI as your long-term core holding",
  ],
  transparency: {
    goal_alignment:
      "Your house goal is in 2 years. With this much in single stocks, a market drop right before you buy could leave you short. Broad-market funds spread the risk.",
    cost_to_execute: "$0 in trading fees (your ETFs trade commission-free). Estimated bid-ask spread cost: ~$8.",
    tax_implications:
      "Selling AAPL would trigger ~$340 in short-term capital gains tax. We'd recommend selling from your TSLA position first — smaller gain, more tax-efficient.",
    do_nothing: "In this scenario, you'd lose about $10,840 (−20%).",
    do_act: "Estimated loss reduces to about $4,200 (−7.7%). You stay on track for your 2028 house goal.",
    confidence: "high",
    sources: [
      "SEC Investor Bulletin: Asset Allocation",
      "Vanguard ETF prospectus",
      "S&P 500 historical drawdowns",
    ],
  },
};

export type FakeChatResponse = {
  text: string;
  suggested_replies: string[];
  citations: ChatCitation[];
  confidence: "high" | "medium" | "low";
};

export const FAKE_CHAT_RESPONSES: Record<string, FakeChatResponse> = {
  yes: {
    text:
      "Great. Before I suggest anything, can I check one thing? When you said 'buying a house in 2 years' — is that a fixed plan (loan locked in, date set) or flexible (could become 3 years if needed)?",
    suggested_replies: ["Fixed, locked in", "Flexible", "Not sure yet"],
    citations: [],
    confidence: "high",
  },
  fixed: {
    text:
      "Got it. Here's my read in plain English: stocks can drop 20% in a bad month, and with a fixed date, you can't wait it out. My suggestion: gradually shift about $3,500 from AAPL and TSLA into your VOO and VTI funds over the next 3 months — not all at once.",
    suggested_replies: ["Show me the plan", "What if I wait?", "Explain how VOO works"],
    citations: [
      { source: "SEC Investor Bulletin", claim: "asset allocation guidance" },
      { source: "Vanguard VOO prospectus", claim: "fund characteristics" },
    ],
    confidence: "high",
  },
  default: {
    text: "I can help with that. Could you tell me a little more about what you're trying to figure out?",
    suggested_replies: ["Show me my portfolio", "What if I lose my job?", "What's my risk level?"],
    citations: [],
    confidence: "medium",
  },
};

// Chat-based what-if responses — for scenarios that don't match a tab card
// Each response mirrors the structure: impact -> recommendation -> nudge to deep-dive
export const WHATIF_CHAT_RESPONSES: Record<string, FakeChatResponse> = {
  tsla: {
    text:
      "Quick math on a bad TSLA day:\n\nYou hold 5 shares (~$1,228). If Tesla drops 50% tomorrow you'd lose about $614 — only ~1.9% of your total money. So a single bad TSLA day isn't a goal-killer.\n\nThe bigger lesson: TSLA swings hard. If you ever cross ~$5,000 in any single stock, I'll flag it. Want me to set that rule?",
    suggested_replies: ["Yes, set the rule", "What about my Apple position?", "Show me the full What-If"],
    citations: [
      { source: "TSLA 5-yr volatility (~52%)", claim: "single-stock concentration risk" },
    ],
    confidence: "medium",
  },
  crypto: {
    text:
      "Crypto's outside what I track today, but here's the honest take:\n\nWith a 2-year house goal, I'd keep crypto under 5% of total — call it a 'play money' bucket, not retirement. With $32,700 saved, that's a max of ~$1,600.\n\nIf you really want to add some, start small ($500), use cash you'd be OK losing, and don't pull it from your VOO position.",
    suggested_replies: ["What's a safer add?", "How does VOO compare?", "Show me what's in my portfolio"],
    citations: [],
    confidence: "medium",
  },
  sell_all: {
    text:
      "Selling everything would do two things:\n\n1) Lock in a tax bill — rough estimate ~$480 in short-term capital gains based on your gains so far this year.\n2) Move you fully to cash, which feels safe but loses ~3% per year to inflation.\n\nIf the real worry is 'market crash', a softer version is just shifting from single stocks to broad funds (AAPL/TSLA → VOO). Same protection, way less tax. Want me to walk through that?",
    suggested_replies: ["Yes, walk through that", "What if I hold cash for 6 months?", "Just sell my single stocks"],
    citations: [
      { source: "IRS short-term capital gains rates", claim: "tax estimate basis" },
    ],
    confidence: "high",
  },
  retire: {
    text:
      "Quick read: if your goal flips from 'house in 2 years' to retiring early, the math changes a lot.\n\nLong horizon = you can take MORE risk, not less. You'd want more VOO/QQQ (growth) and less cash. With $32,700 + steady contributions, you'd need 25–30 years of compounding to hit a comfortable retirement number.\n\nWant me to update your goal so I plan around that instead?",
    suggested_replies: ["Update my goal", "What's a comfortable retirement number?", "Stay with the house goal"],
    citations: [
      { source: "FIRE community baseline (4% rule)", claim: "retirement target heuristic" },
    ],
    confidence: "medium",
  },
  rate_hike: {
    text:
      "If interest rates jump 2%, here's roughly what happens to your portfolio:\n\n• Your fund holdings (VTI, VOO, QQQ, SCHD) — short-term hit of maybe 5–10%, then they recover over a year or two.\n• Single stocks (AAPL, MSFT, TSLA) — same direction, but TSLA usually amplifies it.\n• Estimated total impact: ~$2,500 paper loss in the first 3 months, mostly recovering by month 12.\n\nWith a 2-year goal, that recovery window is tight. Worth trimming TSLA before hike rumors get serious.",
    suggested_replies: ["Trim TSLA", "What if it's only 1%?", "Check the full What-If tab"],
    citations: [
      { source: "Historical Fed rate-hike cycles", claim: "equity drawdown range" },
    ],
    confidence: "medium",
  },
  generic_whatif: {
    text:
      "Good question — I can run a rough what-if right here.\n\nFor a quick read, just name it in plain English (e.g., 'what if SCHD cuts its dividend', 'what if I add $10K', 'what if my goal is 5 years').\n\nFor full numbers with trading + tax costs, the 'What If?' tab has a deeper flow with side-by-side donuts and source citations.",
    suggested_replies: ["What if Tesla drops 50%?", "What if I sell everything?", "What if I add crypto?"],
    citations: [],
    confidence: "high",
  },
};

export function matchFakeResponse(input: string): FakeChatResponse {
  const lower = input.toLowerCase();

  // Quick scripted answers from the original demo flow
  if (lower.includes("yes")) return FAKE_CHAT_RESPONSES.yes;
  if (lower.includes("fixed")) return FAKE_CHAT_RESPONSES.fixed;

  // What-if pattern: any phrasing that smells like a scenario question
  const isWhatIf = /what.?if|what would happen|imagine if|suppose|let's say/.test(lower);

  if (isWhatIf) {
    if (/\btsla\b|tesla/.test(lower)) return WHATIF_CHAT_RESPONSES.tsla;
    if (/crypto|bitcoin|btc|eth\b|ethereum/.test(lower)) return WHATIF_CHAT_RESPONSES.crypto;
    if (/sell\s+(everything|all|out)|cash\s+out|liquidate/.test(lower))
      return WHATIF_CHAT_RESPONSES.sell_all;
    if (/retire|retirement|stop working|fire\b/.test(lower))
      return WHATIF_CHAT_RESPONSES.retire;
    if (/rate|fed|interest/.test(lower)) return WHATIF_CHAT_RESPONSES.rate_hike;
    return WHATIF_CHAT_RESPONSES.generic_whatif;
  }

  return FAKE_CHAT_RESPONSES.default;
}

export const THINKING_STEPS = [
  { icon: "📊", text: "Looked at your 7 investments", delay: 0 },
  { icon: "📈", text: "Pulled today's prices", delay: 600 },
  { icon: "🧮", text: "Checked how wobbly your money is", delay: 1200 },
  { icon: "📚", text: "Read the latest SEC guidance", delay: 1900 },
  { icon: "✨", text: "Wrote a plan and double-checked it", delay: 2700 },
];
