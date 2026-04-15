"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import type { ExpenseItem } from "@/lib/types";

export type ExpenseType = "fixed" | "variable" | "debt_service";

export interface ExpenseFormValues {
  name: string;
  amount: number;
  type: ExpenseType;
  recurring: boolean;
}

interface ExpenseFormModalProps {
  mode: "create" | "edit";
  initial?: ExpenseItem;
  onClose: () => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}

const TYPE_LABEL: Record<ExpenseType, string> = {
  fixed: "Fixed (rent, utilities, subscriptions)",
  variable: "Variable (groceries, discretionary)",
  debt_service: "Debt Service (loan / card payments)",
};

export default function ExpenseFormModal({ mode, initial, onClose, onSubmit }: ExpenseFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [type, setType] = useState<ExpenseType>(initial?.type ?? "fixed");
  const [recurring, setRecurring] = useState<boolean>(initial?.recurring ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const a = Number(amount);
    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(a) || a < 0) return setError("Amount must be a non-negative number");

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), amount: a, type, recurring });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="atmospheric-shadow w-full max-w-md rounded-2xl p-7"
        style={{ backgroundColor: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
              {mode === "create" ? "New Expense" : "Edit Expense"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "create" ? "Add an expense line" : initial?.name}
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

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rent"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ExpenseType)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            >
              {Object.entries(TYPE_LABEL).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monthly Amount">
            <input
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

          <label
            className="flex cursor-pointer items-center gap-2 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Recurring monthly
          </label>

          {error && (
            <p className="text-xs" style={{ color: "var(--color-negative)" }}>
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-secondary)" }}
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
              {mode === "create" ? "Create Expense" : "Save Changes"}
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
