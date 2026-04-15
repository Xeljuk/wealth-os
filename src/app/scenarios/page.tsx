"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { useToast } from "@/components/ui/Toast";
import { Skeleton, useDelayedLoading } from "@/components/ui/Skeleton";
import { markVisited } from "@/components/copilot/SetupChecklist";
import { formatCurrency, formatMonth } from "@/lib/format";
import type { PlanStance, PlanVariant, Scenario } from "@/lib/types";
import ScenarioFormModal, {
  type ScenarioFormValues,
} from "@/components/scenarios/ScenarioFormModal";
import StanceExplorer, {
  type OutcomeSet,
} from "@/components/scenarios/StanceExplorer";
import {
  Shield,
  Scale,
  Zap,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  ShoppingBag,
  TrendingDown,
  Scissors,
  Rocket,
} from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";

type Outcomes = {
  propMo: number;
  emerMo: number;
  portMo: number;
  debtMo: number;
};

type EnrichedPlan = PlanVariant & { out: Outcomes };

function computeOutcomes(
  plan: PlanVariant,
  gaps: { property: number; emergency: number; portfolio: number },
  baseDebtService: number,
  totalLiabilities: number,
): Outcomes {
  const propMo =
    plan.goalFunding > 0 ? Math.ceil(gaps.property / plan.goalFunding) : 999;
  const emerMo =
    plan.liquidityReserve > 0
      ? Math.ceil(gaps.emergency / plan.liquidityReserve)
      : 999;
  const portMo =
    plan.investmentContribution > 0
      ? Math.ceil(gaps.portfolio / plan.investmentContribution)
      : 999;
  const debtMo =
    baseDebtService + plan.debtExtra > 0
      ? Math.ceil(totalLiabilities / (baseDebtService + plan.debtExtra))
      : 999;
  return { propMo, emerMo, portMo, debtMo };
}

/* ── Stance config ─────────────────────────────────────────────── */
const STANCE_META: Record<
  PlanStance,
  {
    label: string;
    tagline: string;
    Icon: ComponentType<{ size?: number }>;
    accent: string;
  }
> = {
  safe: {
    label: "Safe",
    tagline: "Pay down debt, build buffer first",
    Icon: Shield,
    accent: "var(--color-positive)",
  },
  balanced: {
    label: "Balanced",
    tagline: "Steady progress on all fronts",
    Icon: Scale,
    accent: "var(--color-accent)",
  },
  aggressive: {
    label: "Aggressive",
    tagline: "Push goals faster, thinner margin",
    Icon: Zap,
    accent: "var(--color-warning)",
  },
};

/* ── Tradeoffs per stance ──────────────────────────────────────── */
const TRADEOFF: Record<PlanStance, string> = {
  safe:
    "Debt clears fastest and your buffer grows, giving you the most financial safety. The tradeoff: your primary goal stretches longer. Choose this if stability matters most right now.",
  balanced:
    "Moderate progress on every front — goals move forward, investments keep growing, and debt still reduces. You keep the most options open. Choose this if you want steady progress without big risks.",
  aggressive:
    "Your primary goal reaches its target on the fastest timeline. The tradeoff: no buffer is being built, so any income disruption hits harder. Choose this if you can tolerate a thinner margin for faster results.",
};

/* ── Scenario type meta (label, icon, accent color) ───────────── */
const SCENARIO_TYPE_META: Record<
  string,
  {
    label: string;
    Icon: ComponentType<{ size?: number }>;
    color: string;
    bg: string;
  }
> = {
  debt_vs_invest: {
    label: "Debt Strategy",
    Icon: Shield,
    color: "var(--color-warning)",
    bg: "var(--color-warning-light)",
  },
  major_purchase: {
    label: "Major Purchase",
    Icon: ShoppingBag,
    color: "var(--color-accent)",
    bg: "var(--color-accent-light)",
  },
  income_change: {
    label: "Income Risk",
    Icon: TrendingDown,
    color: "var(--color-negative)",
    bg: "var(--color-negative-light)",
  },
  expense_reduction: {
    label: "Expense Lever",
    Icon: Scissors,
    color: "var(--color-positive)",
    bg: "var(--color-positive-light)",
  },
  aggressive_saving: {
    label: "Goal Boost",
    Icon: Rocket,
    color: "var(--color-accent)",
    bg: "var(--color-accent-light)",
  },
};

