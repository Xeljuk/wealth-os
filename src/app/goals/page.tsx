"use client";

import { useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { formatCurrency, formatMonth, formatMonthWithOffset } from "@/lib/format";
import type { Goal, GoalStatus, PlanStance } from "@/lib/types";
import GoalFormModal, { type GoalFormValues } from "@/components/goals/GoalFormModal";
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";

/* ── Stance-independent config ────────────────────────────────── */

const STATUS_STYLE: Record<
  GoalStatus,
  { label: string; color: string; bg: string }
> = {
  on_track: {
    label: "On Track",
    color: "var(--color-positive)",
    bg: "var(--color-positive-light)",
  },
  tight: {
    label: "Tight",
    color: "var(--color-warning)",
    bg: "var(--color-warning-light)",
  },
  at_risk: {
    label: "At Risk",
    color: "var(--color-negative)",
    bg: "var(--color-negative-light)",
  },
};

const INSIGHT_CONFIG: Record<
  string,
  { color: string; Icon: ComponentType<{ size?: number }> }
> = {
  attention: { color: "var(--color-warning)", Icon: AlertTriangle },
  positive: { color: "var(--color-positive)", Icon: TrendingUp },
  info: { color: "var(--color-accent)", Icon: Lightbulb },
};

const STANCE_LABEL: Record<PlanStance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};


/* ── Page ──────────────────────────────────────────────────────── */
type ModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; goal: Goal };

