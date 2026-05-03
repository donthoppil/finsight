# Finsight Project Learning Guide

## 1. Project Snapshot

**Project name:** Finsight

**What it is:** A conversational portfolio coach for beginner or non-technical investors. Users can ask plain-English questions like:

- "How am I doing?"
- "What if the market drops 20%?"
- "What should I invest in?"
- "Help me rebalance"

The product tries to answer with real portfolio context instead of generic finance advice.

The implementation is a hybrid architecture:

- A `Next.js` application acts as the main web app and orchestration backend
- A `Python FastAPI` service performs deterministic finance calculations
- `Supabase` stores user/profile/portfolio state
- `Anthropic Claude Haiku 4.5` interprets user intent and writes the plain-English advice
- `yfinance` supplies market data to the Python service

This is not a pure frontend app and not a single monolithic backend. It is a small multi-service system.

## 2. Core Product Goal

The core idea is to make portfolio analysis feel conversational and understandable for normal people.

Instead of exposing raw analytics only, the app combines:

- live holdings and pricing
- risk scoring
- what-if simulations
- fund suggestions
- rebalance planning
- chat-based portfolio updates

The important product rule is: **do not invent numbers**. The LLM is allowed to explain, summarize, and guide, but the numeric portfolio context is meant to come from actual holdings, actual prices, or rule-based math.

## 3. High-Level Architecture

```text
User
  ->
Next.js UI
  ->
Next.js API routes
  ->
1. Supabase for state
2. Anthropic Claude for intent + wording
3. Python FastAPI math service for price/risk/scenario/rebalance/recommendation calculations
  ->
yfinance / Yahoo market data
```

Another way to think about it:

- `Next.js` is the application brain and request router
- `Supabase` is the memory
- `Claude` is the language layer
- `FastAPI` is the numbers engine

## 4. Tech Stack

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Zustand
- react-resizable-panels

### Backend / Services

- Next.js route handlers as the main web backend
- Supabase JavaScript client
- Anthropic SDK
- Python 3
- FastAPI
- NumPy
- cachetools
- yfinance

## 5. Repository Layout

```text
.
├── README.md
├── PROJECT_LEARNING_GUIDE.md
├── apps/
│   └── math-service/
│       ├── main.py
│       ├── requirements.txt
│       ├── README.md
│       └── data/
│           └── fund_whitelist.json
└── finsight-ui/
    ├── app/
    │   ├── api/
    │   ├── dashboard/
    │   ├── login/
    │   ├── onboarding/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    ├── lib/
    ├── supabase/
    ├── package.json
    └── README.md
```

## 6. Current User Experience

The app currently behaves like a polished demo rather than a production multi-user system.

### Login

- The login page offers a "Login as Demo User (Priya)" button.
- It writes `demo_logged_in=true` to `localStorage`.
- There is no real backend session or Supabase auth flow in the current implementation.

### Onboarding

- After demo login, the user is routed through onboarding if `onboarding_complete` is not set.
- Onboarding is a frontend flow, not a server-authenticated profile creation flow.

### Dashboard

The dashboard is the main product surface. It combines:

- portfolio panel
- risk snapshot
- chat interface
- scenario tabs
- tune-my-plan side panel
- thinking/activity feed

## 7. Frontend Structure

### Routing model

The main pages are:

- `/login`
- `/onboarding`
- `/dashboard`

The root page redirects based on `localStorage` state.

### State management

The frontend uses `Zustand` for client-side state. The major stores are:

- portfolio state
- profile state
- thinking/activity state
- panel open/close state
- risk snapshot state

This is a pragmatic app-level store approach rather than Redux or server-only state.

### UI composition

The dashboard is composed of reusable sections:

- `PortfolioPanel`
- `ThinkingPanel`
- `CenterTabs`
- `ChatInterface`
- `TuneMyPlanPanel`

The portfolio panel shows holdings, allocation, and risk alerts. The chat drives most of the user actions. The side panel lets users set profile fields that change the system's advice.

## 8. Backend Design

There are **two backend layers**.

### Backend layer 1: Next.js route handlers

This is the main application backend.

It is responsible for:

- reading and writing Supabase data
- calling the LLM
- calling the math service
- merging all sources into UI-friendly JSON responses

Key route groups:

- `/api/chat`
- `/api/portfolio`
- `/api/profile`
- `/api/risk`
- `/api/recommendations`
- `/api/rebalance`
- `/api/scenario`
- `/api/prices`
- `/api/activity`

### Backend layer 2: Python math service

