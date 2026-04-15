"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import type { Asset, AssetCategory, LiquidityTier } from "@/lib/types";

export interface AssetFormValues {
  name: string;
  category: AssetCategory;
  value: number;
  asOfDate: string;
  liquidityTier: LiquidityTier;
  note: string | null;
}

interface AssetFormModalProps {
  mode: "create" | "edit";
  initial?: Asset;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void>;
}

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  cash: "Cash & Reserves",
  investment: "Investments",
  property: "Real Estate",
  vehicle: "Vehicle",
  other: "Other",
};

const LIQUIDITY_LABEL: Record<LiquidityTier, string> = {
  immediate: "Immediate (cash, savings)",
  short_term: "Short-term (liquid investments)",
  long_term: "Long-term (retirement, locked)",
  illiquid: "Illiquid (property, vehicle)",
};

const DEFAULT_LIQUIDITY: Record<AssetCategory, LiquidityTier> = {
  cash: "immediate",
  investment: "short_term",
  property: "illiquid",
  vehicle: "illiquid",
  other: "long_term",
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AssetFormModal({ mode, initial, onClose, onSubmit }: AssetFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? "cash");
  const [value, setValue] = useState<string>(initial ? String(initial.value) : "");
  const [asOfDate, setAsOfDate] = useState(initial?.asOfDate ?? todayIso());
  const [liquidityTier, setLiquidityTier] = useState<LiquidityTier>(
    initial?.liquidityTier ?? "immediate",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCategoryChange(next: AssetCategory) {
    setCategory(next);
    if (mode === "create") {
      setLiquidityTier(DEFAULT_LIQUIDITY[next]);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const v = Number(value);
    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(v) || v < 0) return setError("Value must be a non-negative number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return setError("Valuation date must be YYYY-MM-DD");

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        value: v,
        asOfDate,
        liquidityTier,
        note: note.trim() || null,
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
              {mode === "create" ? "New Asset" : "Edit Asset"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {mode === "create" ? "Add an asset" : initial?.name}
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
              placeholder="e.g. Checking Account"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
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
            <Field label="Value">
              <input
                type="number"
                min={0}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
              />
            </Field>
          </div>

          <Field label="Liquidity Tier">
            <select
              value={liquidityTier}
              onChange={(e) => setLiquidityTier(e.target.value as LiquidityTier)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            >
              {Object.entries(LIQUIDITY_LABEL).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Valuation Date">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

          <Field label="Note (optional)">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. joint account"
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface-low)", color: "var(--color-text-primary)" }}
            />
          </Field>

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
              {mode === "create" ? "Create Asset" : "Save Changes"}
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
