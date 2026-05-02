-- ============================================================
-- Phase 2.9 — Rebalance plan items
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/fmesrxymirsdzjlundgf/sql/new
-- ============================================================

create table if not exists rebalance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_id uuid not null,                          -- groups items into a plan
  phase_number int not null,
  ticker text not null,
  amount_usd numeric not null,
  estimated_shares numeric,
  status text not null default 'pending',         -- 'pending' | 'completed' | 'rejected'
  user_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Open RLS policy (matches the rest of the demo)
alter table rebalance_items enable row level security;
drop policy if exists "demo_open_rebalance_items" on rebalance_items;
create policy "demo_open_rebalance_items"
  on rebalance_items for all
  using (true) with check (true);
