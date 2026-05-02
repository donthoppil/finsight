import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Don't throw at import time — let route handlers fail loud instead so the
  // dashboard can still render in dev without env vars present.
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. " +
      "Phase 2 features will not work until these are set in .env.local."
  );
}

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anon ?? "placeholder");

// Single demo user pattern (matches the row seeded by supabase/schema.sql).
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
