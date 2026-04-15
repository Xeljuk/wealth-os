"use client";

import { useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { useToast } from "@/components/ui/Toast";
import { Skeleton, useDelayedLoading } from "@/components/ui/Skeleton";
import { formatCurrency, formatMonth } from "@/lib/format";
import type { IncomeSource, ExpenseItem } from "@/lib/types";
import IncomeFormModal, { type IncomeFormValues } from "@/components/cash-flow/IncomeFormModal";
import ExpenseFormModal, { type ExpenseFormValues } from "@/components/cash-flow/ExpenseFormModal";
import SafetyBufferModal from "@/components/cash-flow/SafetyBufferModal";
import CashFlowWaterfall from "@/components/cash-flow/CashFlowWaterfall";
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Shield,
} from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";

/* ── Config ───────────────────────────────────────────────────── */

const TENSION_CONFIG: Record<
  string,
  { color: string; Icon: ComponentType<{ size?: number }> }
> = {
  attention: { color: "var(--color-warning)", Icon: AlertTriangle },
  info: { color: "var(--color-accent)", Icon: Lightbulb },
  positive: { color: "var(--color-positive)", Icon: TrendingUp },
};

const EXPENSE_TYPE_LABEL: Record<string, string> = {
  fixed: "Fixed",
  variable: "Variable",
  debt_service: "Debt Service",
};

type IncomeModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; income: IncomeSource };

type ExpenseModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; expense: ExpenseItem };

