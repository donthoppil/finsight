# Finsight

A conversational portfolio coach for non-savvy investors. Ask in plain English ("how am I doing?", "what if the market drops 20%?", "what should I invest in?") and get answers grounded in your real holdings — never invented numbers.

## What it does

- **Real-time portfolio dashboard** — live prices, allocation donut, holdings table.
- **Risk Snapshot** — concentration, stock-heaviness, and volatility scored 0–100 with plain-English labels and bad-month / crash dollar estimates.
- **Tune my plan** — slide-in profile panel for goal, timeline, contributions, income, emergency fund. Drives all advice.
- **Conversational coach** — Claude-powered chat that understands intents (add a holding, ask a question, run a scenario, get fund picks, rebalance) and routes accordingly. Detects profile updates ("I just got a raise") and saves them.
- **What-If scenarios** — live, debounced sliders for market moves, inflation, withdrawal, rate changes, and income changes. Numbers come from a Python math service, not synthesized.
- **Fund recommendations** — bucketed picks from a curated whitelist based on your risk + timeline.
- **Rebalance engine** — multi-phase plan to fix concentration, with a one-click "I bought it" loop into chat.

## Architecture

```
┌────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Next.js App       │     │  Python FastAPI      │     │  yfinance       │
│  (finsight-ui/)    │────▶│  Math Service        │────▶│  (Yahoo)        │
│  - UI + chat       │     │  (apps/math-service) │     └─────────────────┘
│  - API routes      │     │  - Prices, history   │
│  - Intent router   │     │  - Risk snapshot     │
└────────┬───────────┘     │  - Scenarios (5)     │
         │                 │  - Rebalance         │
         ▼                 └──────────────────────┘
┌────────────────────┐
│  Anthropic Claude  │   ┌──────────────┐
│  (Haiku 4.5)       │   │  Supabase    │
│  - Intent classify │   │  - users     │
│  - Generate advice │   │  - holdings  │
│  - Profile detect  │   │  - messages  │
└────────────────────┘   └──────────────┘
```

## Stack

| Layer        | Tech                                                         |
|--------------|--------------------------------------------------------------|
| UI           | Next.js 14 App Router, TypeScript, Tailwind, Framer Motion, Recharts |
| State        | Zustand                                                      |
| Backend math | Python 3.13, FastAPI, yfinance, numpy, cachetools            |
| LLM          | Anthropic Claude (`claude-haiku-4-5-20251001`)               |
| Database     | Supabase (Postgres)                                          |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/donthoppil/finsight.git
cd finsight

# Frontend
cd finsight-ui
npm install

# Math service
cd ../apps/math-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment variables

Create `finsight-ui/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
MATH_SERVICE_URL=http://127.0.0.1:8765
```

### 3. Database

Run the SQL migrations in `finsight-ui/supabase/` against your Supabase project, in order:
1. `schema.sql`
2. `fix-rls.sql`
3. `phase-2-5-migration.sql`
4. `phase-2-9-migration.sql`

### 4. Run

```bash
# Terminal 1 — math service
cd apps/math-service
source .venv/bin/activate
uvicorn main:app --reload --port 8765

# Terminal 2 — Next.js
cd finsight-ui
npm run dev
```

Open http://localhost:3000.

## Repo layout

```
.
├── apps/
│   └── math-service/        Python FastAPI service (yfinance, scenarios, risk)
│       ├── main.py
│       ├── requirements.txt
│       └── data/fund_whitelist.json
│
└── finsight-ui/             Next.js app
    ├── app/
    │   ├── api/             route handlers (chat, scenario, recommend, rebalance, ...)
    │   └── dashboard/       main UI
    ├── components/          dashboard, chat, scenarios, profile, recommendations
    ├── lib/
    │   ├── llm.ts           Claude wrapper (advice + profile-update detection)
    │   ├── intent-router.ts Claude-powered intent classifier
    │   ├── store.ts         Zustand stores
    │   └── ...
    └── supabase/            SQL migrations
```

## Key design choices

- **No invented numbers.** The system prompt forbids it; advice is grounded in live yfinance data passed in-context.
- **Intent router, not function-calling.** Cheaper and more predictable than tool-use SDKs at this scale.
- **Profile-update detection runs only on `unclear` intent** — saves ~33% of LLM calls per message.
- **Scenarios are debounced (300ms) and live.** Every slider tweak hits the math service; the UI updates incrementally.
- **Plain English everywhere.** No "alpha", "beta", "Sharpe" without translation. One analogy per response, max.

## License

Private.
