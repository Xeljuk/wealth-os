"use client";

import Link from "next/link";
import { Target, TrendingUp, Shield, Clock, Radio } from "lucide-react";
import { formatCurrency, formatMonthWithOffset } from "@/lib/format";
import type { GoalTrajectory } from "@/lib/wealth-context";
import type { PlanStance } from "@/lib/types";

const STANCE_LABEL: Record<PlanStance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

interface Assumption {
  label: string;
  value: string;
  live: boolean;
}

function buildAssumptions(stance: PlanStance): Assumption[] {
  return [
    { label: "Inflation", value: "45% avg", live: false },
    { label: "Growth rate", value: "6% annual", live: false },
    { label: "Strategy", value: STANCE_LABEL[stance], live: true },
    { label: "Market prices", value: "Coming soon", live: false },
  ];
}

export default function StrategyCard({
  goal,
  allocatable,
  stance,
  period,
}: {
  goal: GoalTrajectory;
  allocatable: number;
  stance: PlanStance;
  period: string;
}) {
  const arrivalLabel = goal.projectedMonths < 999
    ? formatMonthWithOffset(period, goal.projectedMonths)
    : "—";
  const fundingPct = Math.round(goal.paceRatio * 100);
  const assumptions = buildAssumptions(stance);

  return (
    <div
      className="mb-10 rounded-2xl px-7 py-6"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-meta" style={{ color: "var(--color-accent)" }}>
            Your live strategy
          </p>
          <p
            className="mt-2 text-[19px] font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.015em" }}
          >
            {goal.name}
          </p>
        </div>
        <Link
          href="/scenarios"
          className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-opacity hover:opacity-70"
          style={{ color: "var(--color-accent)", backgroundColor: "var(--color-vellum-deep)" }}
        >
          Compare stances
        </Link>
      </div>

      {/* Metrics row */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric
          Icon={Target}
          label="Target"
          value={formatCurrency(goal.targetAmount, { compact: true })}
        />
        <Metric
          Icon={TrendingUp}
          label="Monthly funding"
          value={`${formatCurrency(goal.allocation, { compact: true })}/mo`}
          sub={`${fundingPct}% of needed pace`}
          accent={fundingPct >= 80}
        />
        <Metric
          Icon={Clock}
          label="Projected arrival"
          value={arrivalLabel}
          sub={goal.projectedMonths < 999 ? `${goal.projectedMonths} months` : "Not enough funding"}
        />
        <Metric
          Icon={Shield}
          label="Allocatable left"
          value={formatCurrency(allocatable - goal.allocation, { compact: true })}
          sub="After this goal"
        />
      </div>

      {/* Narrative line */}
      <p
        className="mt-5 text-[13px] leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Under the <strong style={{ color: "var(--color-accent)" }}>{STANCE_LABEL[stance]}</strong> stance,{" "}
        {formatCurrency(goal.allocation, { compact: true })}/mo is channelled toward{" "}
        <strong style={{ color: "var(--color-text-primary)" }}>{goal.name}</strong>.{" "}
        {goal.projectedMonths < 999
          ? `At this pace you arrive by ${arrivalLabel}. Update your data each month to keep this estimate tight.`
          : "Current funding isn't enough to reach the target — consider reallocating or extending the timeline."}
      </p>

      {/* Assumptions strip */}
      <div
        className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-5 py-3"
        style={{ backgroundColor: "var(--color-vellum-deep)" }}
      >
        <p
          className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--color-text-muted)" }}
        >
          Assumptions
        </p>
        {assumptions.map((a) => (
          <span
            key={a.label}
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {a.live ? (
              <Radio size={8} style={{ color: "var(--color-accent)" }} />
            ) : (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--color-border)" }}
              />
            )}
            <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              {a.label}:
            </span>{" "}
            {a.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({
  Icon,
  label,
  value,
  sub,
  accent,
}: {
  Icon: typeof Target;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color: "var(--color-text-muted)" }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </p>
      </div>
      <p
        className="mt-1.5 text-[17px] font-bold tabular-nums"
        style={{
          color: accent ? "var(--color-accent)" : "var(--color-text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
