"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import type { Liability, LiabilityCategory } from "@/lib/types";

export interface LiabilityFormValues {
  name: string;
  category: LiabilityCategory;
  balance: number;
  monthlyPayment: number;
  apr: number | null;
  remainingPayments: number | null;
}

interface LiabilityFormModalProps {
  mode: "create" | "edit";
  initial?: Liability;
  onClose: () => void;
  onSubmit: (values: LiabilityFormValues) => Promise<void>;
}

const CATEGORY_LABEL: Record<LiabilityCategory, string> = {
  loan: "Personal Loan",
  credit_card: "Credit Card / Revolving",
  mortgage: "Mortgage",
  installment: "Installment",
  other: "Other",
};

export default function LiabilityFormModal({
  mode,
  initial,
  onClose,
  onSubmit,
}: LiabilityFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<LiabilityCategory>(initial?.category ?? "loan");
  const [balance, setBalance] = useState<string>(initial ? String(initial.balance) : "");
  const [monthlyPayment, setMonthlyPayment] = useState<string>(
    initial ? String(initial.monthlyPayment) : "",
  );
  const [apr, setApr] = useState<string>(initial?.apr != null ? String(initial.apr) : "");
  const [remainingPayments, setRemainingPayments] = useState<string>(
    initial?.remainingPayments != null ? String(initial.remainingPayments) : "",
  );
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

    const b = Number(balance);
    const mp = Number(monthlyPayment);
    const aprNum = apr === "" ? null : Number(apr);
    const remNum = remainingPayments === "" ? null : Number(remainingPayments);

    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(b) || b < 0) return setError("Balance must be a non-negative number");
    if (!Number.isFinite(mp) || mp < 0) return setError("Monthly payment must be a non-negative number");
    if (aprNum !== null && (!Number.isFinite(aprNum) || aprNum < 0)) {
      return setError("APR must be a non-negative number or blank");
    }
    if (remNum !== null && (!Number.isFinite(remNum) || remNum < 0)) {
      return setError("Remaining payments must be a non-negative integer or blank");
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        balance: b,
        monthlyPayment: mp,
        apr: aprNum,
        remainingPayments: remNum,
      });
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
              {mode === "create" ? "New Liability" : "Edit Liability"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "create" ? "Add a liability" : initial?.name}
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
              placeholder="e.g. Personal Loan"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LiabilityCategory)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            >
              {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Balance">
              <input
                type="number"
                min={0}
                step={1}
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
              />
            </Field>
            <Field label="Monthly Payment">
              <input
                type="number"
                min={0}
                step={1}
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="APR % (optional)">
              <input
                type="number"
                min={0}
                step={0.1}
                value={apr}
                onChange={(e) => setApr(e.target.value)}
                placeholder="e.g. 38"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
              />
            </Field>
            <Field label="Remaining Payments (optional)">
              <input
                type="number"
                min={0}
                step={1}
                value={remainingPayments}
                onChange={(e) => setRemainingPayments(e.target.value)}
                placeholder="e.g. 10"
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
              />
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
              {mode === "create" ? "Create Liability" : "Save Changes"}
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
