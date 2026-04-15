"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import type { Goal } from "@/lib/types";

export interface GoalFormValues {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  priority: number;
}

interface GoalFormModalProps {
  mode: "create" | "edit";
  initial?: Goal;
  existingPriorities: number[];
  onClose: () => void;
  onSubmit: (values: GoalFormValues) => Promise<void>;
}

function toYearMonth(targetDate: string): string {
  if (/^\d{4}-\d{2}$/.test(targetDate)) return targetDate;
  const d = new Date(targetDate);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalFormModal({
  mode,
  initial,
  existingPriorities,
  onClose,
  onSubmit,
}: GoalFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState<string>(
    initial ? String(initial.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState<string>(
    initial ? String(initial.currentAmount) : "0",
  );
  const [targetMonth, setTargetMonth] = useState<string>(
    initial ? toYearMonth(initial.targetDate) : "",
  );
  const [priority, setPriority] = useState<number>(initial?.priority ?? 1);
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

    const ta = Number(targetAmount);
    const ca = Number(currentAmount);

    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(ta) || ta < 0) return setError("Target amount must be a non-negative number");
    if (!Number.isFinite(ca) || ca < 0) return setError("Current amount must be a non-negative number");
    if (ca > ta) return setError("Current amount cannot exceed target amount");
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) return setError("Target month must be in YYYY-MM format");
    if (![1, 2, 3].includes(priority)) return setError("Priority must be 1, 2, or 3");

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: ta,
        currentAmount: ca,
        targetMonth,
        priority,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const takenPriorities = new Set(
    existingPriorities.filter((p) => mode === "create" || p !== initial?.priority),
  );

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
              {mode === "create" ? "New Goal" : "Edit Goal"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "create" ? "Add a goal" : initial?.name}
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
              placeholder="e.g. Property Down Payment"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-primary)",
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Amount">
              <input
                type="number"
                min={0}
                step={1}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              />
            </Field>
            <Field label="Current Amount">
              <input
                type="number"
                min={0}
                step={1}
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Month">
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              />
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              >
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p} disabled={takenPriorities.has(p)}>
                    {p} {p === 1 ? "(highest)" : p === 3 ? "(lowest)" : ""}
                    {takenPriorities.has(p) ? " — taken" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

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
              {mode === "create" ? "Create Goal" : "Save Changes"}
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
