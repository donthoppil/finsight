import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { fetchRebalancePlan } from "@/lib/rebalance";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// GET — fresh plan based on current portfolio + profile
export async function GET() {
  noStore();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("symbol, shares")
    .eq("user_id", DEMO_USER_ID);

  if (!profile?.goal_timeline_years || !profile?.risk_feel) {
    return Response.json({ error: "incomplete_profile" });
  }

  const plan = await fetchRebalancePlan({
    holdings: (holdings ?? []).map((h) => ({
      symbol: h.symbol as string,
      shares: parseFloat(h.shares as unknown as string),
    })),
    timeline_years: Number(profile.goal_timeline_years),
    risk_feel: profile.risk_feel as string,
    monthly_contribution: Number(profile.monthly_contribution ?? 0),
  });

  return Response.json(plan);
}

// POST — save a plan to rebalance_items (when user clicks Apply)
export async function POST(req: Request) {
  const body = (await req.json()) as {
    plan_id: string;
    items: Array<{
      phase_number: number;
      ticker: string;
      amount_usd: number;
      estimated_shares: number;
    }>;
  };

  if (!body.plan_id || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: "missing plan_id or items" }, { status: 400 });
  }

  const records = body.items.map((item) => ({
    user_id: DEMO_USER_ID,
    plan_id: body.plan_id,
    phase_number: item.phase_number,
    ticker: item.ticker,
    amount_usd: item.amount_usd,
    estimated_shares: item.estimated_shares,
    status: "pending",
  }));

  const { error } = await supabase.from("rebalance_items").insert(records);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, plan_id: body.plan_id });
}

// PATCH — update one item's status (completed | rejected)
export async function PATCH(req: Request) {
  const { plan_id, ticker, status, user_note } = (await req.json()) as {
    plan_id: string;
    ticker: string;
    status: "completed" | "rejected" | "pending";
    user_note?: string;
  };

  if (!plan_id || !ticker || !status) {
    return Response.json({ error: "missing plan_id/ticker/status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("rebalance_items")
    .update({
      status,
      user_note: user_note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", DEMO_USER_ID)
    .eq("plan_id", plan_id)
    .eq("ticker", ticker);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
