-- ============================================================
-- Phase 2.5 — Tune My Plan
-- Run in Supabase SQL editor:
--   https://supabase.com/dashboard/project/fmesrxymirsdzjlundgf/sql/new
-- ============================================================

alter table users
  add column if not exists income_range text,           -- 'under_50k' | '50_100k' | '100_200k' | 'over_200k'
  add column if not exists account_type text,           -- 'brokerage' | '401k' | 'ira' | 'mix'
  add column if not exists has_emergency_fund text,     -- 'yes' | 'no' | 'partial'
  add column if not exists monthly_contribution numeric,
  add column if not exists fund_preference text,        -- 'etf' | 'mutual_fund' | 'either'
  add column if not exists concerns text,
  add column if not exists profile_updated_at timestamptz default now();

create table if not exists profile_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_via text,                                     -- 'panel' | 'chat'
  created_at timestamptz default now()
);

-- Open RLS policy so anon key can read/write (matches the rest of the demo).
alter table profile_changes enable row level security;
drop policy if exists "demo_open_profile_changes" on profile_changes;
create policy "demo_open_profile_changes"
  on profile_changes for all
  using (true) with check (true);
