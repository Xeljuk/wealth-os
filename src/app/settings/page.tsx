"use client";

import { useState, useEffect, FormEvent } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { Loader2, Check, User, DollarSign } from "lucide-react";

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
];

export default function SettingsPage() {
  const { snapshot, refreshSnapshot } = useWealth();
  const { profile } = snapshot;

  const [displayName, setDisplayName] = useState(profile.name);
  const [currencyCode, setCurrencyCode] = useState(profile.currency);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.name);
    setCurrencyCode(profile.currency);
  }, [profile]);

  const selectedCurrency =
    CURRENCY_OPTIONS.find((c) => c.code === currencyCode) ??
    CURRENCY_OPTIONS[0]!;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!displayName.trim()) return setError("Display name is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          currency: selectedCurrency.code,
          currencySymbol: selectedCurrency.symbol,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Request failed (${res.status})`);
      }
      await refreshSnapshot();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <div className="pb-10 pt-6">
        <h1
          className="text-[2.75rem] font-bold leading-tight tracking-tight lg:text-[3.25rem]"
          style={{ color: "var(--color-text-primary)" }}
        >
          Your <span style={{ color: "var(--color-accent)" }}>Profile.</span>
        </h1>
        <p
          className="mt-3 max-w-lg text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Identity and currency preferences. Safety buffer lives on Cash Flow, operating
          stance on Scenarios.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="atmospheric-shadow rounded-2xl p-7 lg:p-8"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {/* Identity */}
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--color-accent-light)", color: "var(--color-accent)" }}
          >
            <User size={16} />
          </span>
          <div>
            <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
              Identity
            </p>
            <p
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Who you are in Wealth OS
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Field label="Display Name">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-primary)",
              }}
            />
          </Field>
        </div>

        {/* Currency */}
        <div className="mt-8 flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--color-accent-light)", color: "var(--color-accent)" }}
          >
            <DollarSign size={16} />
          </span>
          <div>
            <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
              Currency
            </p>
            <p
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              How amounts are displayed across the app
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Field label="Currency">
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--color-surface-low)",
                color: "var(--color-text-primary)",
              }}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name} ({c.code})
                </option>
              ))}
            </select>
          </Field>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            Selected:{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {selectedCurrency.symbol} {selectedCurrency.name}
            </strong>
          </p>
        </div>

        {/* Actions */}
        <div
          className="mt-8 flex items-center justify-between border-t pt-6"
          style={{ borderColor: "var(--color-surface-low)" }}
        >
          <div className="text-xs">
            {error && <span style={{ color: "var(--color-negative)" }}>{error}</span>}
            {saved && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: "var(--color-positive)" }}
              >
                <Check size={12} /> Saved
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </PageShell>
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
