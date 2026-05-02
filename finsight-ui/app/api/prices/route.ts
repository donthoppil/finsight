import { NextRequest } from "next/server";
import { fetchPrices } from "@/lib/prices";

export async function POST(req: NextRequest) {
  const { symbols } = (await req.json()) as { symbols?: string[] };
  if (!Array.isArray(symbols)) {
    return Response.json({ error: "symbols must be an array" }, { status: 400 });
  }
  const prices = await fetchPrices(symbols);
  return Response.json(prices);
}
