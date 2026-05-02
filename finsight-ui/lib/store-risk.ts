"use client";

import { create } from "zustand";
import type { RiskSnapshot } from "@/lib/risk";

type RiskStore = {
  snapshot: RiskSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export const useRisk = create<RiskStore>((set) => ({
  snapshot: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/risk", { cache: "no-store" });
      if (!res.ok) throw new Error(`risk ${res.status}`);
      const json = (await res.json()) as RiskSnapshot;
      set({ snapshot: json, loading: false });
    } catch (err) {
      console.warn("[risk] fetch failed:", err);
      set({ loading: false });
    }
  },
}));