/* ── Page ──────────────────────────────────────────────────────── */
export default function CashFlowEngine() {
  const { snapshot, refreshSnapshot, isLoading } = useWealth();
  const showSkeleton = useDelayedLoading(isLoading);
  const toast = useToast();
  const rawCf = snapshot.cashFlow;
  const profile = snapshot.profile;

  const [incomeModal, setIncomeModal] = useState<IncomeModalState>({ kind: "closed" });
  const [expenseModal, setExpenseModal] = useState<ExpenseModalState>({ kind: "closed" });
  const [bufferModalOpen, setBufferModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIncomeIds, setPendingIncomeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingExpenseIds, setPendingExpenseIds] = useState<Set<string>>(
    () => new Set(),
  );

  const cf = useMemo(
    () => ({
      ...rawCf,
      incomes: rawCf.incomes.filter((i) => !pendingIncomeIds.has(i.id)),
      expenses: rawCf.expenses.filter((e) => !pendingExpenseIds.has(e.id)),
    }),
    [rawCf, pendingIncomeIds, pendingExpenseIds],
  );

  // ── API handlers ─────────────────────────────────────────────
  async function handleSafetyBufferUpdate(value: number) {
    setActionError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safetyBuffer: value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setBufferModalOpen(false);
    toast.success("Safety buffer updated");
  }

  async function handleIncomeCreate(values: IncomeFormValues) {
    setActionError(null);
    const res = await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setIncomeModal({ kind: "closed" });
    toast.success(`Income "${values.name}" added`);
  }

  async function handleIncomeUpdate(id: string, values: IncomeFormValues) {
    setActionError(null);
    const res = await fetch(`/api/incomes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setIncomeModal({ kind: "closed" });
    toast.success(`Income "${values.name}" updated`);
  }

  function handleIncomeDelete(income: IncomeSource) {
    setActionError(null);
    setPendingIncomeIds((prev) => new Set(prev).add(income.id));
    toast.undo({
      message: `Income "${income.name}" deleted`,
      onUndo: () => {
        setPendingIncomeIds((prev) => {
          const next = new Set(prev);
          next.delete(income.id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          const res = await fetch(`/api/incomes/${income.id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Request failed (${res.status})`);
          }
          await refreshSnapshot();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete income",
          );
        } finally {
          setPendingIncomeIds((prev) => {
            const next = new Set(prev);
            next.delete(income.id);
            return next;
          });
        }
      },
    });
  }

  async function handleExpenseCreate(values: ExpenseFormValues) {
    setActionError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setExpenseModal({ kind: "closed" });
    toast.success(`Expense "${values.name}" added`);
  }

  async function handleExpenseUpdate(id: string, values: ExpenseFormValues) {
    setActionError(null);
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setExpenseModal({ kind: "closed" });
    toast.success(`Expense "${values.name}" updated`);
  }

  function handleExpenseDelete(expense: ExpenseItem) {
    setActionError(null);
    setPendingExpenseIds((prev) => new Set(prev).add(expense.id));
    toast.undo({
      message: `Expense "${expense.name}" deleted`,
      onUndo: () => {
        setPendingExpenseIds((prev) => {
          const next = new Set(prev);
          next.delete(expense.id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          const res = await fetch(`/api/expenses/${expense.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Request failed (${res.status})`);
          }
          await refreshSnapshot();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete expense",
          );
        } finally {
          setPendingExpenseIds((prev) => {
            const next = new Set(prev);
            next.delete(expense.id);
            return next;
          });
        }
      },
    });
  }

  // ── Derived ──────────────────────────────────────────────────
  const totalCommitted = cf.totalFixed + cf.totalVariable + cf.totalDebtService;
  const allocatablePct =
    cf.totalInflow > 0
      ? Math.round((cf.allocatableSurplus / cf.totalInflow) * 100)
      : 0;
  const healthSignal =
    allocatablePct > 25
      ? "Healthy"
      : allocatablePct > 15
        ? "Moderate"
        : "Under Pressure";
  const healthColor =
    allocatablePct > 25
      ? "var(--color-positive)"
      : allocatablePct > 15
        ? "var(--color-warning)"
        : "var(--color-negative)";

  const debtPct =
    cf.totalInflow > 0
      ? ((cf.totalDebtService / cf.totalInflow) * 100).toFixed(1)
      : "0.0";

  // Tensions — planning insights
  const tensions: { type: string; text: string }[] = [
    {
      type: "attention",
      text: `Debt service consumes ${formatCurrency(cf.totalDebtService)}/mo — ${debtPct}% of your total inflow. Each month that passes at this rate costs real compounding capacity.`,
    },
    {
      type: "info",
      text: `Your allocatable surplus is ${formatCurrency(cf.allocatableSurplus)}/mo (${allocatablePct}% of inflow). ${healthSignal.toLowerCase() === "healthy" ? "This is a healthy margin for goals and compounding." : "There is meaningful room to shift this through expense or income levers."}`,
    },
    {
      type: "positive",
      text: `Your safety buffer of ${formatCurrency(cf.safetyBuffer)}/mo is protecting ${Math.round((cf.safetyBuffer / Math.max(cf.surplus, 1)) * 100)}% of your surplus. Click the buffer in the waterfall to tune it.`,
    },
  ];

  if (showSkeleton) {
    return (
      <PageShell
        eyebrow={`Cash Flow · ${formatMonth(snapshot.period)}`}
        title="How your month operates."
        subtitle={`Every lira ${profile.name} brings in, every commitment on its way out, and what remains to direct toward the things that matter.`}
      >
        <CashFlowSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={`Cash Flow · ${formatMonth(snapshot.period)}`}
      title="How your month operates."
      subtitle={`Every lira ${profile.name} brings in, every commitment on its way out, and what remains to direct toward the things that matter.`}
    >
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

      {/* ── Top stats: inflow + allocatable + health signal ──── */}
      <div className="grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 lg:col-span-5">
          <p className="label-meta">Monthly allocatable</p>
          <p className="display-hero mt-3">
            {formatCurrency(cf.allocatableSurplus)}
          </p>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {allocatablePct}% of inflow —{" "}
            <span style={{ color: healthColor, fontWeight: 600 }}>
              {healthSignal}
            </span>
          </p>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div
            className="flex flex-col gap-5 border-l pl-6"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <div className="grid grid-cols-3 gap-8">
              <MiniStat
                label="Total inflow"
                value={formatCurrency(cf.totalInflow)}
              />
              <MiniStat
                label="Total committed"
                value={formatCurrency(totalCommitted)}
                muted
              />
              <MiniStat
                label="Monthly surplus"
                value={formatCurrency(cf.surplus)}
              />
            </div>
            <div className="grid grid-cols-3 gap-8">
              <MiniStat
                label="Fixed"
                value={formatCurrency(cf.totalFixed)}
                small
              />
              <MiniStat
                label="Variable"
                value={formatCurrency(cf.totalVariable)}
                small
              />
              <MiniStat
                label="Debt service"
                value={formatCurrency(cf.totalDebtService)}
                small
                warning
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Waterfall hero ──────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="label-meta">Operating flow</p>
            <h2 className="display-page mt-2">Where every lira goes.</h2>
            <p className="lead-text mt-4">
              Start at the full inflow, watch each commitment take its share,
              and see what remains at the end — the allocatable room you can
              actually direct.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBufferModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-surface-low)",
              color: "var(--color-text-secondary)",
            }}
            title="Edit safety buffer"
          >
            <Shield size={13} />
            Safety buffer: {formatCurrency(cf.safetyBuffer, { compact: true })}
            <Pencil size={11} style={{ opacity: 0.6 }} />
          </button>
        </div>

        <CashFlowWaterfall
          totalInflow={cf.totalInflow}
          totalFixed={cf.totalFixed}
          totalVariable={cf.totalVariable}
          totalDebtService={cf.totalDebtService}
          safetyBuffer={cf.safetyBuffer}
          allocatable={cf.allocatableSurplus}
          currencySymbol={profile.currencySymbol}
        />
      </div>

      {/* ── Inflow composition ──────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Inflow composition</p>
            <h2 className="display-page mt-2">Where the money comes from.</h2>
          </div>
          <button
            type="button"
            onClick={() => setIncomeModal({ kind: "create" })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add income
          </button>
        </div>

        <div className="flex flex-col">
          {cf.incomes.length === 0 ? (
            <p
              className="body-editorial"
              style={{ color: "var(--color-text-muted)" }}
            >
              No income sources yet. Add one to activate flow analysis.
            </p>
          ) : (
            cf.incomes.map((inc, i) => {
              const pct =
                cf.totalInflow > 0
                  ? Math.round((inc.amount / cf.totalInflow) * 100)
                  : 0;
              return (
                <div
                  key={inc.id}
                  className="grid grid-cols-12 items-center gap-4 py-5"
                  style={{
                    borderBottom:
                      i < cf.incomes.length - 1
                        ? "1px solid var(--color-border-light)"
                        : undefined,
                  }}
                >
                  <div className="col-span-5">
                    <p
                      className="text-[16px] font-semibold tracking-tight"
                      style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {inc.name}
                    </p>
                    {inc.recurring && (
                      <p
                        className="mt-0.5 text-[11px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Recurring monthly
                      </p>
                    )}
                  </div>
                  <div className="col-span-5">
                    <div
                      className="h-2 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--color-surface-low)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "var(--color-accent)",
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-4">
                    <span
                      className="text-[15px] font-semibold tabular-nums"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatCurrency(inc.amount)}
                    </span>
                    <span
                      className="w-8 text-right text-[11px] tabular-nums"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {pct}%
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setIncomeModal({ kind: "edit", income: inc })
                        }
                        className="rounded p-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                        title="Edit income"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIncomeDelete(inc)}
                        className="rounded p-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-negative)" }}
                        title="Delete income"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Expense line items ──────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Expense line items</p>
            <h2 className="display-page mt-2">Every commitment, itemized.</h2>
            <p className="lead-text mt-4">
              Individual entries that compose the fixed, variable, and debt
              service tiers above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpenseModal({ kind: "create" })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add expense
          </button>
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
            <span className="col-span-5">Name</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-2 text-right">Amount</span>
            <span className="col-span-1 text-center">Recurring</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          {cf.expenses.length === 0 ? (
            <p
              className="py-6 body-editorial"
              style={{ color: "var(--color-text-muted)" }}
            >
              No expense items yet. Add one to start building the commitment
              breakdown.
            </p>
          ) : (
            cf.expenses.map((exp) => (
              <div
                key={exp.id}
                className="grid grid-cols-12 items-center gap-4 py-4"
                style={{
                  borderBottom: "1px solid var(--color-border-light)",
                }}
              >
                <span
                  className="col-span-5 truncate text-[15px] font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {exp.name}
                </span>
                <span
                  className="col-span-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    color:
                      exp.type === "debt_service"
                        ? "var(--color-warning)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  {EXPENSE_TYPE_LABEL[exp.type] ?? exp.type}
                </span>
                <span
                  className="col-span-2 text-right text-[15px] font-semibold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatCurrency(exp.amount)}
                </span>
                <span
                  className="col-span-1 text-center text-[11px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {exp.recurring ? "Yes" : "No"}
                </span>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpenseModal({ kind: "edit", expense: exp })
                    }
                    className="rounded p-1.5 transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                    title="Edit expense"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExpenseDelete(exp)}
                    className="rounded p-1.5 transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-negative)" }}
                    title="Delete expense"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Tensions — planning intelligence ───────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Cash flow tensions</p>
            <h2 className="display-page mt-2">What this flow is telling you.</h2>
          </div>
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Run a scenario <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          {tensions.map((ins, i) => {
            const cfg = TENSION_CONFIG[ins.type] ?? TENSION_CONFIG.info;
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

      {/* ── Modals ─────────────────────────────────────────── */}
      {incomeModal.kind === "create" && (
        <IncomeFormModal
          mode="create"
          onClose={() => setIncomeModal({ kind: "closed" })}
          onSubmit={handleIncomeCreate}
        />
      )}
      {incomeModal.kind === "edit" && (
        <IncomeFormModal
          mode="edit"
          initial={incomeModal.income}
          onClose={() => setIncomeModal({ kind: "closed" })}
          onSubmit={(values) => handleIncomeUpdate(incomeModal.income.id, values)}
        />
      )}
      {expenseModal.kind === "create" && (
        <ExpenseFormModal
          mode="create"
          onClose={() => setExpenseModal({ kind: "closed" })}
          onSubmit={handleExpenseCreate}
        />
      )}
      {expenseModal.kind === "edit" && (
        <ExpenseFormModal
          mode="edit"
          initial={expenseModal.expense}
          onClose={() => setExpenseModal({ kind: "closed" })}
          onSubmit={(values) =>
            handleExpenseUpdate(expenseModal.expense.id, values)
          }
        />
      )}
      {bufferModalOpen && (
        <SafetyBufferModal
          initial={cf.safetyBuffer}
          currencySymbol={profile.currencySymbol}
          onClose={() => setBufferModalOpen(false)}
          onSubmit={handleSafetyBufferUpdate}
        />
      )}
    </PageShell>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function MiniStat({
  label,
  value,
  accent,
  warning,
  muted,
  small,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  muted?: boolean;
  small?: boolean;
}) {
  const color = warning
    ? "var(--color-warning)"
    : accent
      ? "var(--color-accent)"
      : muted
        ? "var(--color-text-secondary)"
        : "var(--color-text-primary)";

  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-1.5 font-semibold tabular-nums"
        style={{
          color,
          fontSize: small ? "15px" : "19px",
          letterSpacing: "-0.015em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
export function CashFlowSkeleton() {
  return (
    <>
      {/* Hero: allocatable surplus + status */}
      <div className="grid grid-cols-12 items-end gap-x-12 gap-y-6">
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
          <Skeleton width={110} height={12} />
          <Skeleton width="65%" height={64} rounded="rounded-lg" />
          <Skeleton width={220} height={14} />
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
          <Skeleton width="80%" height={14} />
          <Skeleton width="60%" height={14} />
        </div>
      </div>

      {/* Waterfall */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex flex-col gap-3">
          <Skeleton width={90} height={12} />
          <Skeleton width={320} height={36} />
        </div>
        <Skeleton width="100%" height={260} rounded="rounded-2xl" />
      </div>

      {/* Income list */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex flex-col gap-3">
          <Skeleton width={140} height={12} />
          <Skeleton width={320} height={36} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2" style={{ width: "55%" }}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} />
              </div>
              <Skeleton width={100} height={18} />
            </div>
          ))}
        </div>
      </div>

      {/* Expense list */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex flex-col gap-3">
          <Skeleton width={160} height={12} />
          <Skeleton width={280} height={36} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2" style={{ width: "55%" }}>
                <Skeleton width="65%" height={16} />
                <Skeleton width="40%" height={12} />
              </div>
              <Skeleton width={100} height={18} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