const DEFAULT_SCENARIO_META = {
  label: "Scenario",
  Icon: Lightbulb,
  color: "var(--color-text-muted)",
  bg: "var(--color-surface-low)",
};

type ScenarioModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; scenario: Scenario };

/* ── Strategic intelligence ────────────────────────────────────── */
const intelligence: { type: string; text: string }[] = [
  {
    type: "info",
    text: "No stance reaches the original property target without extending the timeline — but all paths make meaningful progress. Timeline and monthly room are the main levers.",
  },
  {
    type: "positive",
    text: "Safe stance clears debt the fastest. Once debt is gone, the freed monthly capacity can accelerate any goal you choose next.",
  },
  {
    type: "attention",
    text: "Aggressive stance puts nothing toward a buffer. If income drops unexpectedly, you would need to adjust quickly. Consider whether that risk fits your situation.",
  },
  {
    type: "info",
    text: "Balanced is a good default — steady progress while keeping your options open. You can always switch later as circumstances change.",
  },
];

const INS_CFG: Record<
  string,
  { color: string; Icon: ComponentType<{ size?: number }> }
> = {
  attention: { color: "var(--color-warning)", Icon: AlertTriangle },
  positive: { color: "var(--color-positive)", Icon: TrendingUp },
  info: { color: "var(--color-accent)", Icon: Lightbulb },
};

