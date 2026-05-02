-- ============================================================
-- Run this in your Supabase SQL editor:
--   https://supabase.com/dashboard/project/fmesrxymirsdzjlundgf/sql/new
--
-- Why: even though schema.sql says `disable row level security`,
-- the Supabase project still rejects writes from the anon key with
-- "new row violates row-level security policy". Adding open policies
-- (enabled or not) makes anon writes work for the demo.
-- ============================================================

-- Make sure RLS is on (so policies actually get evaluated).
alter table users enable row level security;
alter table holdings enable row level security;
alter table activities enable row level security;
alter table messages enable row level security;

-- Drop existing open policies if a previous run left them around (idempotent).
drop policy if exists "demo_open_users" on users;
drop policy if exists "demo_open_holdings" on holdings;
drop policy if exists "demo_open_activities" on activities;
drop policy if exists "demo_open_messages" on messages;

-- Open policies — anon role can do anything on these tables.
-- ⚠️ Hackathon-only. In production, scope these to auth.uid() = user_id.
create policy "demo_open_users"
  on users for all
  using (true) with check (true);

create policy "demo_open_holdings"
  on holdings for all
  using (true) with check (true);

create policy "demo_open_activities"
  on activities for all
  using (true) with check (true);

create policy "demo_open_messages"
  on messages for all
  using (true) with check (true);
