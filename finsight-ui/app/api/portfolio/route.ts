import { NextRequest } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { supabase, DEMO_USER_ID } from "@/lib/supabase";
import { fetchPrices } from "@/lib/prices";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// ===========================================
// GET — current portfolio with live prices
// ===========================================
export async function GET() {
  noStore();
  const { data: holdings, error } = await supabase
    .from("holdings")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!holdings || holdings.length === 0) {
    return Response.json({ holdings: [], total: 0, allocation: {} });
  }

  const prices = await fetchPrices(holdings.map((h) => h.symbol));

  const enriched = holdings.map((h) => {
    const live = prices.find((p) => p.symbol === h.symbol);
    const price = live?.price ?? 0;
    return {
      id: h.id,
      symbol: h.symbol,
      shares: parseFloat(h.shares),
      avg_cost_basis: h.avg_cost_basis ? parseFloat(h.avg_cost_basis) : null,
      current_price: price,
      change_pct: live?.change_pct ?? 0,
      name: live?.name ?? h.symbol,
      current_value: parseFloat(h.shares) * price,
      asset_class: live?.asset_class ?? h.asset_class ?? "equity",
    };
  });

  const total = enriched.reduce((sum, h) => sum + h.current_value, 0);
  const allocation: Record<string, number> = {};
  enriched.forEach((h) => {
    allocation[h.asset_class] = (allocation[h.asset_class] ?? 0) + h.current_value;
  });
  Object.keys(allocation).forEach((k) => {
    allocation[k] = total > 0 ? Math.round((allocation[k] / total) * 1000) / 10 : 0;
  });

  return Response.json({ holdings: enriched, total, allocation });
}

// =================================================
// POST — apply a confirmed change (buy / sell / add)
// body: { intent_type: "add_holding" | "update_holding", items: [...] }
// =================================================
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    intent_type: "add_holding" | "update_holding";
    items: Array<{
      symbol: string;
      shares: number;
      price?: number | null;
      live_price?: number | null;
      action?: "buy" | "sell";
      asset_class?: string;
      name?: string;
    }>;
  };

  const { intent_type, items } = body;
  const errors: string[] = [];

  for (const item of items) {
    const price = item.price ?? item.live_price ?? 0;
    if (!item.symbol || !item.shares || price <= 0) {
      errors.push(`Skipping ${item.symbol}: missing shares or price`);
      continue;
    }

    // Look up existing holding for this symbol.
    const { data: existing } = await supabase
      .from("holdings")
      .select("*")
      .eq("user_id", DEMO_USER_ID)
      .eq("symbol", item.symbol)
      .maybeSingle();

    if (intent_type === "add_holding" || (intent_type === "update_holding" && item.action === "buy")) {
      if (existing) {
        const oldShares = parseFloat(existing.shares);
        const oldBasis = existing.avg_cost_basis ? parseFloat(existing.avg_cost_basis) : price;
        const newShares = oldShares + item.shares;
        const newBasis = (oldShares * oldBasis + item.shares * price) / newShares;
        const { error: updateErr } = await supabase
          .from("holdings")
          .update({
            shares: newShares,
            avg_cost_basis: newBasis,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateErr) {
          console.error("[portfolio] update failed:", updateErr);
          errors.push(`Couldn't update ${item.symbol}: ${updateErr.message}`);
          continue;
        }
      } else {
        const { error: insertErr } = await supabase.from("holdings").insert({
          user_id: DEMO_USER_ID,
          symbol: item.symbol,
          shares: item.shares,
          avg_cost_basis: price,
          asset_class: item.asset_class ?? "equity",
        });
        if (insertErr) {
          console.error("[portfolio] insert failed:", insertErr);
          errors.push(`Couldn't add ${item.symbol}: ${insertErr.message}`);
          continue;
        }
      }

      const { error: actErr } = await supabase.from("activities").insert({
        user_id: DEMO_USER_ID,
        type: "buy",
        symbol: item.symbol,
        shares: item.shares,
        price,
        total: item.shares * price,
      });
      if (actErr) console.warn("[portfolio] activity log failed:", actErr);
    } else if (intent_type === "update_holding" && item.action === "sell") {
      if (!existing) {
        errors.push(`Cannot sell ${item.symbol} — you don't own any.`);
        continue;
      }
      const oldShares = parseFloat(existing.shares);
      const newShares = oldShares - item.shares;
      const basis = existing.avg_cost_basis ? parseFloat(existing.avg_cost_basis) : price;
      const realized = (price - basis) * item.shares;

      if (newShares <= 0.0001) {
        const { error: delErr } = await supabase.from("holdings").delete().eq("id", existing.id);
        if (delErr) {
          console.error("[portfolio] delete failed:", delErr);
          errors.push(`Couldn't sell ${item.symbol}: ${delErr.message}`);
          continue;
        }
      } else {
        const { error: updErr } = await supabase
          .from("holdings")
          .update({ shares: newShares, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (updErr) {
          console.error("[portfolio] sell-update failed:", updErr);
          errors.push(`Couldn't sell ${item.symbol}: ${updErr.message}`);
          continue;
        }
      }

      const { error: actErr } = await supabase.from("activities").insert({
        user_id: DEMO_USER_ID,
        type: "sell",
        symbol: item.symbol,
        shares: item.shares,
        price,
        total: item.shares * price,
        realized_pnl: realized,
      });
      if (actErr) console.warn("[portfolio] activity log failed:", actErr);
    }
  }

  if (errors.length > 0) {
    return Response.json({ success: false, errors }, { status: 500 });
  }
  return Response.json({ success: true });
}
