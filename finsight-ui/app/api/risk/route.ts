import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { fetchRiskSnapshot } from "@/lib/risk";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  noStore();

  const { data: profile } = await supabase
    .from("users")
    .select("risk_feel")
    .eq("id", DEMO_USER_ID)
    .single();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("symbol, shares")
    .eq("user_id", DEMO_USER_ID);

  const normalized = (holdings ?? []).map((h) => ({
    symbol: h.symbol as string,
    shares: parseFloat(h.shares as unknown as string),
  }));

  const snapshot = await fetchRiskSnapshot(
    normalized,
    (profile?.risk_feel as string | null) ?? null
  );

  return Response.json(snapshot);
}
