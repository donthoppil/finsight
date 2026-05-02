"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Mode } from "@/lib/translator";

type ModeContextValue = {
  mode: Mode;
  setMode: (m: Mode) => void;
  toggle: () => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("simple");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("finsight_mode") : null;
    if (stored === "simple" || stored === "detailed") {
      setModeState(stored);
    }
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("finsight_mode", m);
    }
  };

  const toggle = () => setMode(mode === "simple" ? "detailed" : "simple");

  return <ModeContext.Provider value={{ mode, setMode, toggle }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