This is the deterministic analytics backend.

It is responsible for:

- live price lookup
- historical market data lookup
- risk snapshot computation
- fund recommendation scoring
- rebalance plan generation
- scenario simulation

The reason for the split is architectural clarity:

- language tasks stay in Node/LLM land
- numeric finance tasks stay in Python/rule-based land

## 9. Supabase Data Model

The Supabase schema is intentionally small.

### `users`

Stores profile data and plan context:

- basic identity
- goal
- timeline
- risk feeling
- amount invested
- income range
- account type
- emergency fund status
- monthly contribution
- fund preference
- concerns

### `holdings`

Stores current portfolio positions:

- symbol
- shares
- average cost basis
- asset class

There is a unique constraint per `user_id + symbol`.

### `activities`

Stores portfolio actions:

- buy
- sell
- totals
- realized P&L

This acts like a lightweight audit trail.

### `messages`

Stores chat history:

- role
- content
- metadata

This keeps the conversation from disappearing on refresh and also stores structured metadata for assistant responses.

### `profile_changes`

Added in phase 2.5.

Tracks profile edits over time:

- field changed
- old value
- new value
- changed via panel or chat

### `rebalance_items`

Added in phase 2.9.

Stores user-applied rebalance plans:

- plan ID
- phase number
- ticker
- amount
- estimated shares
- status
- user note

## 10. Authentication and Security Model

This is one of the most important things to understand: **the current implementation is demo-first**.

### What it currently does

- Uses a hardcoded `DEMO_USER_ID`
- Uses `localStorage` flags for demo login/onboarding
- Uses Supabase anon key directly
- Uses open RLS policies for demo writes

### What that means

- There is no real user identity mapping
- There is no ownership isolation between authenticated users
- The app is effectively a single-user demo system with a persistent backend

### Why this was done

For hackathon speed and product demonstration. It lets the team focus on product behavior instead of auth infrastructure.

### Production gaps

For production this would need:

- Supabase Auth or another auth provider
- row-level security scoped to `auth.uid()`
- removal of the hardcoded demo user model
- real session handling
- private service keys or server-only privileged operations where appropriate

## 11. Chat System Design

The chat system is the most interesting part of the app.

### Step 1: Save the raw user message

When the user sends chat text, the app first inserts it into `messages`.

### Step 2: Classify intent

The system sends the user message to Claude using a strict JSON prompt and expects one of these intent shapes:

- `add_holding`
- `update_holding`
- `ask_question`
- `run_scenario`
- `recommend_funds`
- `rebalance`
- `unclear`

This is done in `lib/intent-router.ts`.

This is not OpenAI/Anthropic tool-calling. It is prompt-based structured classification.

### Step 3: Optional profile-update detection

If the message is classified as `unclear`, the system runs a second LLM prompt to see if the user actually revealed new profile information, such as:

- "I just got a raise"
- "I have an emergency fund now"
- "My timeline is 5 years"

If a profile update is detected, it is written into Supabase and logged in `profile_changes`.

This is a clever cost optimization. The profile-update detector only runs for unclear statements instead of every message.

### Step 4: Route by intent

The result depends on the detected intent.

#### `add_holding` or `update_holding`

- fetch live prices for the symbols
- enrich the parsed items
- return a confirmation request to the UI

Then after user confirmation, `/api/portfolio` writes the holdings and activity log.

#### `ask_question`

- load profile
- load holdings
- fetch live prices
- fetch live risk snapshot
- build a large structured context block
- ask Claude to answer in plain English JSON

This is the main "portfolio coach" path.

#### `run_scenario`

- return a scenario redirect payload
- the UI opens the What-If surface

The actual scenario calculation happens separately via `/api/scenario`.

#### `recommend_funds`

- check whether profile has enough data
- call the math service for ranked fund recommendations
- return cards to the UI

#### `rebalance`

- check whether profile has enough data
- call the math service for a multi-phase rebalance plan
- return a structured rebalance card

### Step 5: Save the assistant response

The app also stores the assistant response into `messages`, with metadata.

## 12. Why The LLM Is Used Carefully

The architecture is intentionally conservative about the LLM.

The LLM is mostly used for:

- intent detection
- profile fact extraction
- plain-English portfolio explanation

The LLM is not the main source of truth for:

- prices
- volatility
- drawdowns
- scenario calculations
- fund scoring
- rebalance math

This is important because it reduces hallucination risk and keeps financial numbers anchored in deterministic or live sources.

## 13. Portfolio Backend Flow

