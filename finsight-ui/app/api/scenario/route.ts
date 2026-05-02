import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { fetchScenario } from "@/lib/scenario-api";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(req: Request) {
  noStore();

  const body = (await req.json()) as {
    scenario_id: string;
    params?: Record<string, unknown>;
  };
  if (!body.scenario_id) {
    return Response.json({ error: "missing scenario_id" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("goal_timeline_years, risk_feel, monthly_contribution")
    .eq("id", DEMO_USER_ID)
    .single();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("symbol, shares")
    .eq("user_id", DEMO_USER_ID);

  if (!holdings || holdings.length === 0) {
    return Response.json({ error: "empty_portfolio" });
  }

  const normalizedHoldings = holdings.map((h) => ({
    symbol: h.symbol as string,
    shares: parseFloat(h.shares as unknown as string),
  }));

  const payload = {
    holdings: normalizedHoldings,
    timeline_years: Number(profile?.goal_timeline_years ?? 5),
    risk_feel: (profile?.risk_feel as string) ?? "nervous",
    monthly_expenses: 4000, // sensible default for income scenarios
    ...(body.params ?? {}),
  };

  const result = await fetchScenario(body.scenario_id, payload);
  return Response.json(result);
}
