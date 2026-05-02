"use client";

import { create } from "zustand";
import type { UserProfile } from "@/lib/profile-summary";

// ===========================
// Live portfolio state
// ===========================

export type LiveHolding = {
  id: string;
  symbol: string;
  shares: number;
  avg_cost_basis?: number | null;
  current_price: number;
  change_pct: number;
  current_value: number;
  name: string;
  asset_class: string;
};

export type PortfolioSnapshot = {
  holdings: LiveHolding[];
  total: number;
  allocation: Record<string, number>;
};

type PortfolioStore = {
  snapshot: PortfolioSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSnapshot: (snap: PortfolioSnapshot) => void;
};

export const usePortfolio = create<PortfolioStore>((set) => ({
  snapshot: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error(`portfolio fetch ${res.status}`);
      const json = (await res.json()) as PortfolioSnapshot;
      set({ snapshot: json, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "fetch failed" });
    }
  },
  setSnapshot: (snap) => set({ snapshot: snap, loading: false, error: null }),
}));

// ===========================
// Thinking panel: live AI activity events
// ===========================

export type ThinkingEvent = {
  id: string;
  icon: string;
  text: string;
  ts: number;
};

type ThinkingStore = {
  events: ThinkingEvent[];
  push: (icon: string, text: string) => void;
  reset: () => void;
};

// ===========================
// "Tune my plan" panel — slide-in state
// ===========================

type PanelStore = {
  tunePanelOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const usePanelStore = create<PanelStore>((set, get) => ({
  tunePanelOpen: false,
  open: () => set({ tunePanelOpen: true }),
  close: () => set({ tunePanelOpen: false }),
  toggle: () => set({ tunePanelOpen: !get().tunePanelOpen }),
}));

// ===========================
// User profile (Tune my plan)
// ===========================

type ProfileStore = {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  patch: (updates: Partial<UserProfile>) => Promise<void>;
};

export const useProfile = create<ProfileStore>((set, get) => ({
  profile: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error(`profile fetch ${res.status}`);
      const data = (await res.json()) as UserProfile;
      set({ profile: data, loading: false });
    } catch (err) {
      console.warn("[profile] fetch failed:", err);
      set({ loading: false });
    }
  },
  patch: async (updates) => {
    // Optimistic update
    const prev = get().profile;
    set({ profile: { ...(prev ?? {}), ...updates } });
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`profile PUT ${res.status}`);
    } catch (err) {
      console.warn("[profile] save failed:", err);
      // Rollback if save fails
      set({ profile: prev });
      throw err;
    }
  },
}));

export const useThinking = create<ThinkingStore>((set, get) => ({
  events: [
    { id: "boot-1", icon: "📊", text: "Looked at your investments", ts: Date.now() - 8_000 },
    { id: "boot-2", icon: "🌱", text: "Watching if your mix shifts", ts: Date.now() - 2_000 },
  ],
  push: (icon, text) => {
    const next: ThinkingEvent = {
      id: `${text}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      icon,
      text,
      ts: Date.now(),
    };
    // Keep only the last 8 events to prevent unbounded growth.
    set({ events: [...get().events.slice(-7), next] });
  },
  reset: () => set({ events: [] }),
}));
