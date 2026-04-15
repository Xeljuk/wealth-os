"use client";

import { useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatMonth } from "@/lib/format";
import type {
  Asset,
  AssetCategory,
  Liability,
  LiquidityTier,
  LiabilityCategory,
} from "@/lib/types";
import AssetFormModal, {
  type AssetFormValues,
} from "@/components/assets/AssetFormModal";
import LiabilityFormModal, {
  type LiabilityFormValues,
} from "@/components/assets/LiabilityFormModal";
import {
  Wallet,
  BarChart3,
  Home,
  Car,
  Landmark,
  Receipt,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";

/* ── Config ───────────────────────────────────────────────────── */

const ASSET_CONFIG: Record<
  AssetCategory,
  { Icon: ComponentType<{ size?: number }>; label: string; color: string }
> = {
  cash: {
    Icon: Wallet,
    label: "Cash & Reserves",
    color: "var(--color-positive)",
  },
  investment: {
    Icon: BarChart3,
    label: "Investments",
    color: "var(--color-accent)",
  },
  property: {
    Icon: Home,
    label: "Real Estate",
    color: "var(--color-moss)",
  },
  vehicle: {
    Icon: Car,
    label: "Vehicle",
    color: "var(--color-text-secondary)",
  },
  other: {
    Icon: Landmark,
    label: "Other",
    color: "var(--color-text-muted)",
  },
};

const LIQUIDITY_CONFIG: Record<
  LiquidityTier,
  { label: string; color: string; bg: string }
> = {
  immediate: {
    label: "Liquid",
    color: "var(--color-positive)",
    bg: "var(--color-positive-light)",
  },
  short_term: {
    label: "Semi-liquid",
    color: "var(--color-accent)",
    bg: "var(--color-accent-light)",
  },
  long_term: {
    label: "Long-term",
    color: "var(--color-text-muted)",
    bg: "var(--color-surface-low)",
  },
  illiquid: {
    label: "Illiquid",
    color: "var(--color-text-muted)",
    bg: "var(--color-surface-low)",
  },
};

const LIABILITY_ICONS: Record<
  LiabilityCategory,
  ComponentType<{ size?: number }>
> = {
  loan: Landmark,
  installment: Receipt,
  credit_card: CreditCard,
  mortgage: Home,
  other: Landmark,
};

const LIABILITY_LABEL: Record<LiabilityCategory, string> = {
  loan: "Loan",
  installment: "Installment",
  credit_card: "Credit Card",
  mortgage: "Mortgage",
  other: "Other",
};

const INSIGHT_CONFIG: Record<
  string,
  { color: string; Icon: ComponentType<{ size?: number }> }
> = {
  attention: { color: "var(--color-warning)", Icon: AlertTriangle },
  info: { color: "var(--color-accent)", Icon: Lightbulb },
  positive: { color: "var(--color-positive)", Icon: TrendingUp },
};

type AssetModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; asset: Asset };

type LiabilityModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; liability: Liability };

