"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { GoalTrajectory } from "@/lib/wealth-context";
import type { BalanceSheet, MonthlyCashFlow, PlanVariant } from "@/lib/types";
import { Check, Star, ChevronLeft, ChevronRight } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface GoalSnap {
  id: string;
  name: string;
  pct: number;
  completed: boolean;
}

interface MonthNode {
  month: number;
  label: string;
  netWorth: number;
  debtRemaining: number;
  goals: GoalSnap[];
  milestones: string[];
}

interface Props {
  balanceSheet: BalanceSheet;
  cashFlow: MonthlyCashFlow;
  goalTrajectories: GoalTrajectory[];
  activePlan: PlanVariant;
  /** YYYY-MM anchor period for deterministic month labels. */
  period: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const WJ_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic month label relative to a YYYY-MM anchor. SSR-safe. */
function monthLabel(anchor: string, offset: number): string {
  const [year, month] = anchor.split("-").map(Number);
  if (!year || !month) return "";
  const total = (month - 1) + offset;
  const targetYear = year + Math.floor(total / 12);
  const idx = ((total % 12) + 12) % 12;
  const yr2 = String(targetYear).slice(-2);
  return `${WJ_MONTH_NAMES[idx]} ${yr2}`;
}

const GOAL_COLORS = [
  "var(--color-accent)",
  "var(--color-positive)",
  "var(--color-warning)",
];

const MONTHS_PER_SLIDE = 6;
const HORIZON = 36;

/* ── Component ─────────────────────────────────────────────────── */

export default function WealthJourney({
  balanceSheet: bs,
  cashFlow: cf,
  goalTrajectories,
  activePlan,
  period,
}: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nodes = useMemo((): MonthNode[] => {
    const monthlySaving = cf.surplus > 0 ? cf.surplus : 0;
    const investedBase = bs.investedAssets;
    const monthlyReturn = 0.06 / 12;

    let debt = bs.totalLiabilities;
    const debtPayment = cf.totalDebtService + activePlan.debtExtra;
    let debtCleared = debt <= 0;

    const goalState = goalTrajectories.map((g) => ({
      id: g.id,
      name: g.name,
      current: g.currentAmount,
      target: g.targetAmount,
      allocation: g.allocation,
      completed: g.currentAmount >= g.targetAmount,
    }));

    let investments = investedBase;
    const otherAssets = bs.assets.reduce((s, a) => s + a.value, 0) - investedBase;
    const result: MonthNode[] = [];

    for (let m = 0; m <= HORIZON; m++) {
      const milestones: string[] = [];

      if (m > 0) {
        investments = investments * (1 + monthlyReturn) + activePlan.investmentContribution;

        if (!debtCleared) {
          debt = Math.max(0, debt - debtPayment);
          if (debt === 0) {
            debtCleared = true;
            milestones.push("Debt cleared");
          }
        }

        for (const g of goalState) {
          if (g.completed) continue;
          g.current = Math.min(g.current + g.allocation, g.target);
          if (g.current >= g.target) {
            g.completed = true;
            milestones.push(`${g.name}`);
          }
        }
      }

      result.push({
        month: m,
        label: m === 0 ? "Now" : monthLabel(period, m),
        netWorth: otherAssets + investments - debt,
        debtRemaining: debt,
        goals: goalState.map((g) => ({
          id: g.id,
          name: g.name,
          pct: g.target > 0 ? Math.min(Math.round((g.current / g.target) * 100), 100) : 0,
          completed: g.completed,
        })),
        milestones,
      });
    }
    return result;
  }, [bs, cf, goalTrajectories, activePlan, period]);

  const totalSlides = Math.ceil((nodes.length - 1) / MONTHS_PER_SLIDE);
  const slideNodes = useMemo(() => {
    const start = currentSlide * MONTHS_PER_SLIDE;
    const includeNow = currentSlide === 0;
    const from = includeNow ? 0 : start;
    const to = Math.min(start + MONTHS_PER_SLIDE + (includeNow ? 1 : 0), nodes.length);
    return nodes.slice(from, to);
  }, [nodes, currentSlide]);

  if (goalTrajectories.length === 0) return null;

  const visibleGoals = goalTrajectories.slice(0, 3);
  const slideStart = currentSlide * MONTHS_PER_SLIDE;
  const slideEnd = Math.min(slideStart + MONTHS_PER_SLIDE, HORIZON);
  const periodLabel =
    currentSlide === 0
      ? `Now — Month ${MONTHS_PER_SLIDE}`
      : `Month ${slideStart + 1} — ${slideEnd}`;

  return (
    <section
      className="atmospheric-shadow rounded-2xl"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="px-6 py-5 lg:px-7 lg:py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="label-meta" style={{ color: "var(--color-accent)" }}>
              Financial Journey
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {periodLabel}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {/* Dot indicators */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentSlide ? "16px" : "6px",
                    height: "6px",
                    backgroundColor:
                      i === currentSlide ? "var(--color-accent)" : "var(--color-border)",
                    opacity: i === currentSlide ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
              disabled={currentSlide === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity disabled:opacity-20"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-secondary)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentSlide((p) => Math.min(totalSlides - 1, p + 1))}
              disabled={currentSlide >= totalSlides - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-opacity disabled:opacity-20"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-secondary)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Goal legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {visibleGoals.map((g, i) => (
            <div key={g.id} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: GOAL_COLORS[i % GOAL_COLORS.length] }}
              />
              <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                {g.name}
              </span>
            </div>
          ))}
        </div>