export default function GoalEngine() {
  const {
    snapshot,
    currentStance,
    goalTrajectories,
    totalGoalRequired,
    overcommitRatio,
    alphaStatus,
    refreshSnapshot,
  } = useWealth();

  const [modal, setModal] = useState<ModalState>({ kind: "closed" });
  const [actionError, setActionError] = useState<string | null>(null);

  const { goals, cashFlow: cf } = snapshot;
  const existingPriorities = goals.map((g) => g.priority);
  const canAddGoal = goals.length < 3;

  async function handleCreate(values: GoalFormValues) {
    setActionError(null);
    const res = await fetch("/api/goals", {
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
  }

  async function handleUpdate(id: string, values: GoalFormValues) {
    setActionError(null);
    const res = await fetch(`/api/goals/${id}`, {
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
  }

  async function handleDelete(goal: Goal) {
    if (!window.confirm(`Delete goal "${goal.name}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${res.status})`);
      }
      await refreshSnapshot();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  const addGoalButton = (
    <button
      type="button"
      onClick={() => setModal({ kind: "create" })}
      disabled={!canAddGoal}
      title={canAddGoal ? "Add a new goal" : "Maximum of 3 goals reached"}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
      style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
    >
      <Plus size={14} /> Add Goal
    </button>
  );

  // ── Empty state ──────────────────────────────────────────────
  if (goals.length === 0) {
    return (
      <PageShell
        eyebrow={`Goal Program · ${formatMonth(snapshot.period)}`}
        title="Your missions, defined."
        subtitle="Add at least one goal to activate directional timeline and funding tension analysis."
      >
        <div className="max-w-2xl">
          <p className="body-editorial">
            Start by adding your first goal, or define your full financial model in{" "}
            <Link
              href="/alpha-setup"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Alpha Setup
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => setModal({ kind: "create" })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add first goal
          </button>
        </div>

        {modal.kind === "create" && (
          <GoalFormModal
            mode="create"
            existingPriorities={[]}
            onClose={() => setModal({ kind: "closed" })}
            onSubmit={handleCreate}
          />
        )}
      </PageShell>
    );
  }

  const featured = goals[0];
  const secondary = goals.slice(1);
  const shortfall = totalGoalRequired - cf.allocatableSurplus;
  const featuredPct = Math.round((featured.currentAmount / featured.targetAmount) * 100);
  const ft = goalTrajectories[0];

  /* Intelligence items — stance-aware via ft.allocation */
  const intelligence: { type: string; text: string }[] = [
    {
      type: "attention",
      text: `Your goals need ${formatCurrency(totalGoalRequired)}/mo combined but ${formatCurrency(cf.allocatableSurplus)}/mo is available — a ${overcommitRatio.toFixed(1)}x stretch. Normal: it means prioritizing which goal moves fastest right now.`,
    },
    {
      type: "positive",
      text: "The highest-funded goal is closest to completion. Focusing on it first would finish it early, freeing that capacity for your next priority.",
    },
    {
      type: "info",
      text: `Your primary goal currently receives ${formatCurrency(ft.allocation, { compact: true })}/mo under the ${STANCE_LABEL[currentStance]} stance. Extending the timeline or switching stances on Scenarios can improve pace.`,
    },
    {
      type: "info",
      text: "Focusing on one goal at a time often produces faster results than spreading evenly across all goals.",
    },
  ];

  return (
    <PageShell
      eyebrow={`Goal Program · ${formatMonth(snapshot.period)}`}
      title="Your missions, in motion."
      subtitle="Your priorities, your numbers, and what they say about the path forward — including the trade-offs that can improve it."
      headerAction={addGoalButton}
    >
      {(!alphaStatus.hasCustomData || !alphaStatus.hasIncome) && (
        <div
          className="mb-16 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-vellum-deep)" }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Goal projections are lower-confidence when monthly engine data is
            incomplete.
            {alphaStatus.isDemoMode ? " You are currently in demo mode." : ""}{" "}
            <Link
              href="/alpha-setup"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Update setup →
            </Link>
          </p>
        </div>
      )}

      {actionError && (
        <div
          className="mb-10 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-negative-light)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-negative)" }}>
            {actionError}
          </p>
        </div>
      )}

      {/* ── Engine summary — 4-up stats strip, flat ───────────── */}
      <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
        <SummaryStat
          label="Active goals"
          value={String(goals.length)}
        />
        <SummaryStat
          label="Required monthly"
          value={formatCurrency(totalGoalRequired)}
          muted
        />
        <SummaryStat
          label="Available monthly"
          value={formatCurrency(cf.allocatableSurplus)}
          accent
        />
        <SummaryStat
          label="Stretch ratio"
          value={`${overcommitRatio.toFixed(1)}×`}
          warning
          hint={`${STANCE_LABEL[currentStance]} stance active`}
        />
      </div>

      {/* ── Primary mission — flat editorial hero ─────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="label-meta">Primary Mission</p>
            <h2 className="display-page mt-2">{featured.name}</h2>
            <p
              className="lead-text mt-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              At current allocation, this goal would take approximately{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {ft.projectedMonths >= 999 ? "—" : `${ft.projectedMonths} months`}
              </strong>
              {ft.projectedMonths < 999 &&
                ` (~${formatMonthWithOffset(snapshot.period, ft.projectedMonths)})`}
              . Adjusting your stance or prioritizing this goal first can
              meaningfully shorten the timeline.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: STATUS_STYLE[featured.status].bg,
                color: STATUS_STYLE[featured.status].color,
              }}
            >
              {STATUS_STYLE[featured.status].label}
            </span>
            <button
              type="button"
              onClick={() => setModal({ kind: "edit", goal: featured })}
              className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
              title="Edit goal"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(featured)}
              className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-negative)" }}
              title="Delete goal"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress row — display numbers + bar */}
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="flex items-baseline gap-4">
              <span
                className="text-[56px] font-bold tabular-nums"
                style={{
                  color: "var(--color-ink)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(featured.currentAmount, { compact: true })}
              </span>
              <span
                className="text-[17px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                of {formatCurrency(featured.targetAmount)}
              </span>
            </div>
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--color-surface-low)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${featuredPct}%`,
                  backgroundColor: STATUS_STYLE[featured.status].color,
                  opacity: 0.8,
                }}
              />
            </div>
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {featuredPct}% funded
            </p>
          </div>

          <div
            className="col-span-12 lg:col-span-4 lg:pl-6"
            style={{ borderLeft: "1px solid var(--color-border-light)" }}
          >
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
              <MiniStat
                label="Required pace"
                value={`${formatCurrency(featured.monthlyRequired, { compact: true })}/mo`}
              />
              <MiniStat
                label="Currently getting"
                value={`${formatCurrency(ft.allocation, { compact: true })}/mo`}
                accent
              />
              <MiniStat
                label="Funding pace"
                value={`${Math.round(ft.paceRatio * 100)}%`}
                warning={ft.paceRatio < 0.5}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Supporting goals — flat list ──────────────────────── */}
      {secondary.length > 0 && (
        <div className="section-breath-lg hairline-top pt-16">
          <div className="mb-8">
            <p className="label-meta">Supporting goals</p>
            <h2 className="display-page mt-2">The rest of your program.</h2>
          </div>

          <div className="grid grid-cols-12 gap-x-12 gap-y-10">
            {secondary.map((goal) => {
              const pct = Math.round(
                (goal.currentAmount / goal.targetAmount) * 100,
              );
              const gt = goalTrajectories.find((t) => t.id === goal.id)!;
              const status = STATUS_STYLE[goal.status];

              return (
                <div
                  key={goal.id}
                  className="col-span-12 flex flex-col gap-4 lg:col-span-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className="text-[20px] font-semibold tracking-tight"
                        style={{
                          color: "var(--color-text-primary)",
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {goal.name}
                      </h3>
                      <p
                        className="mt-1 text-[11px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Priority {goal.priority}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                        style={{
                          backgroundColor: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setModal({ kind: "edit", goal })}
                        className="rounded p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                        title="Edit goal"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(goal)}
                        className="rounded p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-negative)" }}
                        title="Delete goal"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-baseline justify-between text-[13px] tabular-nums">
                      <span
                        className="font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        of {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-1 overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--color-border-light)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: status.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Allocation */}
                  <div className="grid grid-cols-3 gap-4">
                    <MiniStat
                      label="Required"
                      value={`${formatCurrency(goal.monthlyRequired, { compact: true })}/mo`}
                      small
                    />
                    <MiniStat
                      label="Allocated"
                      value={`${formatCurrency(gt.allocation, { compact: true })}/mo`}
                      accent
                      small
                    />
                    <MiniStat
                      label="Pace"
                      value={`${Math.round(gt.paceRatio * 100)}%`}
                      small
                      warning={gt.paceRatio < 0.5}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Funding reality — comparison bars ─────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Funding reality</p>
          <h2 className="display-page mt-2">Where your plan strains.</h2>
          <p className="lead-text mt-4">
            Your goals share the same monthly room — here&apos;s how the split
            lands against what&apos;s actually available.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Required */}
          <div className="flex items-center gap-6">
            <span
              className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Required
            </span>
            <div className="flex-1">
              <div className="flex h-5 gap-px overflow-hidden rounded-md">
                {goalTrajectories.map((g) => {
                  const share = (g.monthlyRequired / totalGoalRequired) * 100;
                  return (
                    <div
                      key={g.id}
                      style={{
                        flex: `${share} 0 0%`,
                        backgroundColor: STATUS_STYLE[g.status].color,
                        opacity: 0.72,
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <span
              className="w-32 shrink-0 text-right text-[15px] font-semibold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatCurrency(totalGoalRequired, { compact: true })}/mo
            </span>
          </div>

          {/* Available */}
          <div className="flex items-center gap-6">
            <span
              className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
            >
              Available
            </span>
            <div className="flex-1">
              <div
                className="h-5 rounded-md"
                style={{
                  width: `${(cf.allocatableSurplus / totalGoalRequired) * 100}%`,
                  backgroundColor: "var(--color-accent)",
                  opacity: 0.72,
                }}
              />
            </div>
            <span
              className="w-32 shrink-0 text-right text-[15px] font-semibold tabular-nums"
              style={{ color: "var(--color-accent)" }}
            >
              {formatCurrency(cf.allocatableSurplus, { compact: true })}/mo
            </span>
          </div>

          {/* Shortfall */}
          <div
            className="mt-2 flex items-center justify-between rounded-xl px-5 py-3"
            style={{ backgroundColor: "var(--color-vellum-deep)" }}
          >
            <span className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              Monthly gap
            </span>
            <span
              className="text-[15px] font-bold tabular-nums"
              style={{ color: "var(--color-negative)" }}
            >
              −{formatCurrency(shortfall, { compact: true })}/mo
            </span>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-6">
            {goalTrajectories.map((g) => {
              const share = Math.round((g.monthlyRequired / totalGoalRequired) * 100);
              return (
                <div key={g.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: STATUS_STYLE[g.status].color,
                      opacity: 0.75,
                    }}
                  />
                  <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                    {g.name}
                  </span>
                  <span
                    className="text-[11px] font-medium tabular-nums"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {share}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Timeline outlook — trajectory table ──────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Timeline outlook</p>
          <h2 className="display-page mt-2">Each goal&apos;s projected path.</h2>
          <p className="lead-text mt-4">
            What each goal needs vs. what it currently receives under the{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {STANCE_LABEL[currentStance]}
            </strong>{" "}
            stance.
          </p>
        </div>

        <div className="flex flex-col">
          {/* Header row */}
          <div
            className="grid grid-cols-12 gap-4 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <span className="col-span-5">Goal</span>
            <span className="col-span-2 text-right">Required</span>
            <span className="col-span-2 text-right">Allocated</span>
            <span className="col-span-3 text-right">Projected</span>
          </div>

          {goalTrajectories.map((g) => {
            const status = STATUS_STYLE[g.status];
            return (
              <div
                key={g.id}
                className="grid grid-cols-12 items-center gap-4 py-5"
                style={{
                  borderBottom: "1px solid var(--color-border-light)",
                }}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span
                    className="text-[15px] font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {g.name}
                  </span>
                </div>
                <span
                  className="col-span-2 text-right text-[14px] tabular-nums"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {formatCurrency(g.monthlyRequired, { compact: true })}/mo
                </span>
                <span
                  className="col-span-2 text-right text-[14px] font-medium tabular-nums"
                  style={{
                    color:
                      g.allocation > 0
                        ? "var(--color-accent)"
                        : "var(--color-text-muted)",
                  }}
                >
                  {g.allocation > 0
                    ? `${formatCurrency(g.allocation, { compact: true })}/mo`
                    : "—"}
                </span>
                <span
                  className="col-span-3 text-right text-[15px] font-semibold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {g.projectedMonths >= 999 ? "—" : `~${g.projectedMonths} mo`}
                </span>
              </div>
            );
          })}
        </div>

        <p
          className="mt-5 text-[12px] leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          These timelines assume all goals are funded in parallel. Focusing on
          fewer at a time, or adjusting your stance, can shorten individual
          timelines noticeably.
        </p>
      </div>

      {/* ── What you can do — flat intelligence with accent bars ─ */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">What you can do</p>
            <h2 className="display-page mt-2">Moves that change the math.</h2>
          </div>
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Explore scenarios <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          {intelligence.map((ins, i) => {
            const cfg = INSIGHT_CONFIG[ins.type] ?? INSIGHT_CONFIG.info;
            const InsIcon = cfg.Icon;
            return (
              <div
                key={i}
                className="flex gap-4 border-l-2 py-1 pl-5"
                style={{ borderLeftColor: cfg.color }}
              >
                <span
                  className="mt-0.5 shrink-0"
                  style={{ color: cfg.color }}
                >
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
        <GoalFormModal
          mode="create"
          existingPriorities={existingPriorities}
          onClose={() => setModal({ kind: "closed" })}
          onSubmit={handleCreate}
        />
      )}
      {modal.kind === "edit" && (
        <GoalFormModal
          mode="edit"
          initial={modal.goal}
          existingPriorities={existingPriorities}
          onClose={() => setModal({ kind: "closed" })}
          onSubmit={(values) => handleUpdate(modal.goal.id, values)}
        />
      )}
    </PageShell>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function SummaryStat({
  label,
  value,
  accent,
  warning,
  muted,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  muted?: boolean;
  hint?: string;
}) {
  const color = accent
    ? "var(--color-accent)"
    : warning
      ? "var(--color-warning)"
      : muted
        ? "var(--color-text-secondary)"
        : "var(--color-text-primary)";

  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-2 text-[28px] font-bold tabular-nums"
        style={{ color, letterSpacing: "-0.02em", lineHeight: 1.05 }}
      >
        {value}
      </p>
      {hint && (
        <p
          className="mt-1.5 text-[11px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
  warning,
  small,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  small?: boolean;
}) {
  const color = warning
    ? "var(--color-warning)"
    : accent
      ? "var(--color-accent)"
      : "var(--color-text-primary)";

  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-1 font-semibold tabular-nums"
        style={{
          color,
          fontSize: small ? "13px" : "17px",
          letterSpacing: "-0.015em",
        }}
      >
        {value}
      </p>
    </div>
  );
}
