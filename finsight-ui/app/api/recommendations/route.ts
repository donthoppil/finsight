import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { fetchRecommendations } from "@/lib/recommendations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  noStore();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", DEMO_USER_ID)
    .single();

  if (!profile) {
    return Response.json({ error: "profile_not_found" }, { status: 404 });
  }

  const missing: string[] = [];
  if (!profile.goal_timeline_years) missing.push("timeline");
  if (!profile.risk_feel) missing.push("risk_feel");
  if (missing.length > 0) {
    return Response.json({ error: "incomplete_profile", missing });
  }

  const result = await fetchRecommendations({
    timeline_years: Number(profile.goal_timeline_years),
    risk_feel: profile.risk_feel,
    account_type: profile.account_type ?? null,
    fund_preference: profile.fund_preference ?? null,
  });

  return Response.json(result);
}
