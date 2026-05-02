"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMode } from "@/components/toggle/ModeContext";
import { formatNumber } from "@/lib/translator";
import type { ScenarioResult } from "@/lib/demo-data";

const COLORS: Record<string, string> = {
  stock: "#2563EB",
  fund: "#60A5FA",
};

function MiniDonut({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-ink-tertiary uppercase tracking-wide mb-2">{label}</div>
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={64}
              stroke="none"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name as keyof typeof COLORS]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-xs text-ink-tertiary">stocks</div>
          <div className="font-serif text-xl text-forest-primary tabular-nums leading-none">
            {data.find((d) => d.name === "stock")?.value ?? 0}%
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-secondary">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[d.name as keyof typeof COLORS] }}
            />
            <span className="capitalize">{d.name}</span>
            <span className="tabular-nums text-ink-tertiary">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BeforeAfterDonut({ result }: { result: ScenarioResult }) {
  const { mode } = useMode();
  const today = Object.entries(result.current_allocation).map(([name, value]) => ({ name, value }));
  const recommended = Object.entries(result.recommended_allocation).map(([name, value]) => ({
    name,
    value,
  }));

  const lossWithAction = result.before_value - result.after_with_action_value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-card border border-line-soft"
    >
      <div className="font-serif text-lg text-ink-primary">The shift we'd suggest</div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <MiniDonut data={today} label="Today" />
        <MiniDonut data={recommended} label="Recommended" />
      </div>
      <div className="mt-5 text-sm text-ink-secondary text-center">
        If we made this change, your loss in this scenario would be{" "}
        <span className="font-medium text-forest-primary tabular-nums">
          ~{formatNumber(lossWithAction, "currency", mode)}
        </span>{" "}
        instead.
      </div>
    </motion.div>
  );
}
