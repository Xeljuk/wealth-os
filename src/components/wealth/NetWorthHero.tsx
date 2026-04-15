"use client";

import { useState } from "react";
import type { BalanceSheet, NetWorthPoint, PlanVariant } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import NetWorthProjectionChart from "./NetWorthProjectionChart";

interface Props {
  balanceSheet: BalanceSheet;
  netWorthHistory: NetWorthPoint[];
  monthlySurplus: number;
  activePlan?: PlanVariant;
}

const YEAR_OPTIONS = [1, 3, 5, 10];

export default function NetWorthHero({
  balanceSheet: bs,
  netWorthHistory: _nwh,
  monthlySurplus,
  activePlan,
}: Props) {
  const [years, setYears] = useState<number>(5);

  const change = bs.netWorth - bs.netWorthPrevious;
  const changePct =
    bs.netWorthPrevious !== 0 ? change / bs.netWorthPrevious : 0;
  const totalAssets = bs.assets.reduce((s, a) => s + a.value, 0);

  const currentMonthlySaving = monthlySurplus > 0 ? monthlySurplus : 0;
  const debtExtra = activePlan?.debtExtra ?? 0;

  return (
    <section className="relative">
      {/* Hero number + side stats */}
      <div className="grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 lg:col-span-8">
          <p className="label-meta">Total Net Worth</p>
          <p className="display-hero mt-3">{formatCurrency(bs.netWorth)}</p>
          {changePct !== 0 && (
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span
                className="font-semibold tabular-nums"
                style={{
                  color:
                    change >= 0
                      ? "var(--color-positive)"
                      : "var(--color-negative)",
                }}
              >
                {change >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(change), { compact: true })} (
                {change >= 0 ? "+" : "−"}
                {formatPercent(Math.abs(changePct))})
              </span>{" "}
              since last month
            </p>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div
            className="flex flex-col gap-5 border-l pl-6"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <HeroStat label="Assets" value={formatCurrency(totalAssets)} />
            <HeroStat
              label="Liabilities"
              value={formatCurrency(bs.totalLiabilities)}
            />
            <HeroStat
              label="Monthly capacity"
              value={formatCurrency(monthlySurplus)}
              accent
            />
          </div>
        </div>
      </div>

      {/* Projection section */}
      <div className="mt-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="label-meta">The path ahead</p>
            <h3 className="headline-section mt-2">
              {years === 1
                ? "Where you could stand in twelve months."
                : `Where you could stand in ${years} years.`}
            </h3>
          </div>

          {/* Segmented horizon control */}
          <div
            className="inline-flex items-center gap-1 rounded-xl p-1"
            style={{ backgroundColor: "var(--color-surface-low)" }}
          >
            {YEAR_OPTIONS.map((y) => {
              const active = y === years;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYears(y)}
                  className="rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: active
                      ? "var(--color-surface)"
                      : "transparent",
                    color: active
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                    boxShadow: active
                      ? "0 2px 8px -3px rgba(45, 52, 53, 0.12)"
                      : "none",
                  }}
                >
                  {y === 1 ? "1 year" : `${y} years`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-[11px]">
          <Legend label="Net worth growing" swatch="var(--color-accent)" />
          <Legend label="Debt clearing" swatch="var(--color-negative)" />
          <span style={{ color: "var(--color-text-muted)" }}>
            · Pins mark each debt clearance
          </span>
        </div>

        <div className="mt-4">
          <NetWorthProjectionChart
            baseNetWorth={bs.netWorth}
            investedAssets={bs.investedAssets}
            currentMonthlySaving={currentMonthlySaving}
            debtExtra={debtExtra}
            liabilities={bs.liabilities}
            years={years}
          />
        </div>

        {/* Footer note */}
        <div className="hairline-top mt-4 flex flex-wrap items-center justify-between gap-4 pt-5">
          <p className="body-editorial mt-0 max-w-2xl">
            Above the line, your wealth compounds and steepens each time a
            debt clears. Below, the debt load drains away until the{" "}
            <strong style={{ color: "var(--color-positive)" }}>debt-free</strong>{" "}
            moment — the fulcrum of your next five years.
          </p>
          <p
            className="text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Assumes 6% annual return · planning view
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Small presentational helpers ──────────────────────────────── */

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-1.5 text-xl font-semibold tabular-nums"
        style={{
          color: accent ? "var(--color-accent)" : "var(--color-text-primary)",
          letterSpacing: "-0.015em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Legend({
  label,
  swatch,
}: {
  label: string;
  swatch: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: swatch, opacity: 0.75 }}
      />
      <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
