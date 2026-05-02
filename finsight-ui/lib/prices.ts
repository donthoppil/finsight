// Server-side helper: fetch live prices from the Python math service.
// Lives in lib/ (not app/api/) so route handlers can call it directly.

export type LivePrice = {
  symbol: string;
  name?: string;
  price: number | null;
  change_pct?: number;
  asset_class?: string;
  currency?: string;
  error?: string;
};

const SERVICE_URL = process.env.MATH_SERVICE_URL || "http://localhost:8000";

export async function fetchPrices(symbols: string[]): Promise<LivePrice[]> {
  if (!symbols || symbols.length === 0) return [];
  try {
    const res = await fetch(`${SERVICE_URL}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
      // The math service caches for 5 min itself; don't double-cache here.
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[prices] math service responded ${res.status}`);
      return symbols.map((s) => ({ symbol: s, price: null, error: `service ${res.status}` }));
    }
    return (await res.json()) as LivePrice[];
  } catch (err) {
    console.warn("[prices] math service unreachable:", err);
    return symbols.map((s) => ({
      symbol: s,
      price: null,
      error: "math service unreachable",
    }));
  }
}
