"use client";

import { useEffect } from "react";
import { Compass } from "lucide-react";
import { ModeToggle } from "@/components/toggle/ModeToggle";
import { usePanelStore, useProfile } from "@/lib/store";
import { profileCompletenessPct } from "@/lib/profile-summary";

export function TopBar() {
  const openPanel = usePanelStore((s) => s.open);
  const profile = useProfile((s) => s.profile);
  const refreshProfile = useProfile((s) => s.refresh);

  // Hydrate profile once so the completeness chip has a value to show.
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const completeness = profileCompletenessPct(profile);

  return (
    <header className="shrink-0 sticky top-0 z-30 bg-cream/85 backdrop-blur border-b border-line-soft">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl text-forest-primary leading-none tracking-tight">
            Finsight
          </span>
          <span className="hidden sm:inline-block text-xs text-ink-tertiary border-l border-line-soft pl-3 ml-1">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />

          <button
            onClick={openPanel}
            className="hidden md:flex items-center gap-2 bg-forest-pale hover:bg-forest-mint text-forest-primary px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-forest-soft/30"
            title="Open the Tune my plan panel"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tune my plan</span>
            {profile && (
              <span className="text-[10px] bg-forest-primary text-white px-1.5 py-0.5 rounded-full tabular-nums">
                {completeness}%
              </span>
            )}
          </button>

          <div className="w-9 h-9 rounded-full bg-forest-primary flex items-center justify-center text-white font-semibold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
