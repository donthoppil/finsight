-- ============================================================
-- Finsight — Phase 2 schema.
-- Run this in your Supabase SQL editor:
--   https://supabase.com/dashboard/project/fmesrxymirsdzjlundgf/sql/new
-- ============================================================

-- Single demo user pattern. In production this would be auth.users.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  age int,
  goal text,
  goal_timeline_years int,
  risk_feel text,                          -- "fine" | "nervous" | "panic" | "sell"
  amount_invested numeric,
  created_at timestamptz default now()
);

-- One row per holding. Cost basis tracked for tax calcs.
create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  symbol text not null,
  shares numeric not null,
  avg_cost_basis numeric,                  -- $/share user paid on average
  asset_class text,                        -- "equity" | "bond" | "gold" | "etf"
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, symbol)
);

-- Activity log: every confirmed change to the portfolio.
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,                      -- "buy" | "sell" | "add_existing" | "remove"
  symbol text,
  shares numeric,
  price numeric,
  total numeric,
  realized_pnl numeric,
  notes text,
  created_at timestamptz default now()
);

-- Chat history (so refresh doesn't lose context).
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  role text not null,                      -- "user" | "assistant"
  content text,
  metadata jsonb,                          -- citations, confidence, tool calls
  created_at timestamptz default now()
);

-- Disable RLS for hackathon simplicity. Add policies in production.
alter table users disable row level security;
alter table holdings disable row level security;
alter table activities disable row level security;
alter table messages disable row level security;

-- Seed the demo user (idempotent — safe to re-run).
insert into users (id, email, name, age, goal, goal_timeline_years, risk_feel, amount_invested)
values (
  '00000000-0000-0000-0000-000000000001',
  'priya@demo.com',
  'Priya',
  32,
  'Buy a house',
  2,
  'nervous',
  0
)
on conflict (id) do nothing;