/* ── Page ──────────────────────────────────────────────────────── */
export default function ScenarioSimulator() {
  const {
    snapshot,
    currentStance: active,
    setStance: setActive,
    refreshSnapshot,
    alphaStatus,
    isLoading,
  } = useWealth();
  const showSkeleton = useDelayedLoading(isLoading);
  const toast = useToast();

  useEffect(() => {
    markVisited("visitedScenarios");
  }, []);
  const { plans, scenarios: rawScenarios, cashFlow: cf } = snapshot;

  const [modal, setModal] = useState<ScenarioModalState>({ kind: "closed" });
  const [pendingScenarioIds, setPendingScenarioIds] = useState<Set<string>>(
    () => new Set(),
  );
  const scenarios = useMemo(
    () => rawScenarios.filter((s) => !pendingScenarioIds.has(s.id)),
    [rawScenarios, pendingScenarioIds],
  );

  async function handleCreate(values: ScenarioFormValues) {
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setModal({ kind: "closed" });
    toast.success(`Scenario "${values.name}" added`);
  }

  async function handleUpdate(id: string, values: ScenarioFormValues) {
    const res = await fetch(`/api/scenarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setModal({ kind: "closed" });
    toast.success(`Scenario "${values.name}" updated`);
  }

  function handleDelete(sc: Scenario) {
    setPendingScenarioIds((prev) => new Set(prev).add(sc.id));
    toast.undo({
      message: `Scenario "${sc.name}" deleted`,
      onUndo: () => {
        setPendingScenarioIds((prev) => {
          const next = new Set(prev);
          next.delete(sc.id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          const res = await fetch(`/api/scenarios/${sc.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Request failed (${res.status})`);
          }
          await refreshSnapshot();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete scenario",
          );
        } finally {
          setPendingScenarioIds((prev) => {
            const next = new Set(prev);
            next.delete(sc.id);
            return next;
          });
        }
      },
    });
  }

  const enriched = useMemo((): EnrichedPlan[] => {
    const sorted = [...snapshot.goals].sort((a, b) => a.priority - b.priority);
    const [g1, g2, g3] = sorted;
    const gap = (g: typeof sorted[number] | undefined) =>
      g ? Math.max(0, g.targetAmount - g.currentAmount) : 0;
    const gaps = {
      property: gap(g1),
      emergency: gap(g2),
      portfolio: gap(g3),
    };
    const baseDebtService = snapshot.cashFlow.totalDebtService;
    const totalLiabilities = snapshot.balanceSheet.totalLiabilities;

    return plans.map((p) => ({
      ...p,
      out: computeOutcomes(p, gaps, baseDebtService, totalLiabilities),
    }));
  }, [snapshot, plans]);

  const activePlan = enriched.find((p) => p.stance === active)!;

  const allocBuckets = [
    {
      label: "Goal Funding",
      value: activePlan.goalFunding,
      color: "var(--color-accent)",
    },
    {
      label: "Investment",
      value: activePlan.investmentContribution,
      color: "var(--color-positive)",
    },
    {
      label: "Debt Extra",
      value: activePlan.debtExtra,
      color: "var(--color-negative)",
    },
    {
      label: "Liquidity",
      value: activePlan.liquidityReserve,
      color: "var(--color-warning)",
    },
  ];

  const missingSetup = [
    !alphaStatus.hasIncome ? "monthly engine" : null,
    !alphaStatus.hasLiabilities ? "liabilities" : null,
    !alphaStatus.hasGoals ? "goals" : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (showSkeleton) {
    return (
      <PageShell
        eyebrow={`Decision Lab · ${formatMonth(snapshot.period)}`}
        title="Preview every path before you commit."
        subtitle="Each stance shifts your monthly room between goals, debt, and reserves. Each what-if runs the trade-off against your real numbers — so you see what changes, not just what you hope."
      >
        <ScenariosSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={`Decision Lab · ${formatMonth(snapshot.period)}`}
      title="Preview every path before you commit."
      subtitle="Each stance shifts your monthly room between goals, debt, and reserves. Each what-if runs the trade-off against your real numbers — so you see what changes, not just what you hope."
    >
      {missingSetup && (
        <div
          className="mb-10 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-vellum-deep)" }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Scenario comparisons are currently low-confidence and directional.
            Add {missingSetup} in{" "}
            <Link
              href="/alpha-setup"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Alpha Setup
            </Link>{" "}
            to improve trade-off confidence.
          </p>
        </div>
      )}

      {/* ── Stance selector — 3 tile comparison ────────────────── */}
      <div className="stagger-enter stagger-1 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {enriched.map((plan) => {
          const meta = STANCE_META[plan.stance];
          const isActive = plan.stance === active;
          const stanceMetrics: { label: string; value: number }[] = [
            { label: "Goal fund", value: plan.goalFunding },
            { label: "Debt extra", value: plan.debtExtra },
            { label: "Invest", value: plan.investmentContribution },
            { label: "Liquidity", value: plan.liquidityReserve },
          ];

          return (
            <button
              key={plan.stance}
              onClick={() => setActive(plan.stance)}
              className="group flex flex-col gap-5 rounded-2xl p-7 text-left transition-all duration-300 hover:-translate-y-0.5"
              style={{
                backgroundColor: isActive
                  ? "var(--color-surface)"
                  : "var(--color-vellum-deep)",
                boxShadow: isActive
                  ? `0 18px 48px -22px ${meta.accent}40, inset 0 0 0 2px ${meta.accent}`
                  : "none",
              }}
            >
              {/* Header: icon + label + active indicator */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition-all"
                    style={{
                      backgroundColor: isActive
                        ? meta.accent
                        : "var(--color-surface-low)",
                      color: isActive ? "#fff" : meta.accent,
                    }}
                  >
                    <meta.Icon size={20} />
                  </span>
                  <div>
                    <p
                      className="text-[20px] font-bold tracking-tight"
                      style={{
                        color: isActive
                          ? meta.accent
                          : "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {meta.label}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {meta.tagline}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      backgroundColor: meta.accent,
                      color: "#fff",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>

              {/* Metric grid — 2×2 */}
              <div
                className="grid grid-cols-2 gap-y-3 gap-x-4 border-t pt-4"
                style={{ borderColor: "var(--color-border-light)" }}
              >
                {stanceMetrics.map((m) => (
                  <div key={m.label} className="flex flex-col">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {m.label}
                    </span>
                    <span
                      className="mt-0.5 text-[15px] font-semibold tabular-nums"
                      style={{
                        color:
                          m.value > 0
                            ? "var(--color-text-primary)"
                            : "var(--color-text-muted)",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {m.value > 0
                        ? `${formatCurrency(m.value, { compact: true })}/mo`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active stance — how your room splits ──────────────── */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-2">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="label-meta">Active stance · {STANCE_META[active].label}</p>
            <h2 className="display-page mt-2">How your monthly room splits.</h2>
            <p className="lead-text mt-4">{activePlan.description}</p>
          </div>
          <div className="text-right">
            <p className="label-meta">Allocatable</p>
            <p
              className="mt-2 text-[32px] font-bold tabular-nums"
              style={{
                color: "var(--color-accent)",
                letterSpacing: "-0.02em",
              }}
            >
              {formatCurrency(cf.allocatableSurplus, { compact: true })}/mo
            </p>
          </div>
        </div>

        {/* Stacked bar */}
        <div
          className="flex h-3 gap-0.5 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--color-surface-low)" }}
        >
          {allocBuckets.map((b) => {
            const pct =
              cf.allocatableSurplus > 0
                ? (b.value / cf.allocatableSurplus) * 100
                : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={b.label}
                style={{
                  flex: `${pct} 0 0%`,
                  backgroundColor: b.color,
                  opacity: 0.78,
                }}
              />
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {allocBuckets.map((b) => (
            <div key={b.label}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: b.color, opacity: 0.78 }}
                />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {b.label}
                </span>
              </div>
              <p
                className="mt-1 text-[17px] font-semibold tabular-nums"
                style={{
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.015em",
                }}
              >
                {formatCurrency(b.value, { compact: true })}/mo
              </p>
            </div>
          ))}
        </div>

        <p className="body-editorial mt-8">{TRADEOFF[active]}</p>
      </div>

      {/* ── Explorer — single interactive dimension walkthrough ─ */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-3">
        <div className="mb-10 max-w-2xl">
          <p className="label-meta">Explorer</p>
          <h2 className="display-page mt-2">
            Step through every dimension.
          </h2>
          <p className="lead-text mt-4">
            Eight facets across allocation and outcomes. Pick any one to see
            how each stance stacks up — with the story behind why it matters.
          </p>
        </div>
        <StanceExplorer
          plans={enriched}
          activeStance={active}
          outcomes={enriched.reduce<Record<PlanStance, OutcomeSet>>(
            (acc, p) => {
              acc[p.stance] = {
                propMo: p.out.propMo,
                emerMo: p.out.emerMo,
                portMo: p.out.portMo,
                debtMo: p.out.debtMo,
              };
              return acc;
            },
            {} as Record<PlanStance, OutcomeSet>,
          )}
        />
      </div>

      {/* ── What-if scenarios ────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-4">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">What-if experiments</p>
            <h2 className="display-page mt-2">
              Custom scenarios, computed live.
            </h2>
            <p className="lead-text mt-4">
              Each experiment runs its trade-off against your real numbers.
              Adjust parameters and see how surplus, timeline, and 12-month
              net worth shift.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ kind: "create" })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> New scenario
          </button>
        </div>

        {scenarios.length === 0 ? (
          <p
            className="body-editorial"
            style={{ color: "var(--color-text-muted)" }}
          >
            No scenarios yet. Click &quot;New scenario&quot; to run a what-if
            against your current financial model.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {scenarios.map((sc) => {
              const impactBarPct = Math.min(
                100,
                (Math.abs(sc.result.surplusImpact) /
                  Math.max(cf.allocatableSurplus, 1)) *
                  100,
              );
              const isPositive = sc.result.surplusImpact > 0;
              const isNegative = sc.result.surplusImpact < 0;
              const typeMeta = SCENARIO_TYPE_META[sc.type] ?? DEFAULT_SCENARIO_META;
              const TypeIcon = typeMeta.Icon;

              return (
                <div
                  key={sc.id}
                  className="flex flex-col gap-4 rounded-2xl p-6"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderLeft: `4px solid ${typeMeta.color}`,
                    boxShadow: "0 10px 32px -18px rgba(45,52,53,0.10)",
                  }}
                >
                  {/* Header row: icon chip + type chip + actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: typeMeta.bg,
                          color: typeMeta.color,
                        }}
                      >
                        <TypeIcon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span
                          className="inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                          style={{
                            backgroundColor: typeMeta.bg,
                            color: typeMeta.color,
                          }}
                        >
                          {typeMeta.label}
                        </span>
                        <h3
                          className="mt-2 text-[18px] font-semibold tracking-tight"
                          style={{
                            color: "var(--color-text-primary)",
                            letterSpacing: "-0.015em",
                          }}
                        >
                          {sc.name}
                        </h3>
                        <p
                          className="mt-0.5 text-[13px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {sc.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModal({ kind: "edit", scenario: sc })}
                        className="rounded p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                        title="Edit scenario"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sc)}
                        className="rounded p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-negative)" }}
                        title="Delete scenario"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Surplus impact visual bar */}
                  {sc.result.surplusImpact !== 0 && (
                    <div className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Surplus
                      </span>
                      <div
                        className="relative h-2 flex-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--color-surface-low)" }}
                      >
                        <div
                          className="absolute inset-y-0"
                          style={{
                            left: isNegative
                              ? `${50 - impactBarPct / 2}%`
                              : "50%",
                            width: `${impactBarPct / 2}%`,
                            backgroundColor: isPositive
                              ? "var(--color-positive)"
                              : "var(--color-negative)",
                            opacity: 0.82,
                          }}
                        />
                        <div
                          className="absolute inset-y-0"
                          style={{
                            left: "50%",
                            width: "1px",
                            backgroundColor: "var(--color-text-muted)",
                          }}
                        />
                      </div>
                      <span
                        className="shrink-0 text-[14px] font-bold tabular-nums"
                        style={{
                          color: isPositive
                            ? "var(--color-positive)"
                            : "var(--color-negative)",
                        }}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(sc.result.surplusImpact, { compact: true })}/mo
                      </span>
                    </div>
                  )}

                  <p
                    className="text-[14px] font-medium leading-relaxed"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {sc.result.headline}
                  </p>

                  {/* Meta panel */}
                  <div
                    className="flex items-center justify-between rounded-lg px-4 py-3"
                    style={{ backgroundColor: "var(--color-surface-low)" }}
                  >
                    <div>
                      <p
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        12 mo net worth
                      </p>
                      <p
                        className="mt-0.5 text-[14px] font-semibold tabular-nums"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatCurrency(sc.result.netWorthProjection12m, {
                          compact: true,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Timeline shift
                      </p>
                      <p
                        className="mt-0.5 text-[13px] font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {sc.result.goalTimelineShift}
                      </p>
                    </div>
                  </div>

                  {sc.result.tradeoffs.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {sc.result.tradeoffs.map((t, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[12px] leading-relaxed"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: "var(--color-text-muted)" }}
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Key takeaways — flat intelligence ────────────────── */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-5">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Key takeaways</p>
            <h2 className="display-page mt-2">What the lab is telling you.</h2>
          </div>
          <Link
            href="/copilot"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Ask AI Copilot <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          {intelligence.map((ins, i) => {
            const cfg = INS_CFG[ins.type] ?? INS_CFG.info;
            const InsIcon = cfg.Icon;
            return (
              <div
                key={i}
                className="flex gap-4 border-l-2 py-1 pl-5"
                style={{ borderLeftColor: cfg.color }}
              >
                <span className="mt-0.5 shrink-0" style={{ color: cfg.color }}>
                  <InsIcon size={14} />
                </span>
                <p
                  className="body-editorial mt-0"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {ins.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {modal.kind === "create" && (
        <ScenarioFormModal
          mode="create"
          onClose={() => setModal({ kind: "closed" })}
          onSubmit={handleCreate}
        />
      )}
      {modal.kind === "edit" && (
        <ScenarioFormModal
          mode="edit"
          initial={modal.scenario}
          onClose={() => setModal({ kind: "closed" })}
          onSubmit={(values) => handleUpdate(modal.scenario.id, values)}
        />
      )}
    </PageShell>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
export function ScenariosSkeleton() {
  return (
    <>
      {/* 3 stance cards */}
      <div className="stagger-enter stagger-1 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-vellum-deep)" }}
          >
            <Skeleton width={70} height={10} />
            <Skeleton width="75%" height={24} />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  <Skeleton width="70%" height={9} />
                  <Skeleton width="55%" height={14} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active stance narrative */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-2">
        <div className="mb-8 flex flex-col gap-3">
          <Skeleton width={100} height={12} />
          <Skeleton width={360} height={36} />
        </div>
        <Skeleton width="100%" height={220} rounded="rounded-2xl" />
      </div>

      {/* What-if scenarios list */}
      <div className="section-breath-lg hairline-top pt-16 stagger-enter stagger-3">
        <div className="mb-8 flex flex-col gap-3">
          <Skeleton width={120} height={12} />
          <Skeleton width={280} height={36} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2" style={{ width: "60%" }}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="90%" height={12} />
              </div>
              <Skeleton width={120} height={32} rounded="rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
