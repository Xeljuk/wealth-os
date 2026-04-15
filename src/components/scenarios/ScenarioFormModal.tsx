"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2, Shield, ShoppingBag, TrendingDown, Scissors, Rocket } from "lucide-react";
import type { Scenario, ScenarioType } from "@/lib/types";
import type { ComponentType } from "react";

export interface ScenarioFormValues {
  name: string;
  description: string;
  type: ScenarioType;
  parameters: Record<string, number>;
}

interface ScenarioFormModalProps {
  mode: "create" | "edit";
  initial?: Scenario;
  onClose: () => void;
  onSubmit: (values: ScenarioFormValues) => Promise<void>;
}

interface TypeMeta {
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number }>;
  color: string;
}

const TYPE_META: Record<ScenarioType, TypeMeta> = {
  debt_vs_invest: {
    label: "Debt Sprint",
    description: "Redirect extra capacity to debt payoff for a defined period.",
    Icon: Shield,
    color: "var(--color-warning)",
  },
  major_purchase: {
    label: "Major Purchase",
    description: "Test readiness for a large one-time expense by a target date.",
    Icon: ShoppingBag,
    color: "var(--color-accent)",
  },
  income_change: {
    label: "Income Change",
    description: "Model how a raise or income drop ripples through your plan.",
    Icon: TrendingDown,
    color: "var(--color-negative)",
  },
  expense_reduction: {
    label: "Expense Cut",
    description: "See how trimming a spending category frees monthly capacity.",
    Icon: Scissors,
    color: "var(--color-positive)",
  },
  aggressive_saving: {
    label: "Goal Boost",
    description: "Accelerate the primary goal with extra monthly contribution.",
    Icon: Rocket,
    color: "var(--color-accent)",
  },
};

const TYPES: ScenarioType[] = [
  "debt_vs_invest",
  "major_purchase",
  "income_change",
  "expense_reduction",
  "aggressive_saving",
];

// ── Parameter field config per type ──────────────────────────────
interface FieldConfig {
  key: string;
  label: string;
  kind: "number" | "select";
  default: number;
  min?: number;
  step?: number;
  options?: { label: string; value: number }[];
  hint?: string;
}

const FIELDS: Record<ScenarioType, FieldConfig[]> = {
  debt_vs_invest: [
    {
      key: "extraDebtMonthly",
      label: "Extra monthly to debt",
      kind: "number",
      default: 10000,
      min: 0,
      step: 1000,
    },
    {
      key: "durationMonths",
      label: "Sprint duration (months)",
      kind: "number",
      default: 6,
      min: 1,
      step: 1,
    },
  ],
  major_purchase: [
    {
      key: "downPayment",
      label: "Target amount",
      kind: "number",
      default: 500000,
      min: 0,
      step: 10000,
    },
    {
      key: "targetMonths",
      label: "Months to save",
      kind: "number",
      default: 12,
      min: 1,
      step: 1,
    },
  ],
  income_change: [
    {
      key: "incomeChange",
      label: "Monthly income change (negative for drop)",
      kind: "number",
      default: -5000,
      step: 500,
      hint: "Use negative values for income drops, positive for raises.",
    },
  ],
  expense_reduction: [
    {
      key: "category",
      label: "Category",
      kind: "select",
      default: 0,
      options: [
        { label: "Variable (discretionary)", value: 0 },
        { label: "Fixed (structural)", value: 1 },
      ],
    },
    {
      key: "reductionPercent",
      label: "Reduction (%)",
      kind: "number",
      default: 15,
      min: 0,
      step: 1,
    },
  ],
  aggressive_saving: [
    {
      key: "extraMonthly",
      label: "Extra monthly to primary goal",
      kind: "number",
      default: 10000,
      min: 0,
      step: 1000,
    },
  ],
};

export default function ScenarioFormModal({
  mode,
  initial,
  onClose,
  onSubmit,
}: ScenarioFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<ScenarioType>(initial?.type ?? "debt_vs_invest");
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    if (initial) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(initial.parameters)) {
        out[k] = typeof v === "number" ? v : Number(v);
      }
      return out;
    }
    const out: Record<string, number> = {};
    for (const f of FIELDS.debt_vs_invest) out[f.key] = f.default;
    return out;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleTypeChange(next: ScenarioType) {
    setType(next);
    // Reset params to defaults for the new type (only in create mode, or when user explicitly switches)
    const defaults: Record<string, number> = {};
    for (const f of FIELDS[next]) defaults[f.key] = f.default;
    setParamValues(defaults);
  }

  function handleParamChange(key: string, value: number) {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required");

    const fields = FIELDS[type];
    for (const f of fields) {
      const v = paramValues[f.key];
      if (v === undefined || !Number.isFinite(v)) {
        return setError(`${f.label} is required and must be a number`);
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        type,
        parameters: paramValues,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const activeFields = FIELDS[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="atmospheric-shadow w-full max-w-lg rounded-2xl p-7"
        style={{ backgroundColor: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
              {mode === "create" ? "New Scenario" : "Edit Scenario"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "create" ? "Create a what-if" : initial?.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-opacity hover:opacity-60"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <form className="mt-5 flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Type picker (only in create mode for clarity) */}
          {mode === "create" && (
            <div>
              <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
                Scenario Type
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {TYPES.map((t) => {
                  const meta = TYPE_META[t];
                  const active = t === type;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTypeChange(t)}
                      className="flex items-start gap-3 rounded-xl p-3 text-left transition-all"
                      style={{
                        backgroundColor: active
                          ? "var(--color-accent-light)"
                          : "var(--color-surface-low)",
                        outline: active ? `2px solid ${meta.color}` : "2px solid transparent",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: active ? meta.color : "var(--color-surface)",
                          color: active ? "#fff" : "var(--color-text-muted)",
                        }}
                      >
                        <meta.Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="text-[13px] font-semibold"
                          style={{
                            color: active ? meta.color : "var(--color-text-primary)",
                          }}
                        >
                          {meta.label}
                        </p>
                        <p
                          className="text-[11px] leading-snug"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Debt sprint 6 months"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-primary)",
              }}
            />
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about this scenario"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-primary)",
              }}
            />
          </Field>

          {/* Dynamic parameter fields */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--color-surface-low)" }}
          >
            <p
              className="label-meta mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              {TYPE_META[type].label} Parameters
            </p>
            <div className="flex flex-col gap-3">
              {activeFields.map((f) => (
                <div key={f.key}>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {f.label}
                  </label>
                  {f.kind === "number" ? (
                    <input
                      type="number"
                      value={paramValues[f.key] ?? f.default}
                      min={f.min}
                      step={f.step}
                      onChange={(e) => handleParamChange(f.key, Number(e.target.value))}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  ) : (
                    <select
                      value={paramValues[f.key] ?? f.default}
                      onChange={(e) => handleParamChange(f.key, Number(e.target.value))}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {f.options!.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {f.hint && (
                    <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {f.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--color-negative)" }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {mode === "create" ? "Run & Save" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
