"use client";

import type { PlanStance, PlanVariant } from "@/lib/types";

interface StanceRadarChartProps {
  plans: PlanVariant[];
  activeStance: PlanStance;
  allocatableSurplus: number;
}

interface Axis {
  key: keyof Pick<
    PlanVariant,
    "goalFunding" | "investmentContribution" | "debtExtra" | "liquidityReserve"
  >;
  label: string;
  angle: number; // degrees, 0 = top
}

const AXES: Axis[] = [
  { key: "goalFunding", label: "Goals", angle: 0 },
  { key: "investmentContribution", label: "Invest", angle: 90 },
  { key: "debtExtra", label: "Debt", angle: 180 },
  { key: "liquidityReserve", label: "Liquidity", angle: 270 },
];

const STANCE_COLORS: Record<PlanStance, string> = {
  safe: "var(--color-positive)",
  balanced: "var(--color-accent)",
  aggressive: "var(--color-warning)",
};

const SIZE = 280;
const CENTER = SIZE / 2;
const MAX_RADIUS = SIZE / 2 - 40;
const RINGS = [0.25, 0.5, 0.75, 1];

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  // angle 0 = top (12 o'clock), clockwise
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(rad) * radius,
    y: CENTER + Math.sin(rad) * radius,
  };
}

export default function StanceRadarChart({
  plans,
  activeStance,
  allocatableSurplus,
}: StanceRadarChartProps) {
  // Normalize by the largest value across all stances and axes so the radar
  // shape reflects relative allocation. Fall back to allocatable surplus.
  const maxValue = Math.max(
    allocatableSurplus,
    ...plans.flatMap((p) => AXES.map((a) => p[a.key])),
    1,
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="max-w-full"
      >
        {/* Background rings */}
        {RINGS.map((r) => {
          const pts = AXES.map((a) => polar(a.angle, MAX_RADIUS * r))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return (
            <polygon
              key={r}
              points={pts}
              fill="none"
              stroke="var(--color-surface-low)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {AXES.map((a) => {
          const p = polar(a.angle, MAX_RADIUS);
          return (
            <line
              key={a.key}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="var(--color-surface-low)"
              strokeWidth={1}
            />
          );
        })}

        {/* Stance polygons — active last so it's on top */}
        {plans
          .slice()
          .sort((a, b) => {
            if (a.stance === activeStance) return 1;
            if (b.stance === activeStance) return -1;
            return 0;
          })
          .map((plan) => {
            const isActive = plan.stance === activeStance;
            const color = STANCE_COLORS[plan.stance];
            const points = AXES.map((a) => {
              const value = plan[a.key];
              const ratio = value / maxValue;
              return polar(a.angle, MAX_RADIUS * ratio);
            });
            const pts = points.map((p) => `${p.x},${p.y}`).join(" ");

            return (
              <g key={plan.stance}>
                <polygon
                  points={pts}
                  fill={color}
                  fillOpacity={isActive ? 0.25 : 0.08}
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.5}
                />
                {isActive &&
                  points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill={color}
                      stroke="var(--color-surface)"
                      strokeWidth={1.5}
                    />
                  ))}
              </g>
            );
          })}

        {/* Axis labels */}
        {AXES.map((a) => {
          const labelPos = polar(a.angle, MAX_RADIUS + 22);
          return (
            <text
              key={a.key}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="select-none text-[11px] font-semibold uppercase tracking-wider"
              fill="var(--color-text-muted)"
            >
              {a.label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {plans.map((plan) => {
          const active = plan.stance === activeStance;
          return (
            <div key={plan.stance} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor: STANCE_COLORS[plan.stance],
                  opacity: active ? 1 : 0.4,
                }}
              />
              <span
                className="text-xs capitalize"
                style={{
                  color: active
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {plan.stance}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
