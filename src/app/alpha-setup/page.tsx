"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import type { AlphaIntakePayload } from "@/lib/alpha-intake";
import { formatCurrency } from "@/lib/format";
import { Sparkles, PencilLine, Loader2, RotateCcw } from "lucide-react";

type Mode = "demo" | "custom";

interface GoalForm {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetMonth: string;
}

interface FormState {
  salary: string;
  otherRecurringIncome: string;
  fixedExpenses: string;
  variableExpenses: string;
  debtService: string;
  safetyBuffer: string;
  cash: string;
  investments: string;
  property: string;
  vehicle: string;
  installmentLiabilities: string;
  revolvingLiabilities: string;
  goals: GoalForm[];
}

const DEFAULT_FORM: FormState = {
  salary: "78000",
  otherRecurringIncome: "30000",
  fixedExpenses: "24000",
  variableExpenses: "18500",
  debtService: "17000",
  safetyBuffer: "15000",
  cash: "110000",
  investments: "420000",
  property: "3500000",
  vehicle: "900000",
  installmentLiabilities: "120000",
  revolvingLiabilities: "60000",
  goals: [
    {
      name: "Second Property Down Payment",
      targetAmount: "1200000",
      currentAmount: "280000",
      targetMonth: "2026-09",
    },
    {
      name: "Emergency Fund",
      targetAmount: "300000",
      currentAmount: "110000",
      targetMonth: "2026-03",
    },
    {
      name: "Portfolio Growth",
      targetAmount: "600000",
      currentAmount: "420000",
      targetMonth: "2025-12",
    },
  ],
};

function toNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function AlphaSetupPage() {
  const router = useRouter();
  const { refreshSnapshot } = useWealth();
  const [mode, setMode] = useState<Mode>("demo");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthlyInflow = useMemo(
    () => toNumber(form.salary) + toNumber(form.otherRecurringIncome),
    [form.salary, form.otherRecurringIncome],
  );

  const totalAssets = useMemo(
    () =>
      toNumber(form.cash) +
      toNumber(form.investments) +
      toNumber(form.property) +
      toNumber(form.vehicle),
    [form.cash, form.investments, form.property, form.vehicle],
  );

  const totalLiabilities = useMemo(
    () =>
      toNumber(form.installmentLiabilities) +
      toNumber(form.revolvingLiabilities),
    [form.installmentLiabilities, form.revolvingLiabilities],
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateGoal(i: number, patch: Partial<GoalForm>) {
    setForm((prev) => {
      const next = [...prev.goals];
      next[i] = { ...next[i]!, ...patch };
      return { ...prev, goals: next };
    });
  }

  function validateCustom(): string | null {
    const numericKeys: (keyof FormState)[] = [
      "salary",
      "otherRecurringIncome",
      "fixedExpenses",
      "variableExpenses",
      "debtService",
      "safetyBuffer",
      "cash",
      "investments",
      "property",
      "vehicle",
      "installmentLiabilities",
      "revolvingLiabilities",
    ];
    for (const key of numericKeys) {
      const val = toNumber(form[key] as string);
      if (!Number.isFinite(val) || val < 0) {
        return `Please enter a valid non-negative number for ${key}.`;
      }
    }

    if (toNumber(form.salary) <= 0) {
      return "Salary must be greater than zero.";
    }

    const goals = form.goals.filter((g) => g.name.trim().length > 0);
    if (goals.length === 0) return "Add at least one goal.";
    if (goals.length > 10) return "You can provide up to 10 goals.";

    for (const g of goals) {
      if (!/^\d{4}-\d{2}$/.test(g.targetMonth)) {
        return `Goal "${g.name}" needs a valid target month.`;
      }
      const target = toNumber(g.targetAmount);
      const current = toNumber(g.currentAmount);
      if (
        !Number.isFinite(target) ||
        !Number.isFinite(current) ||
        target < 0 ||
        current < 0
      ) {
        return `Goal "${g.name}" needs valid non-negative amounts.`;
      }
      if (target < current) {
        return `Goal "${g.name}" target cannot be below current amount.`;
      }
    }

    return null;
  }

  async function save(modeToSave: Mode) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      let payload: AlphaIntakePayload;
      if (modeToSave === "demo") {
        payload = { mode: "demo" };
      } else {
        const validationError = validateCustom();
        if (validationError) {
          setError(validationError);
          return;
        }

        const goals = form.goals
          .map((g, i) => ({
            name: g.name.trim(),
            targetAmount: toNumber(g.targetAmount),
            currentAmount: toNumber(g.currentAmount),
            targetMonth: g.targetMonth,
            priority: i + 1,
          }))
          .filter((g) => g.name.length > 0)
          .slice(0, 10);

        payload = {
          mode: "custom",
          data: {
            monthlyEngine: {
              salary: toNumber(form.salary),
              otherRecurringIncome: toNumber(form.otherRecurringIncome),
              fixedExpenses: toNumber(form.fixedExpenses),
              variableExpenses: toNumber(form.variableExpenses),
              debtService: toNumber(form.debtService),
              safetyBuffer: toNumber(form.safetyBuffer),
            },
            balanceSheet: {
              cash: toNumber(form.cash),
              investments: toNumber(form.investments),
              property: toNumber(form.property),
              vehicle: toNumber(form.vehicle),
            },
            liabilities: {
              installmentLiabilities: toNumber(form.installmentLiabilities),
              revolvingLiabilities: toNumber(form.revolvingLiabilities),
            },
            goals,
          },
        };
      }

      const res = await fetch("/api/alpha/intake", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }

      await refreshSnapshot();
      setMessage(
        modeToSave === "demo"
          ? "Demo profile loaded. Redirecting to Wealth Overview…"
          : "Your self-reported inputs were saved. Redirecting to Wealth Overview…",
      );
      setTimeout(() => router.push("/wealth-overview"), 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save intake data.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow="Alpha Setup · Private Alpha"
      title="Seed your financial model."
      subtitle="Load a demo profile to explore the product, or enter your own core numbers for a personalised view. You can change any of this later from the individual entity pages."
    >
      {/* ── Mode toggle ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ModeTile
          active={mode === "demo"}
          onClick={() => setMode("demo")}
          icon={<Sparkles size={18} />}
          title="Try a demo profile"
          description="Sample values for Emre — explore balance sheet, cash flow, goals, and scenarios without entering anything."
        />
        <ModeTile
          active={mode === "custom"}
          onClick={() => setMode("custom")}
          icon={<PencilLine size={18} />}
          title="Use my own numbers"
          description="A compact self-reported snapshot seeds your real model. You can refine individual entries on the other pages."
        />
      </div>

      {/* ── Custom form ───────────────────────────────────────── */}
      {mode === "custom" && (
        <div className="section-breath-lg hairline-top pt-16">
          <div className="mb-10 max-w-2xl">
            <p className="label-meta">Your numbers</p>
            <h2 className="display-page mt-2">The bones of your model.</h2>
            <p className="lead-text mt-4">
              Four blocks cover everything: monthly engine, balance sheet,
              liabilities, and goals. Keep it approximate — you can refine it
              after setup.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-2">
            <FormBlock title="Monthly engine">
              <NumberField
                label="Salary"
                value={form.salary}
                onChange={(v) => setField("salary", v)}
              />
              <NumberField
                label="Other recurring income"
                value={form.otherRecurringIncome}
                onChange={(v) => setField("otherRecurringIncome", v)}
              />
              <NumberField
                label="Fixed expenses"
                value={form.fixedExpenses}
                onChange={(v) => setField("fixedExpenses", v)}
              />
              <NumberField
                label="Variable expenses"
                value={form.variableExpenses}
                onChange={(v) => setField("variableExpenses", v)}
              />
              <NumberField
                label="Debt service"
                value={form.debtService}
                onChange={(v) => setField("debtService", v)}
              />
              <NumberField
                label="Safety buffer"
                value={form.safetyBuffer}
                onChange={(v) => setField("safetyBuffer", v)}
              />
            </FormBlock>

            <FormBlock title="Balance sheet">
              <NumberField
                label="Cash"
                value={form.cash}
                onChange={(v) => setField("cash", v)}
              />
              <NumberField
                label="Investments"
                value={form.investments}
                onChange={(v) => setField("investments", v)}
              />
              <NumberField
                label="Property"
                value={form.property}
                onChange={(v) => setField("property", v)}
              />
              <NumberField
                label="Vehicle"
                value={form.vehicle}
                onChange={(v) => setField("vehicle", v)}
              />
            </FormBlock>

            <FormBlock title="Liabilities">
              <NumberField
                label="Installment loans"
                value={form.installmentLiabilities}
                onChange={(v) => setField("installmentLiabilities", v)}
              />
              <NumberField
                label="Revolving credit"
                value={form.revolvingLiabilities}
                onChange={(v) => setField("revolvingLiabilities", v)}
              />
            </FormBlock>

            <FormBlock title="Goals (up to 10)">
              {form.goals.map((g, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-xl p-4"
                  style={{ backgroundColor: "var(--color-surface-low)" }}
                >
                  <p className="label-meta">Priority {i + 1}</p>
                  <TextField
                    label="Name"
                    value={g.name}
                    onChange={(v) => updateGoal(i, { name: v })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Target"
                      value={g.targetAmount}
                      onChange={(v) => updateGoal(i, { targetAmount: v })}
                    />
                    <NumberField
                      label="Current"
                      value={g.currentAmount}
                      onChange={(v) => updateGoal(i, { currentAmount: v })}
                    />
                  </div>
                  <div>
                    <label
                      className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Target month
                    </label>
                    <input
                      type="month"
                      value={g.targetMonth}
                      onChange={(e) =>
                        updateGoal(i, { targetMonth: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </FormBlock>
          </div>

          {/* Live-computed stats */}
          <div
            className="section-breath-lg grid grid-cols-1 gap-6 rounded-2xl px-7 py-6 md:grid-cols-3"
            style={{ backgroundColor: "var(--color-vellum-deep)" }}
          >
            <LiveStat
              label="Monthly inflow"
              value={
                Number.isFinite(monthlyInflow)
                  ? formatCurrency(monthlyInflow)
                  : "—"
              }
            />
            <LiveStat
              label="Total assets"
              value={
                Number.isFinite(totalAssets) ? formatCurrency(totalAssets) : "—"
              }
            />
            <LiveStat
              label="Total liabilities"
              value={
                Number.isFinite(totalLiabilities)
                  ? formatCurrency(totalLiabilities)
                  : "—"
              }
            />
          </div>
        </div>
      )}

      {/* ── Action row ───────────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => save(mode)}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: "var(--color-accent)",
                boxShadow: "0 14px 36px -16px rgba(69,100,94,0.4)",
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving
                ? "Saving…"
                : mode === "demo"
                  ? "Load demo snapshot"
                  : "Save my numbers"}
            </button>
            {mode === "custom" && (
              <button
                type="button"
                onClick={() => setForm(DEFAULT_FORM)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <RotateCcw size={13} />
                Reset form
              </button>
            )}
          </div>

          {error && (
            <p
              className="text-[13px]"
              style={{ color: "var(--color-negative)" }}
            >
              {error}
            </p>
          )}
          {message && (
            <p
              className="text-[13px]"
              style={{ color: "var(--color-positive)" }}
            >
              {message}
            </p>
          )}

          <p
            className="mt-2 max-w-2xl text-[11px] leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            Private alpha note: your inputs are stored locally for prototype
            testing. Insights are generated from your current self-reported
            values. This product supports planning and does not provide
            financial advice.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function ModeTile({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-4 rounded-2xl p-7 text-left transition-all duration-300 hover:-translate-y-0.5"
      style={{
        backgroundColor: active
          ? "var(--color-surface)"
          : "var(--color-vellum-deep)",
        boxShadow: active
          ? "0 18px 48px -22px rgba(69,100,94,0.3)"
          : "none",
        outline: active
          ? "2px solid var(--color-accent)"
          : "2px solid transparent",
      }}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{
          backgroundColor: active
            ? "var(--color-accent)"
            : "var(--color-surface)",
          color: active ? "#fff" : "var(--color-accent)",
        }}
      >
        {icon}
      </span>
      <div>
        <h3
          className="text-[18px] font-semibold tracking-tight"
          style={{
            color: active
              ? "var(--color-accent)"
              : "var(--color-text-primary)",
            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

function FormBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h3
        className="text-[16px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{
          backgroundColor: "var(--color-surface-low)",
          color: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-2 text-[22px] font-bold tabular-nums"
        style={{
          color: "var(--color-text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}
