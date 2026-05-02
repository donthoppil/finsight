"use client";

import { SCENARIOS } from "@/lib/demo-data";
import { ScenarioCard } from "./ScenarioCard";

export function ScenarioGrid({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl text-ink-primary">What if?</h2>
        <p className="text-ink-secondary mt-1">
          Pick a scenario and I'll show you the impact — and what we'd do about it.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((s, i) => (
          <ScenarioCard key={s.id} scenario={s} onClick={() => onPick(s.id)} index={i} />
        ))}
      </div>
    </div>
  );
}