The `/api/portfolio` route does two distinct jobs.

### GET `/api/portfolio`

- reads all holdings from Supabase
- fetches live prices from the math service
- computes current values
- computes allocation percentages by asset class
- returns a portfolio snapshot for the UI

### POST `/api/portfolio`

This applies confirmed trade changes.

For buys or add-holding flows:

- if the holding already exists, it updates shares and weighted average cost basis
- if the holding does not exist, it inserts a new row
- it logs a `buy` activity

For sells:

- it checks if the user owns the asset
- it reduces shares or deletes the row if fully sold
- it computes realized P&L based on average cost basis
- it logs a `sell` activity

This route is basically the write-side portfolio ledger.

## 14. Profile Backend Flow

The profile is both a product feature and a reasoning input.

The profile route:

- reads the current user profile
- updates one or more fields
- logs only actual changes
- stamps `profile_updated_at`

This matters because the profile influences:

- fund recommendations
- rebalance advice
- scenario framing
- LLM response wording

The "Tune my plan" side panel is therefore not cosmetic. It changes backend behavior.

## 15. Risk Snapshot Implementation

The risk snapshot is implemented in the Python service.

It calculates:

- concentration score
- stock-heaviness score
- volatility score
- overall risk label
- concentration alerts
- estimated bad-month loss
- estimated crash loss
- mismatch between the user-stated risk feeling and the actual portfolio risk

### Inputs

- holdings with shares
- optional `risk_feel` from the user profile

### Methods

- pulls live prices and 1-year history per holding
- estimates annualized volatility from daily returns
- estimates max drawdown from 3-year or 1-year history
- weights risk metrics by current position size

### Output style

The result is not just numbers. It is shaped into a product-oriented JSON object with:

- labels like `stormy`, `wobbly`, `moderate`, `steady`
- component-level detail
- alert objects the UI can render

## 16. Fund Recommendation Engine

Fund recommendations are not generated by the LLM.

They come from a curated whitelist in `apps/math-service/data/fund_whitelist.json`.

### Strategy

1. Map the user's timeline into a slot:
   - short term
   - medium term
   - long term
   - growth
2. Pull only the relevant candidate funds from the whitelist
3. Optionally filter by ETF vs mutual fund preference
4. Fetch live market metrics for each candidate
5. Score each fund on:
   - stability
   - resilience
   - cost
   - liquidity
6. Weight the score differently depending on the user's timeline and risk feeling
7. Return the top 3

### Why this matters

The system is not searching the entire market. It is recommending from an approved shortlist. That makes the behavior more controllable and explainable.

## 17. Rebalance Engine

The rebalance engine is one of the strongest pieces of backend product logic.

### What it diagnoses

- oversized top holding
- sector concentration
- missing sectors
- insufficient bond exposure for short timelines

### What it produces

A multi-phase plan with structured phases such as:

- `stop_buying_more`
- `trim_concentration`
- `add_sector_diversity`
- `add_stability`

### Important behavior

If concentration is very high, the engine may suggest trimming now.

If concentration is only moderately high, it may avoid selling and instead recommend directing new contributions into missing areas over time.

This is a good product tradeoff because it recognizes tax implications and user behavior.

### Stored execution state

When the user applies a rebalance plan, the items are inserted into `rebalance_items`. Status can later be updated to:

- pending
- completed
- rejected

This means the app supports "plan tracking", not just one-time advice.

## 18. Scenario Engine

The what-if engine supports five scenario families.

### 1. Market moves

Simulates a broad drop or rally.

Behavior:

- equities take most of the move
- broad diversified funds are buffered somewhat
- bonds move less

Returns:

- updated portfolio value
- per-holding impact
- suggestions like shifting money to VOO/VTI or building cash buffer

### 2. Inflation

Simulates purchasing-power erosion across years.

Behavior:

- projects nominal growth by sector assumptions
- discounts to real value using inflation

Returns:

- nominal after value
- real after value
- cumulative inflation
- suggestions around energy, financials, staples, or shorter-duration bonds

### 3. Withdrawal

Simulates needing to pull money out of the portfolio.

Behavior:

- computes required withdrawal amount
- ranks holdings for liquidation priority
- tends to sell high-volatility individual positions before diversified core

Returns:

- sell plan
- proceeds
- suggestions about staged sales and long-term capital gains

### 4. Rate change

Simulates rate hikes or cuts.

Behavior:

- bonds use a duration-based price impact approximation
- equities use sector sensitivity assumptions

Returns:

- portfolio impact
- suggestions about bond duration, financials, and tech exposure

### 5. Income change

Simulates job loss, pay cut, or raise.

Behavior:

- computes required cash buffer for loss/cut
- recommends pausing investments or selling if necessary
- recommends increasing contributions on raise

This scenario engine is more product-driven than academically perfect. It is designed to produce understandable portfolio coaching rather than institutional-grade risk modeling.

## 19. How Frontend and Backend Stay In Sync

The frontend uses fetch calls to the API routes and updates local stores.

The chat interface also triggers app-wide refresh behavior:

- portfolio refresh after confirmed holdings changes
- profile refresh after profile-update detection
- global events like `portfolio-updated` and `profile-updated`

This is a simple, effective coordination model for a small app.

## 20. Important Implementation Notes and Caveats

These details matter if another model or engineer is analyzing the repo.

### Demo-only auth

- Login is localStorage based
- There is no true backend user session
- There is one hardcoded demo user

### Open RLS

- Supabase policies are intentionally wide open for demo speed
- This is not production safe

### Port mismatch to be aware of

The README and environment example use `MATH_SERVICE_URL=http://127.0.0.1:8765`, but several server helper files default to `http://localhost:8000` if the env var is missing.

This means:

- if `MATH_SERVICE_URL` is set correctly, everything is fine
- if it is missing, the app may silently call the wrong port

### Hardcoded scenario assumption

The scenario route currently sends `monthly_expenses: 4000` as a default for income scenarios unless overridden.

### Some UI values are still demo placeholders

For example, the portfolio panel currently uses a hardcoded `dayChange = 0.8` for the top-level "today" chip instead of a fully computed aggregate daily portfolio change.

### Single-user architecture

The entire backend logic assumes:

- one persistent demo user
- shared portfolio
- shared chat history

That makes the system easier to demonstrate but changes how you should evaluate the architecture.

## 21. Why This Project Is Technically Interesting

This project is a good example of practical AI product engineering because it does **not** hand everything to the LLM.

It separates concerns well:

- LLM for language and intent
- rule-based finance logic for calculations
- database for persistence
- UI stores for responsiveness

That makes the product:

- easier to control
- cheaper to run
- easier to debug
- safer than a fully generative finance assistant

## 22. What Would Need To Change For Production

If this became a production startup app, the next engineering priorities would likely be:

- replace demo login with real auth
- remove hardcoded `DEMO_USER_ID`
- lock down Supabase RLS
- separate public and private service credentials
- add input validation and stricter schema typing
- add tests for route handlers and math service logic
- add monitoring/logging around LLM failures and market-data failures
- add stronger caching and retries around `yfinance`
- make scenario assumptions configurable instead of hardcoded
- compute real aggregate portfolio daily performance in the UI/backend

## 23. Short Project Summary For Another LLM

Use the following summary if you want to paste this project into another model quickly:

```text
Finsight is a conversational portfolio-coach web app. The frontend is Next.js 14 + React + TypeScript + Tailwind + Zustand. The main backend is not Express; it is Next.js App Router API routes. Those routes orchestrate Supabase reads/writes, Anthropic Claude calls, and a separate Python FastAPI math service.

Supabase stores users, holdings, activities, messages, profile_changes, and rebalance_items. The current app is demo-first: it uses a hardcoded demo user ID and localStorage-based login flags instead of real auth. Supabase RLS is intentionally wide open for hackathon/demo purposes.

Claude is used for intent classification, profile-update detection, and plain-English advice generation. Deterministic finance logic is kept outside the LLM in the Python service.

The Python math service uses yfinance and numpy. It provides endpoints for live prices, price history, risk snapshot, fund recommendations, rebalance plans, and five what-if scenarios: market moves, inflation, withdrawal, rate changes, and income changes.

Fund recommendations come from a curated whitelist, not open-ended search. Rebalance advice is multi-phase and can be persisted to rebalance_items. The scenario system is rule-based and portfolio-aware rather than LLM-invented.

Overall architecture: Next.js UI -> Next.js API routes -> Supabase + Claude + Python math service -> yfinance.
```

## 24. Final Takeaway

Finsight is best understood as a **product-focused AI finance demo with a disciplined architecture**.

It is not:

- a pure chatbot
- a pure dashboard
- a pure quant engine

It is a layered system where:

- the UI makes the product approachable
- Supabase preserves user state
- Claude makes the interaction feel conversational
- the Python service keeps the numbers grounded

That combination is the main engineering idea behind the repo.
