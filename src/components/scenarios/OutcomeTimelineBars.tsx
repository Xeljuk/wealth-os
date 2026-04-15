"use client";

import type { PlanStance } from "@/lib/types";

interface OutcomeRow {
  label: string;
  values: { stance: PlanStance; months: number }[];
  lowerIsBetter?: boolean;
}

interface OutcomeTimelineBarsProps {
  rows: OutcomeRow[];
  activeStance: PlanStance;
}

const STANCE_COLORS: Record<PlanStance, string> = {
  safe: "var(--color-positive)",
  balanced: "var(--color-accent)",
  aggressive: "var(--color-warning)",
};

const STANCE_LABELS: Record<PlanStance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

export default function OutcomeTimelineBars({
  rows,
  activeStance,
}: OutcomeTimelineBarsProps) {
  // Compute the global max months across all rows so timelines are comparable
  const globalMax = Math.max(
    1,
    ...rows.flatMap((r) => r.values.map((v) => (v.months >= 999 ? 0 : v.months))),
  );

  return (
    <div className="flex flex-col gap-6">
      {rows.map((row) => {
        const nums = row.values.map((v) => v.months).filter((m) => m < 999);
        const bestValue = nums.length
          ? row.lowerIsBetter !== false
            ? Math.min(...nums)
            : Math.max(...nums)
          : null;

        return (
          <div key={row.label}>
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {row.label}
            </p>
            <div className="flex flex-col gap-2">
              {row.values.map((v) => {
                const isBest = bestValue != null && v.months === bestValue && v.months < 999;
                const isActive = v.stance === activeStance;
                const unreachable = v.months >= 999;
                const width = unreachable
                  ? 100
                  : (v.months / globalMax) * 100;
                const color = STANCE_COLORS[v.stance];

                return (
                  <div key={v.stance} className="flex items-center gap-3">
                    <span
                      className="w-20 shrink-0 text-[11px] font-semibold capitalize"
                      style={{
                        color: isActive ? color : "var(--color-text-muted)",
                      }}
                    >
                      {STANCE_LABELS[v.stance]}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <div
                        className="relative h-6 flex-1 overflow-hidden rounded-md"
                        style={{ backgroundColor: "var(--color-surface-low)" }}
                      >
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${width}%`,
                            backgroundColor: unreachable
                              ? "var(--color-surface-low)"
                              : color,
                            opacity: isActive ? 0.85 : 0.45,
                            border: unreachable
                              ? "1px dashed var(--color-text-muted)"
                              : undefined,
                          }}
                        />
                        {isBest && (
                          <span
                            className="absolute inset-y-0 right-2 flex items-center text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: "#fff" }}
                          >
                            Best
                          </span>
                        )}
                      </div>
                      <span
                        className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums"
                        style={{
                          color: isActive
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                        }}
                      >
                        {unreachable ? "N/A" : `${v.months} mo`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
