"use client";

import type { PlanStance, PlanVariant } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface Props {
  plans: PlanVariant[];
  activeStance: PlanStance;
}

const DIMENSIONS: {
  key: "goalFunding" | "investmentContribution" | "debtExtra" | "liquidityReserve";
  label: string;
  hint: string;
}[] = [
  {
    key: "goalFunding",
    label: "Goal funding",
    hint: "Monthly toward defined goals",
  },
  {
    key: "investmentContribution",
    label: "Investment",
    hint: "New capital into markets",
  },
  {
    key: "debtExtra",
    label: "Debt acceleration",
    hint: "Extra payment beyond required",
  },
  {
    key: "liquidityReserve",
    label: "Liquidity reserve",
    hint: "Emergency buffer growth",
  },
];

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

export default function StanceBarsComparison({
  plans,
  activeStance,
}: Props) {
  return (
    <div className="flex flex-col gap-10">
      {DIMENSIONS.map((dim) => {
        const values = plans.map((p) => ({
          stance: p.stance,
          value: p[dim.key] as number,
        }));
        const max = Math.max(1, ...values.map((v) => v.value));
        const bestValue = Math.max(...values.map((v) => v.value));

        return (
          <div key={dim.key}>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {dim.label}
                </p>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {dim.hint}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {values.map((v) => {
                const pct = (v.value / max) * 100;
                const isActive = v.stance === activeStance;
                const isBest = v.value === bestValue && v.value > 0;
                const color = STANCE_COLORS[v.stance];

                return (
                  <div key={v.stance} className="flex items-center gap-4">
                    <span
                      className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        color: isActive
                          ? color
                          : "var(--color-text-muted)",
                      }}
                    >
                      {STANCE_LABELS[v.stance]}
                    </span>
                    <div
                      className="relative h-7 flex-1 overflow-hidden rounded-md"
                      style={{ backgroundColor: "var(--color-surface-low)" }}
                    >
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 1)}%`,
                          backgroundColor: color,
                          opacity: isActive ? 0.88 : 0.32,
                        }}
                      />
                      {isBest && (
                        <span
                          className="absolute inset-y-0 right-2 flex items-center text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{
                            color: isActive
                              ? "#ffffff"
                              : "var(--color-text-muted)",
                          }}
                        >
                          Most
                        </span>
                      )}
                    </div>
                    <span
                      className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums"
                      style={{
                        color: isActive
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {v.value > 0
                        ? `${formatCurrency(v.value, { compact: true })}/mo`
                        : "—"}
                    </span>
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