/* ── Page ──────────────────────────────────────────────────────── */
export default function AssetBoard() {
  const { snapshot, refreshSnapshot } = useWealth();
  const toast = useToast();
  const { balanceSheet: rawBs, cashFlow: cf } = snapshot;

  const [assetModal, setAssetModal] = useState<AssetModalState>({ kind: "closed" });
  const [assetError, setAssetError] = useState<string | null>(null);
  const [liabilityModal, setLiabilityModal] = useState<LiabilityModalState>({
    kind: "closed",
  });
  const [liabilityError, setLiabilityError] = useState<string | null>(null);
  const [pendingAssetIds, setPendingAssetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingLiabilityIds, setPendingLiabilityIds] = useState<Set<string>>(
    () => new Set(),
  );

  const bs = useMemo(
    () => ({
      ...rawBs,
      assets: rawBs.assets.filter((a) => !pendingAssetIds.has(a.id)),
      liabilities: rawBs.liabilities.filter(
        (l) => !pendingLiabilityIds.has(l.id),
      ),
    }),
    [rawBs, pendingAssetIds, pendingLiabilityIds],
  );

  // ── Handlers ─────────────────────────────────────────────────
  async function handleAssetCreate(values: AssetFormValues) {
    setAssetError(null);
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setAssetModal({ kind: "closed" });
    toast.success(`Asset "${values.name}" added`);
  }

  async function handleAssetUpdate(id: string, values: AssetFormValues) {
    setAssetError(null);
    const res = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setAssetModal({ kind: "closed" });
    toast.success(`Asset "${values.name}" updated`);
  }

  function handleAssetDelete(asset: Asset) {
    setAssetError(null);
    setPendingAssetIds((prev) => new Set(prev).add(asset.id));
    toast.undo({
      message: `Asset "${asset.name}" deleted`,
      onUndo: () => {
        setPendingAssetIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Request failed (${res.status})`);
          }
          await refreshSnapshot();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete asset",
          );
        } finally {
          setPendingAssetIds((prev) => {
            const next = new Set(prev);
            next.delete(asset.id);
            return next;
          });
        }
      },
    });
  }

  async function handleLiabilityCreate(values: LiabilityFormValues) {
    setLiabilityError(null);
    const res = await fetch("/api/liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setLiabilityModal({ kind: "closed" });
    toast.success(`Liability "${values.name}" added`);
  }

  async function handleLiabilityUpdate(id: string, values: LiabilityFormValues) {
    setLiabilityError(null);
    const res = await fetch(`/api/liabilities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    await refreshSnapshot();
    setLiabilityModal({ kind: "closed" });
    toast.success(`Liability "${values.name}" updated`);
  }

  function handleLiabilityDelete(liability: Liability) {
    setLiabilityError(null);
    setPendingLiabilityIds((prev) => new Set(prev).add(liability.id));
    toast.undo({
      message: `Liability "${liability.name}" deleted`,
      onUndo: () => {
        setPendingLiabilityIds((prev) => {
          const next = new Set(prev);
          next.delete(liability.id);
          return next;
        });
      },
      onTimeout: async () => {
        try {
          const res = await fetch(`/api/liabilities/${liability.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Request failed (${res.status})`);
          }
          await refreshSnapshot();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Could not delete liability",
          );
        } finally {
          setPendingLiabilityIds((prev) => {
            const next = new Set(prev);
            next.delete(liability.id);
            return next;
          });
        }
      },
    });
  }

  // ── Derived values ───────────────────────────────────────────
  const totalAssets = bs.assets.reduce((s, a) => s + a.value, 0);
  const liabilityRatio =
    totalAssets > 0 ? (bs.totalLiabilities / totalAssets) * 100 : 0;

  // Aggregate assets by category
  const byCategory = (
    ["cash", "investment", "property", "vehicle", "other"] as AssetCategory[]
  )
    .map((cat) => {
      const items = bs.assets.filter((a) => a.category === cat);
      const total = items.reduce((s, a) => s + a.value, 0);
      const pct = totalAssets > 0 ? (total / totalAssets) * 100 : 0;
      return { category: cat, total, pct, count: items.length };
    })
    .filter((c) => c.total > 0);

  const productiveAmount = bs.investedAssets;
  const productivePct =
    totalAssets > 0 ? Math.round((productiveAmount / totalAssets) * 100) : 0;
  const illiquidPct =
    totalAssets > 0 ? Math.round((bs.realAssets / totalAssets) * 100) : 0;

  const monthlyObligations =
    cf.totalFixed + cf.totalVariable + cf.totalDebtService;
  const liquidityCoverageMonths =
    monthlyObligations > 0
      ? (bs.liquidAssets / monthlyObligations).toFixed(1)
      : "0.0";

  const insights: { type: string; text: string }[] = [
    {
      type: "attention",
      text: `${illiquidPct}% of wealth is illiquid — concentrated in property and vehicle. Any large unexpected need would require liquidation or new borrowing.`,
    },
    {
      type: "info",
      text: `Liquid reserves cover approximately ${liquidityCoverageMonths} months of total obligations. The recommended minimum for financial resilience is 3 months.`,
    },
    {
      type: "attention",
      text: `Productive capital (investments) at ${productivePct}% is underweight — the vast majority of wealth sits in non-income-generating assets.`,
    },
    {
      type: "positive",
      text: `Liabilities are structurally manageable at ${liabilityRatio.toFixed(1)}% of total assets. The composition — not the total — is the thing to optimize.`,
    },
  ];

  const addAssetButton = (
    <button
      type="button"
      onClick={() => setAssetModal({ kind: "create" })}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
      style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
    >
      <Plus size={14} /> Add asset
    </button>
  );

  return (
    <PageShell
      eyebrow={`Balance Sheet · ${formatMonth(snapshot.period)}`}
      title="The architecture of what you own."
      subtitle="What you hold, what you owe, and the structure that shapes how resilient, liquid, and productive your wealth actually is."
      headerAction={addAssetButton}
    >
      {(assetError || liabilityError) && (
        <div
          className="mb-10 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-negative-light)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-negative)" }}>
            {assetError || liabilityError}
          </p>
        </div>
      )}

      {/* ── Hero: Total assets + balance sheet stats ──────────── */}
      <div className="grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 lg:col-span-8">
          <p className="label-meta">Total Assets</p>
          <p className="display-hero mt-3">{formatCurrency(totalAssets)}</p>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Across {bs.assets.length}{" "}
            {bs.assets.length === 1 ? "holding" : "holdings"} in{" "}
            {byCategory.length}{" "}
            {byCategory.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <div
            className="flex flex-col gap-5 border-l pl-6"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <HeroStat
              label="Liabilities"
              value={formatCurrency(bs.totalLiabilities)}
              color="var(--color-negative)"
            />
            <HeroStat
              label="Net position"
              value={formatCurrency(bs.netWorth)}
              color="var(--color-accent)"
            />
            <HeroStat
              label="Leverage"
              value={`${liabilityRatio.toFixed(1)}%`}
              color="var(--color-text-secondary)"
            />
          </div>
        </div>
      </div>

      {/* ── Composition bar — the main inventory visual ──────── */}
      <div className="mt-12">
        <p
          className="mb-4 label-meta"
          style={{ color: "var(--color-text-muted)" }}
        >
          Asset composition
        </p>

        {/* Stacked horizontal bar */}
        <div
          className="flex h-10 w-full overflow-hidden rounded-md"
          style={{ backgroundColor: "var(--color-surface-low)" }}
        >
          {byCategory.map((c) => {
            const cfg = ASSET_CONFIG[c.category];
            return (
              <div
                key={c.category}
                className="relative flex items-center justify-center"
                style={{
                  width: `${c.pct}%`,
                  backgroundColor: cfg.color,
                  opacity: 0.78,
                }}
                title={`${cfg.label}: ${formatCurrency(c.total)}`}
              />
            );
          })}
        </div>

        {/* Legend row */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-5">
          {byCategory.map((c) => {
            const cfg = ASSET_CONFIG[c.category];
            return (
              <div key={c.category} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: cfg.color, opacity: 0.78 }}
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className="truncate text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    className="text-[14px] font-semibold tabular-nums"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatCurrency(c.total, { compact: true })}
                  </span>
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {Math.round(c.pct)}% · {c.count}{" "}
                    {c.count === 1 ? "item" : "items"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Structure section: liquidity + productivity ──────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 max-w-2xl">
          <p className="label-meta">Structural view</p>
          <h2 className="display-page mt-2">How your capital behaves.</h2>
          <p className="lead-text mt-4">
            The same total tells two different stories depending on how you
            read it — by how quickly you can access it, and how much of it is
            actually working for you.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-x-12 gap-y-12">
          {/* Liquidity layers */}
          <div className="col-span-12 lg:col-span-6">
            <h3
              className="text-[18px] font-semibold tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.015em",
              }}
            >
              Liquidity layers
            </h3>
            <p
              className="mt-1 text-[13px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              {liquidityCoverageMonths} months of obligations covered by
              liquid reserves
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <LayerRow
                label="Immediate"
                amount={bs.liquidAssets}
                total={totalAssets}
                color="var(--color-positive)"
              />
              <LayerRow
                label="Invested"
                amount={bs.investedAssets}
                total={totalAssets}
                color="var(--color-accent)"
              />
              <LayerRow
                label="Illiquid"
                amount={bs.realAssets}
                total={totalAssets}
                color="var(--color-text-muted)"
              />
            </div>
          </div>

          {/* Productive vs static */}
          <div className="col-span-12 lg:col-span-6">
            <h3
              className="text-[18px] font-semibold tracking-tight"
              style={{
                color: "var(--color-text-primary)",
                letterSpacing: "-0.015em",
              }}
            >
              Productive vs static
            </h3>
            <p
              className="mt-1 text-[13px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Capital that compounds vs. capital that just sits
            </p>

            <div className="mt-6">
              <div
                className="flex h-14 overflow-hidden rounded-md"
                style={{ backgroundColor: "var(--color-surface-low)" }}
              >
                <div
                  className="flex flex-col justify-center pl-4"
                  style={{
                    width: `${productivePct}%`,
                    backgroundColor: "var(--color-accent)",
                    opacity: 0.85,
                  }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider text-white/90"
                  >
                    Productive
                  </span>
                  <span className="text-[13px] font-semibold text-white">
                    {productivePct}%
                  </span>
                </div>
                <div
                  className="flex flex-col justify-center pl-4"
                  style={{
                    width: `${100 - productivePct}%`,
                    backgroundColor: "var(--color-surface-low)",
                  }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Static
                  </span>
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {100 - productivePct}%
                  </span>
                </div>
              </div>
              <p
                className="mt-4 body-editorial mt-0"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Only{" "}
                <strong style={{ color: "var(--color-accent)" }}>
                  {formatCurrency(productiveAmount, { compact: true })}
                </strong>{" "}
                is actively compounding through investment markets. The
                remaining{" "}
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {formatCurrency(totalAssets - productiveAmount, {
                    compact: true,
                  })}
                </strong>{" "}
                is stored in fixed assets and cash — stable but inert.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset inventory — CRUD grid ───────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Inventory</p>
            <h2 className="display-page mt-2">Each holding, in detail.</h2>
          </div>
          <button
            type="button"
            onClick={() => setAssetModal({ kind: "create" })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add asset
          </button>
        </div>

        {bs.assets.length === 0 ? (
          <p
            className="body-editorial"
            style={{ color: "var(--color-text-muted)" }}
          >
            No assets yet. Add one to activate inventory analysis.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {bs.assets.map((asset) => {
              const cfg = ASSET_CONFIG[asset.category];
              const liq = LIQUIDITY_CONFIG[asset.liquidityTier];
              const AssetIcon = cfg.Icon;
              const pct =
                totalAssets > 0
                  ? Math.round((asset.value / totalAssets) * 100)
                  : 0;

              return (
                <div
                  key={asset.id}
                  className="flex flex-col gap-4 py-5"
                  style={{
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: "var(--color-surface-low)",
                          color: cfg.color,
                        }}
                      >
                        <AssetIcon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p
                          className="label-meta"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {cfg.label}
                        </p>
                        <p
                          className="mt-0.5 truncate text-[15px] font-semibold tracking-tight"
                          style={{
                            color: "var(--color-text-primary)",
                            letterSpacing: "-0.015em",
                          }}
                        >
                          {asset.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]"
                        style={{ backgroundColor: liq.bg, color: liq.color }}
                      >
                        {liq.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssetModal({ kind: "edit", asset })
                        }
                        className="rounded p-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-text-muted)" }}
                        title="Edit asset"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssetDelete(asset)}
                        className="rounded p-1 transition-opacity hover:opacity-70"
                        style={{ color: "var(--color-negative)" }}
                        title="Delete asset"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex items-end justify-between pt-2"
                    style={{ borderTop: "1px solid var(--color-border-light)" }}
                  >
                    <p
                      className="text-[22px] font-bold tracking-tight tabular-nums"
                      style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatCurrency(asset.value)}
                    </p>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {pct}% of total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Liability structure ──────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Liabilities</p>
            <h2 className="display-page mt-2">What you owe, categorized.</h2>
            <p className="lead-text mt-4">
              {formatCurrency(cf.totalDebtService)} of monthly debt service
              across {bs.liabilities.length}{" "}
              {bs.liabilities.length === 1 ? "obligation" : "obligations"} —
              the pressure you&apos;re paying down each month.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLiabilityModal({ kind: "create" })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add liability
          </button>
        </div>

        <div className="flex flex-col">
          {/* Header row */}
          <div
            className="grid grid-cols-12 gap-4 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <span className="col-span-4">Name</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-2 text-right">Balance</span>
            <span className="col-span-2 text-right">Monthly</span>
            <span className="col-span-1 text-right">APR</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>

          {bs.liabilities.length === 0 ? (
            <p
              className="py-6 body-editorial"
              style={{ color: "var(--color-text-muted)" }}
            >
              No liabilities. Enjoy the clean slate.
            </p>
          ) : (
            bs.liabilities.map((liab) => {
              const LiabIcon = LIABILITY_ICONS[liab.category] ?? Landmark;
              const hasHighApr = (liab.apr ?? 0) > 30;

              return (
                <div
                  key={liab.id}
                  className="grid grid-cols-12 items-center gap-4 py-5"
                  style={{
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <div className="col-span-4 flex min-w-0 items-center gap-3">
                    <span
                      className="shrink-0"
                      style={{
                        color: hasHighApr
                          ? "var(--color-warning)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      <LiabIcon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="truncate text-[15px] font-semibold"
                        style={{
                          color: "var(--color-text-primary)",
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {liab.name}
                      </p>
                      {liab.remainingPayments != null && (
                        <p
                          className="mt-0.5 text-[11px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {liab.remainingPayments} payments remaining
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className="col-span-2 text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {LIABILITY_LABEL[liab.category]}
                  </span>
                  <span
                    className="col-span-2 text-right text-[15px] font-semibold tabular-nums"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatCurrency(liab.balance)}
                  </span>
                  <span
                    className="col-span-2 text-right text-[13px] tabular-nums"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {formatCurrency(liab.monthlyPayment, { compact: true })}/mo
                  </span>
                  <span
                    className="col-span-1 text-right text-[13px] font-semibold tabular-nums"
                    style={{
                      color: hasHighApr
                        ? "var(--color-warning)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {liab.apr != null ? `${liab.apr}%` : "—"}
                  </span>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLiabilityModal({ kind: "edit", liability: liab })
                      }
                      className="rounded p-1 transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-text-muted)" }}
                      title="Edit liability"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLiabilityDelete(liab)}
                      className="rounded p-1 transition-opacity hover:opacity-70"
                      style={{ color: "var(--color-negative)" }}
                      title="Delete liability"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Insights — structural reading ────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Structural reading</p>
          <h2 className="display-page mt-2">
            What this inventory is telling you.
          </h2>
        </div>

        <div className="flex flex-col gap-5">
          {insights.map((ins, i) => {
            const cfg = INSIGHT_CONFIG[ins.type] ?? INSIGHT_CONFIG.info;
            const InsIcon = cfg.Icon;
            return (
              <div
                key={i}
                className="flex gap-4 border-l-2 py-1 pl-5"
                style={{ borderLeftColor: cfg.color }}
              >
                <span className="mt-0.5 shrink-0" style={{ color: cfg.color }}>
                  <InsIcon size={14} />
                </span>
                <p
                  className="body-editorial mt-0"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {ins.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {assetModal.kind === "create" && (
        <AssetFormModal
          mode="create"
          onClose={() => setAssetModal({ kind: "closed" })}
          onSubmit={handleAssetCreate}
        />
      )}
      {assetModal.kind === "edit" && (
        <AssetFormModal
          mode="edit"
          initial={assetModal.asset}
          onClose={() => setAssetModal({ kind: "closed" })}
          onSubmit={(values) => handleAssetUpdate(assetModal.asset.id, values)}
        />
      )}
      {liabilityModal.kind === "create" && (
        <LiabilityFormModal
          mode="create"
          onClose={() => setLiabilityModal({ kind: "closed" })}
          onSubmit={handleLiabilityCreate}
        />
      )}
      {liabilityModal.kind === "edit" && (
        <LiabilityFormModal
          mode="edit"
          initial={liabilityModal.liability}
          onClose={() => setLiabilityModal({ kind: "closed" })}
          onSubmit={(values) =>
            handleLiabilityUpdate(liabilityModal.liability.id, values)
          }
        />
      )}
    </PageShell>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */

function HeroStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-1.5 text-xl font-semibold tabular-nums"
        style={{ color, letterSpacing: "-0.015em" }}
      >
        {value}
      </p>
    </div>
  );
}

function LayerRow({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span
          className="font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
        </span>
        <span className="tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
          {formatCurrency(amount, { compact: true })}{" "}
          <span style={{ color: "var(--color-text-muted)" }}>· {pct}%</span>
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border-light)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  );
}