        {/* Carousel slide */}
        <div className="mt-4 overflow-hidden">
          <div className="flex gap-0">
            {slideNodes.map((node, ni) => {
              const isNow = node.month === 0;
              const hasMilestone = node.milestones.length > 0;

              return (
                <div
                  key={node.month}
                  className="flex flex-1 flex-col items-center"
                  style={{ minWidth: 0 }}
                >
                  {/* Milestone badge */}
                  <div className="flex h-6 items-end justify-center">
                    {hasMilestone &&
                      node.milestones.map((ms, mi) => (
                        <span
                          key={mi}
                          className="whitespace-nowrap rounded-full px-1.5 py-px text-[8px] font-semibold"
                          style={{
                            backgroundColor: ms === "Debt cleared"
                              ? "var(--color-positive-light)"
                              : "var(--color-accent-light)",
                            color: ms === "Debt cleared"
                              ? "var(--color-positive)"
                              : "var(--color-accent)",
                          }}
                        >
                          {ms === "Debt cleared" ? "Debt ✓" : ms}
                        </span>
                      ))}
                  </div>

                  {/* Path node + connectors */}
                  <div className="flex w-full items-center">
                    {ni > 0 && (
                      <div
                        className="h-[2px] flex-1"
                        style={{
                          backgroundColor: hasMilestone ? "var(--color-accent)" : "var(--color-border)",
                          opacity: hasMilestone ? 0.5 : 0.25,
                        }}
                      />
                    )}
                    <div
                      className="relative z-10 flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: hasMilestone ? "22px" : isNow ? "18px" : "10px",
                        height: hasMilestone ? "22px" : isNow ? "18px" : "10px",
                        backgroundColor: hasMilestone
                          ? "var(--color-accent)"
                          : isNow
                            ? "var(--color-text-primary)"
                            : "var(--color-surface-low)",
                        border: isNow && !hasMilestone ? "2px solid var(--color-accent)" : "none",
                      }}
                    >
                      {hasMilestone && (
                        <span style={{ color: "#fff" }}>
                          {node.milestones.some((m) => m === "Debt cleared") ? (
                            <Star size={10} />
                          ) : (
                            <Check size={10} />
                          )}
                        </span>
                      )}
                    </div>
                    {ni < slideNodes.length - 1 && (
                      <div
                        className="h-[2px] flex-1"
                        style={{ backgroundColor: "var(--color-border)", opacity: 0.25 }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      color: isNow
                        ? "var(--color-text-primary)"
                        : hasMilestone
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {node.label}
                  </p>

                  {/* Goal mini progress */}
                  <div className="mt-1.5 flex w-full flex-col gap-1 px-0.5">
                    {node.goals.slice(0, 3).map((g, gi) => {
                      const color = GOAL_COLORS[gi % GOAL_COLORS.length];
                      return (
                        <div key={g.id} className="flex items-center gap-0.5">
                          <div
                            className="h-[4px] flex-1 overflow-hidden rounded-full"
                            style={{ backgroundColor: "var(--color-surface-low)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${g.pct}%`,
                                backgroundColor: color,
                                opacity: g.completed ? 1 : 0.65,
                              }}
                            />
                          </div>
                          {g.completed && (
                            <Check size={7} style={{ color, flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Net worth */}
                  <p
                    className="mt-1 text-[9px] font-medium tabular-nums"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {formatCurrency(node.netWorth, { compact: true })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p
          className="mt-3 text-[10px]"
          style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
        >
          Based on current stance and self-reported inputs · Planning view, not a guarantee
        </p>
      </div>
    </section>
  );
}
