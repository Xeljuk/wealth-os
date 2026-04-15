"use client";

import { useState } from "react";
import type { PlanStance, PlanVariant } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

export interface OutcomeSet {
  propMo: number;
  emerMo: number;
  portMo: number;
  debtMo: number;
}

interface Props {
  plans: PlanVariant[];
  activeStance: PlanStance;
  outcomes: Record<PlanStance, OutcomeSet>;
}

type DimensionGroup = "allocation" | "outcomes";

const GROUP_META: Record<
  DimensionGroup,
  { label: string; hint: string }
> = {
  allocation: {
    label: "Monthly split",
    hint: "Where your allocatable surplus lands each month",
  },
  outcomes: {
    label: "Time to reach",
    hint: "How many months until each milestone lands",
  },
};

interface Dimension {
  id: string;
  group: DimensionGroup;
  label: string;
  hint: string;
  narrative: string;
  unit: "currency" | "months";
  lowerIsBetter: boolean;
  /** Name of the allocation bucket that feeds this outcome — used to explain "Deferred". */
  sourceLabel?: string;
  getter: (plan: PlanVariant, outcome: OutcomeSet) => number;
}

const DIMENSIONS: Dimension[] = [
  {
    id: "goalFunding",
    group: "allocation",
    label: "Goal funding",
    hint: "Monthly capital directed to your defined goals",
    narrative:
      "How much of the room each stance reserves to move your goals forward. The more here, the faster the goal — but often at the cost of debt or buffer.",
    unit: "currency",
    lowerIsBetter: false,
    getter: (p) => p.goalFunding,
  },
  {
    id: "investment",
    group: "allocation",
    label: "Investment",
    hint: "New capital compounding in market investments",
    narrative:
      "Capital flowing into productive assets. Compounds silently. The stance with the most here wins the long run — but may leave goals slower.",
    unit: "currency",
    lowerIsBetter: false,
    getter: (p) => p.investmentContribution,
  },
  {
    id: "debtExtra",
    group: "allocation",
    label: "Debt acceleration",
    hint: "Extra payment beyond required debt service",
    narrative:
      "How aggressively each stance attacks existing debt. High-APR debt is a silent compounding loss — clearing it fast is often the best return available.",
    unit: "currency",
    lowerIsBetter: false,
    getter: (p) => p.debtExtra,
  },
  {
    id: "liquidity",
    group: "allocation",
    label: "Liquidity reserve",
    hint: "Monthly buildup of the emergency buffer",
    narrative:
      "The insurance layer. Doesn't accelerate anything, but absorbs shocks. A thin buffer means any income disruption hits your plan directly.",
    unit: "currency",
    lowerIsBetter: false,
    getter: (p) => p.liquidityReserve,
  },
  {
    id: "propertyEta",
    group: "outcomes",
    label: "Property ETA",
    hint: "Months until the property goal is fully funded",
    narrative:
      "The time horizon until your primary property goal reaches its target under each stance. Shorter is better — but comes with trade-offs elsewhere.",
    unit: "months",
    lowerIsBetter: true,
    sourceLabel: "goal funding",
    getter: (_, o) => o.propMo,
  },
  {
    id: "debtFree",
    group: "outcomes",
    label: "Debt free",
    hint: "Months until all liabilities are cleared",
    narrative:
      "The month when your last debt gets paid off. After this, that monthly payment permanently joins your saving capacity.",
    unit: "months",
    lowerIsBetter: true,
    sourceLabel: "debt service and acceleration",
    getter: (_, o) => o.debtMo,
  },
  {
    id: "emergency",
    group: "outcomes",
    label: "Emergency fund",
    hint: "Months until the emergency reserve hits target",
    narrative:
      "How fast each stance gets you to a proper safety buffer. Stances that skip liquidity reserve simply defer this outcome — it's a design choice, not a limit.",
    unit: "months",
    lowerIsBetter: true,
    sourceLabel: "liquidity reserve",
    getter: (_, o) => o.emerMo,
  },
  {
    id: "portfolio",
    group: "outcomes",
    label: "Portfolio target",
    hint: "Months until investment target is reached",
    narrative:
      "Time to reach your invested-capital target. Sensitive to how much each stance contributes to markets every month.",
    unit: "months",
    lowerIsBetter: true,
    sourceLabel: "investment contribution",
    getter: (_, o) => o.portMo,
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

export default function StanceExplorer({
  plans,
  activeStance,
  outcomes,
}: Props) {
  const [index, setIndex] = useState(0);
  const dim = DIMENSIONS[index]!;

  const values = plans.map((p) => ({
    stance: p.stance,
    value: dim.getter(p, outcomes[p.stance]),
  }));

  const validValues = values
    .map((v) => v.value)
    .filter((v) => v < 999 && v > 0);

  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 1;
  const winnerValue =
    validValues.length === 0
      ? null
      : dim.lowerIsBetter
        ? Math.min(...validValues)
        : Math.max(...validValues);

  // A value is "skipped" when:
  // - outcome dimension: blocked by 0 allocation (999 sentinel)
  // - allocation dimension: the stance explicitly puts 0 into this bucket
  function isSkipped(v: number): boolean {
    if (v >= 999) return true;
    if (dim.group === "allocation" && v <= 0) return true;
    return false;
  }

  function formatValue(v: number): string {
    if (isSkipped(v)) return "Skipped";
    if (dim.unit === "currency") {
      return `${formatCurrency(v, { compact: true })}/mo`;
    }
    if (v <= 0) return "—";
    return `${v} mo`;
  }

  const skippedStances = values
    .filter((v) => isSkipped(v.value))
    .map((v) => v.stance);

  const canPrev = index > 0;
  const canNext = index < DIMENSIONS.length - 1;

  // Compute winner stance for badge
  const winnerStance =
    winnerValue !== null
      ? values.find((v) => v.value === winnerValue)?.stance
      : null;

  const allocationDims = DIMENSIONS.filter((d) => d.group === "allocation");
  const outcomeDims = DIMENSIONS.filter((d) => d.group === "outcomes");

  return (
    <div className="flex flex-col gap-8">
      {/* ── Navigation — two explicit groups + prev/next ──────── */}
      <div>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Pick a dimension to compare
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Eight facets across two groups. Scroll with the arrows or click
              a pill to jump.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => canPrev && setIndex((i) => i - 1)}
              disabled={!canPrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-secondary)",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => canNext && setIndex((i) => i + 1)}
              disabled={!canNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-secondary)",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Two groups side-by-side, each with its own header */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <GroupBlock
            meta={GROUP_META.allocation}
            dimensions={allocationDims}
            activeIndex={index}
            onSelect={setIndex}
            globalOffset={0}
            isActiveGroup={dim.group === "allocation"}
          />
          <GroupBlock
            meta={GROUP_META.outcomes}
            dimensions={outcomeDims}
            activeIndex={index}
            onSelect={setIndex}
            globalOffset={allocationDims.length}
            isActiveGroup={dim.group === "outcomes"}
          />
        </div>
      </div>

      {/* ── Main panel — dimension focus ─────────────────────── */}
      <div
        key={dim.id}
        className="flex flex-col gap-8 rounded-2xl p-8"
        style={{ backgroundColor: "var(--color-vellum-deep)" }}
      >
        {/* Dimension title block */}
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-xl">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--color-accent)" }}
            >
              {GROUP_META[dim.group].label}
            </p>
            <h3
              className="mt-3 text-[32px] font-bold tracking-tight"
              style={{
                color: "var(--color-ink)",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {dim.label}
            </h3>
            <p
              className="mt-3 text-[14px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {dim.hint}
            </p>
            <p
              className="mt-4 text-[14px] leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {dim.narrative}
            </p>
          </div>

          {winnerStance && winnerValue !== null && (
            <div
              className="flex shrink-0 flex-col items-center gap-2 rounded-xl px-5 py-4"
              style={{
                backgroundColor: STANCE_COLORS[winnerStance] + "22",
                borderLeft: `3px solid ${STANCE_COLORS[winnerStance]}`,
              }}
            >
              <Trophy
                size={18}
                style={{ color: STANCE_COLORS[winnerStance] }}
              />
              <p
                className="text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {dim.lowerIsBetter ? "Fastest" : "Highest"}
              </p>
              <p
                className="text-[14px] font-bold"
                style={{ color: STANCE_COLORS[winnerStance] }}
              >
                {STANCE_LABELS[winnerStance]}
              </p>
              <p
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {formatValue(winnerValue)}
              </p>
            </div>
          )}
        </div>

        {/* Bars — 3 stances stacked */}
        <div className="flex flex-col gap-4">
          {values.map((v) => {
            const isActive = v.stance === activeStance;
            const skipped = isSkipped(v.value);
            const isWinner =
              !skipped && v.value === winnerValue && v.value > 0;
            const pct = skipped ? 0 : (v.value / maxValue) * 100;
            const color = STANCE_COLORS[v.stance];

            return (
              <div key={v.stance} className="flex items-center gap-4">
                <div className="flex w-28 shrink-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{
                      backgroundColor: color,
                      opacity: isActive ? 1 : 0.5,
                    }}
                  />
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {STANCE_LABELS[v.stance]}
                  </span>
                </div>

                <div
                  className="relative h-12 flex-1 overflow-hidden rounded-xl"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  {skipped ? (
                    /* Skipped state — dashed border, empty, with inline note */
                    <div
                      className="absolute inset-1 flex items-center justify-center rounded-lg"
                      style={{
                        border: `1.5px dashed ${color}`,
                        opacity: isActive ? 0.75 : 0.4,
                      }}
                    >
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color }}
                      >
                        {dim.group === "allocation"
                          ? "This stance puts nothing here"
                          : "No allocation feeds this outcome"}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="h-full rounded-xl transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: color,
                        opacity: isActive ? 0.9 : 0.4,
                      }}
                    />
                  )}
                  {isWinner && !skipped && (
                    <span
                      className="absolute inset-y-0 right-3 flex items-center gap-1"
                      style={{
                        color: isActive ? "#fff" : color,
                      }}
                    >
                      <Trophy size={13} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Best
                      </span>
                    </span>
                  )}
                </div>

                <span
                  className="w-28 shrink-0 text-right text-[16px] font-bold tabular-nums"
                  style={{
                    color: skipped
                      ? "var(--color-text-muted)"
                      : isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {formatValue(v.value)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Skipped contextual note */}
        {skippedStances.length > 0 && (
          <div
            className="rounded-xl px-5 py-4"
            style={{
              backgroundColor: "var(--color-surface)",
              borderLeft: "3px solid var(--color-text-muted)",
            }}
          >
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <strong style={{ color: "var(--color-text-primary)" }}>
                Why skipped?
              </strong>{" "}
              {dim.group === "allocation" ? (
                <>
                  The{" "}
                  {skippedStances
                    .map((s) => STANCE_LABELS[s])
                    .join(" and ")}{" "}
                  {skippedStances.length === 1 ? "stance puts" : "stances put"}{" "}
                  zero into this bucket — it&apos;s a deliberate choice. That
                  capacity is being redirected elsewhere in the stance&apos;s
                  design. Switch to a stance that funds this to see how
                  quickly it would grow.
                </>
              ) : (
                <>
                  The{" "}
                  {skippedStances
                    .map((s) => STANCE_LABELS[s])
                    .join(" and ")}{" "}
                  {skippedStances.length === 1 ? "stance puts" : "stances put"}{" "}
                  zero into {dim.sourceLabel ?? "the allocation that feeds this"},
                  so this outcome isn&apos;t moving under{" "}
                  {skippedStances.length === 1 ? "it" : "them"}. Switch to a
                  stance that funds {dim.sourceLabel ?? "that bucket"} and the
                  math re-opens immediately.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Progress — dot indicator */}
      <div className="flex items-center justify-center gap-2">
        {DIMENSIONS.map((d, i) => {
          const isActive = i === index;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setIndex(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: isActive ? "32px" : "8px",
                backgroundColor: isActive
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── GroupBlock — one category of dimension pills with header ──── */
function GroupBlock({
  meta,
  dimensions,
  activeIndex,
  onSelect,
  globalOffset,
  isActiveGroup,
}: {
  meta: { label: string; hint: string };
  dimensions: Dimension[];
  activeIndex: number;
  onSelect: (i: number) => void;
  globalOffset: number;
  isActiveGroup: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        backgroundColor: "var(--color-surface-low)",
        outline: isActiveGroup
          ? "2px solid var(--color-accent)"
          : "2px solid transparent",
      }}
    >
      <div className="mb-3">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{
            color: isActiveGroup
              ? "var(--color-accent)"
              : "var(--color-text-muted)",
          }}
        >
          {meta.label}
        </p>
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {meta.hint}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {dimensions.map((d, i) => {
          const globalIdx = globalOffset + i;
          const isActive = globalIdx === activeIndex;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(globalIdx)}
              className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: isActive
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: isActive ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
