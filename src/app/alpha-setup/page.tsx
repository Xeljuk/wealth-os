"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import type { AlphaIntakePayload } from "@/lib/alpha-intake";
import { formatCurrency } from "@/lib/format";

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
    [form.salary, form.otherRecurringIncome]
  );

  const totalAssets = useMemo(
    () =>
      toNumber(form.cash) +
      toNumber(form.investments) +
      toNumber(form.property) +
      toNumber(form.vehicle),
    [form.cash, form.investments, form.property, form.vehicle]
  );

  const totalLiabilities = useMemo(
    () =>
      toNumber(form.installmentLiabilities) + toNumber(form.revolvingLiabilities),
    [form.installmentLiabilities, form.revolvingLiabilities]
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

    const goals = form.goals
      .map((g, i) => ({ ...g, priority: i + 1 }))
      .filter((g) => g.name.trim().length > 0);

    if (goals.length === 0) return "Add at least one goal.";
    if (goals.length > 3) return "You can provide up to 3 goals.";

    for (const g of goals) {
      if (!/^\d{4}-\d{2}$/.test(g.targetMonth)) {
        return `Goal "${g.name}" needs a valid target month.`;
      }
      const target = toNumber(g.targetAmount);
      const current = toNumber(g.currentAmount);
      if (!Number.isFinite(target) || !Number.isFinite(current) || target < 0 || current < 0) {
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
          .slice(0, 3);

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
          ? "Demo profile loaded. Redirecting to Wealth Overview..."
          : "Your self-reported inputs were saved. Redirecting to Wealth Overview..."
      );
      setTimeout(() => router.push("/wealth-overview"), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save intake data.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Alpha Setup"
      subtitle="Private alpha setup: use demo data or enter your own core numbers."
      period="Private Alpha"
    >
      <div className="mt-2 flex flex-col gap-6">
        <section
          className="atmospheric-shadow rounded-2xl p-6"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
            Setup Mode
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={() => setMode("demo")}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                backgroundColor:
                  mode === "demo"
                    ? "var(--color-accent-light)"
                    : "var(--color-surface-low)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{
                  color:
                    mode === "demo"
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                }}
              >
                Try demo data
              </p>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Use a sample profile to explore the product before entering your own values.
              </p>
            </button>
            <button
              onClick={() => setMode("custom")}
              className="rounded-xl p-4 text-left transition-all"
              style={{
                backgroundColor:
                  mode === "custom"
                    ? "var(--color-accent-light)"
                    : "var(--color-surface-low)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{
                  color:
                    mode === "custom"
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                }}
              >
                Use my numbers
              </p>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Enter a compact, self-reported snapshot to personalize your planning view.
              </p>
            </button>
          </div>
        </section>

        {mode === "custom" && (
          <section
            className="atmospheric-shadow rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Block title="Monthly Engine">
                <NumberField label="Salary / month" value={form.salary} onChange={(v) => setField("salary", v)} />
                <NumberField label="Other recurring income / month" value={form.otherRecurringIncome} onChange={(v) => setField("otherRecurringIncome", v)} />
                <NumberField label="Fixed expenses / month" value={form.fixedExpenses} onChange={(v) => setField("fixedExpenses", v)} />
                <NumberField label="Variable expenses / month" value={form.variableExpenses} onChange={(v) => setField("variableExpenses", v)} />
                <NumberField label="Debt service / month" value={form.debtService} onChange={(v) => setField("debtService", v)} />
                <NumberField label="Safety buffer / month" value={form.safetyBuffer} onChange={(v) => setField("safetyBuffer", v)} />
              </Block>

              <Block title="Balance Sheet">
                <NumberField label="Cash" value={form.cash} onChange={(v) => setField("cash", v)} />
                <NumberField label="Investments" value={form.investments} onChange={(v) => setField("investments", v)} />
                <NumberField label="Property" value={form.property} onChange={(v) => setField("property", v)} />
                <NumberField label="Vehicle" value={form.vehicle} onChange={(v) => setField("vehicle", v)} />
              </Block>

              <Block title="Liabilities">
                <NumberField label="Installment liabilities" value={form.installmentLiabilities} onChange={(v) => setField("installmentLiabilities", v)} />
                <NumberField label="Revolving liabilities" value={form.revolvingLiabilities} onChange={(v) => setField("revolvingLiabilities", v)} />
              </Block>

              <Block title="Goals (max 3)">
                {form.goals.map((g, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "var(--color-surface-low)" }}>
                    <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
                      Goal {i + 1} (priority {i + 1})
                    </p>
                    <TextField
                      label="Name"
                      value={g.name}
                      onChange={(v) =>
                        setForm((prev) => {
                          const next = [...prev.goals];
                          next[i] = { ...next[i], name: v };
                          return { ...prev, goals: next };
                        })
                      }
                    />
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <NumberField
                        label="Target amount"
                        value={g.targetAmount}
                        onChange={(v) =>
                          setForm((prev) => {
                            const next = [...prev.goals];
                            next[i] = { ...next[i], targetAmount: v };
                            return { ...prev, goals: next };
                          })
                        }
                      />
                      <NumberField
                        label="Current amount"
                        value={g.currentAmount}
                        onChange={(v) =>
                          setForm((prev) => {
                            const next = [...prev.goals];
                            next[i] = { ...next[i], currentAmount: v };
                            return { ...prev, goals: next };
                          })
                        }
                      />
                    </div>
                    <div className="mt-2">
                      <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
                        Target month
                      </label>
                      <input
                        type="month"
                        value={g.targetMonth}
                        onChange={(e) =>
                          setForm((prev) => {
                            const next = [...prev.goals];
                            next[i] = { ...next[i], targetMonth: e.target.value };
                            return { ...prev, goals: next };
                          })
                        }
                        className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  </div>
                ))}
              </Block>
            </div>
          </section>
        )}

        <section
          className="atmospheric-shadow rounded-2xl p-6"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Private alpha note: your inputs are stored for prototype testing, and insights are generated from your current self-reported values. This product supports planning and does not provide financial advice.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="Monthly inflow" value={Number.isFinite(monthlyInflow) ? formatCurrency(monthlyInflow) : "—"} />
            <MiniStat label="Total assets" value={Number.isFinite(totalAssets) ? formatCurrency(totalAssets) : "—"} />
            <MiniStat label="Total liabilities" value={Number.isFinite(totalLiabilities) ? formatCurrency(totalLiabilities) : "—"} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => save(mode)}
              disabled={saving}
              className="signature-gradient rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "demo" ? "Load Demo Snapshot" : "Save My Numbers"}
            </button>
            <button
              onClick={() => setForm(DEFAULT_FORM)}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-[13px] font-semibold"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-secondary)" }}
            >
              Reset Form
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm" style={{ color: "var(--color-negative)" }}>
              {error}
            </p>
          )}
          {message && (
            <p className="mt-3 text-sm" style={{ color: "var(--color-positive)" }}>
              {message}
            </p>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
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
      <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
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
    <div className="mt-2">
      <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)" }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
