"use client";

import { useState, useEffect, FormEvent } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { Loader2, Check, User, DollarSign, Sliders } from "lucide-react";

type Stance = "safe" | "balanced" | "aggressive";

interface PlanRow {
  stance: Stance;
  debt_extra: number;
  goal_funding: number;
  investment_contribution: number;
  liquidity_reserve: number;
  headline: string;
  description: string;
}

const STANCE_ORDER: Stance[] = ["safe", "balanced", "aggressive"];
const STANCE_LABEL: Record<Stance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

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

      <PlanVariantEditor />
    </PageShell>
  );
}

function PlanVariantEditor() {
  const { refreshSnapshot } = useWealth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStance, setSavingStance] = useState<Stance | null>(null);
  const [savedStance, setSavedStance] = useState<Stance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.rows ?? []) as PlanRow[];
        rows.sort(
          (a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance),
        );
        setPlans(rows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  function update(stance: Stance, patch: Partial<PlanRow>) {
    setPlans((prev) =>
      prev.map((p) => (p.stance === stance ? { ...p, ...patch } : p)),
    );
  }

  async function save(stance: Stance) {
    const plan = plans.find((p) => p.stance === stance);
    if (!plan) return;
    setSavingStance(stance);
    setError(null);
    setSavedStance(null);
    try {
      const res = await fetch("/api/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stance: plan.stance,
          debtExtra: plan.debt_extra,
          goalFunding: plan.goal_funding,
          investmentContribution: plan.investment_contribution,
          liquidityReserve: plan.liquidity_reserve,
          headline: plan.headline,
          description: plan.description,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      await refreshSnapshot();
      setSavedStance(stance);
      setTimeout(() => setSavedStance(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingStance(null);
    }
  }

  return (
    <div className="section-breath-lg hairline-top pt-16">
      <div className="mb-8 max-w-2xl">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            <Sliders size={16} />
          </span>
          <div>
            <p
              className="label-meta"
              style={{ color: "var(--color-text-muted)" }}
            >
              Plan variants
            </p>
            <p
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              How each stance allocates your monthly surplus
            </p>
          </div>
        </div>
        <p
          className="mt-4 text-[13px] leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          These numbers were seeded when you set up the prototype. Tune them to
          match your real appetite for debt payoff, goal saving, investment,
          and liquidity. Changes flow through to scenarios and the copilot.
        </p>
      </div>

      {loading && (
        <p
          className="text-[13px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          Loading plan variants…
        </p>
      )}

      {error && (
        <p
          className="mb-4 text-[13px]"
          style={{ color: "var(--color-negative)" }}
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.stance}
            className="flex flex-col gap-4 rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-accent)" }}
              >
                {STANCE_LABEL[plan.stance]}
              </p>
              <input
                type="text"
                value={plan.headline}
                onChange={(e) => update(plan.stance, { headline: e.target.value })}
                className="mt-2 w-full rounded-lg px-3 py-2 text-[14px] font-semibold tracking-tight outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <NumField
              label="Debt extra"
              value={plan.debt_extra}
              onChange={(v) => update(plan.stance, { debt_extra: v })}
            />
            <NumField
              label="Goal funding"
              value={plan.goal_funding}
              onChange={(v) => update(plan.stance, { goal_funding: v })}
            />
            <NumField
              label="Investment contribution"
              value={plan.investment_contribution}
              onChange={(v) => update(plan.stance, { investment_contribution: v })}
            />
            <NumField
              label="Liquidity reserve"
              value={plan.liquidity_reserve}
              onChange={(v) => update(plan.stance, { liquidity_reserve: v })}
            />

            <div>
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Description
              </label>
              <textarea
                rows={3}
                value={plan.description}
                onChange={(e) =>
                  update(plan.stance, { description: e.target.value })
                }
                className="mt-1 w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed outline-none"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => save(plan.stance)}
              disabled={savingStance === plan.stance}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {savingStance === plan.stance && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {savedStance === plan.stance ? (
                <>
                  <Check size={14} /> Saved
                </>
              ) : (
                "Save variant"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
        step={100}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-lg px-3 py-2 text-[14px] font-semibold tabular-nums outline-none"
        style={{
          backgroundColor: "var(--color-surface-low)",
          color: "var(--color-text-primary)",
        }}
      />
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
