"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, Loader2 } from "lucide-react";

interface SafetyBufferModalProps {
  initial: number;
  currencySymbol: string;
  onClose: () => void;
  onSubmit: (value: number) => Promise<void>;
}

export default function SafetyBufferModal({
  initial,
  currencySymbol,
  onClose,
  onSubmit,
}: SafetyBufferModalProps) {
  const [value, setValue] = useState<string>(String(initial));
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
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return setError("Must be a non-negative number");
    setSubmitting(true);
    try {
      await onSubmit(n);
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
              Edit
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Safety Buffer
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

        <p
          className="mt-3 text-xs leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          Reserved monthly before allocatable surplus is calculated. A higher buffer
          protects you against income disruption but slows goal funding.
        </p>

        <form className="mt-5" onSubmit={handleSubmit}>
          <label className="label-meta" style={{ color: "var(--color-text-muted)" }}>
            Monthly Buffer ({currencySymbol})
          </label>
          <input
            type="number"
            min={0}
            step={100}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--color-surface-low)",
              color: "var(--color-text-primary)",
            }}
          />

          {error && (
            <p className="mt-3 text-xs" style={{ color: "var(--color-negative)" }}>
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
