-- ============================================================
-- Finsight — reset the demo account to a blank slate.
-- Idempotent. Safe to run anytime before a demo.
-- Run in Supabase SQL editor or via psql.
-- ============================================================

-- 1. Wipe everything tied to the demo user (FK cascade would also
--    do it on user delete, but we want to keep the user row itself).
delete from holdings        where user_id = '00000000-0000-0000-0000-000000000001';
delete from activities      where user_id = '00000000-0000-0000-0000-000000000001';
delete from messages        where user_id = '00000000-0000-0000-0000-000000000001';
delete from profile_changes where user_id = '00000000-0000-0000-0000-000000000001';
delete from rebalance_items where user_id = '00000000-0000-0000-0000-000000000001';

-- 2. Reset the user profile to a fresh state. Keep id + email + name
--    so the "Welcome Alex!" greeting still works and lib/supabase.ts
--    DEMO_USER_ID still resolves.
update users set
  age                   = null,
  goal                  = null,
  goal_timeline_years   = null,
  risk_feel             = null,
  amount_invested       = 0,
  monthly_contribution  = null,
  income_range          = null,
  account_type          = null,
  has_emergency_fund    = null,
  fund_preference       = null,
  concerns              = null,
  profile_updated_at    = null
where id = '00000000-0000-0000-0000-000000000001';
