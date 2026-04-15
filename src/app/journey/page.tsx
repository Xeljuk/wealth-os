"use client";

import { useMemo } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { formatCurrency, formatMonth, formatMonthWithOffset } from "@/lib/format";
import {
  TrendingUp,
  Shield,
  Home,
  Wallet,
  Target,
  Star,
  ArrowRight,
  Flag,
} from "lucide-react";
import Link from "next/link";

const GOAL_TYPE_ICONS: Record<string, typeof TrendingUp> = {
  emergency_fund: Shield,
  down_payment: Home,
  car_purchase: Wallet,
  portfolio_growth: TrendingUp,
  debt_reduction: Star,
  custom: Target,
};

interface MilestoneEvent {
  month: number;
  label: string;
  date: string;
  value: number;
  type: "debt" | "goal";
  icon: typeof TrendingUp;
  description: string;
}

interface MonthPoint {
  month: number;
  netWorth: number;
}

export default function JourneyPage() {
  const { snapshot, goalTrajectories, activePlan, alphaStatus } = useWealth();
  const { balanceSheet: bs, cashFlow: cf } = snapshot;

  const HORIZON = 60;

  const { curve, milestones, firstMilestone, finalNetWorth } = useMemo(() => {
    const monthlyReturn = 0.06 / 12;

    let debt = bs.totalLiabilities;
    const debtPayment = cf.totalDebtService + (activePlan?.debtExtra ?? 0);
    let debtCleared = debt <= 0;

    const goalState = goalTrajectories.map((g) => ({
      ...g,
      current: g.currentAmount,
      completed: g.currentAmount >= g.targetAmount,
    }));

    let investments = bs.investedAssets;
    const otherAssets =
      bs.assets.reduce((s, a) => s + a.value, 0) - bs.investedAssets;

    const curvePoints: MonthPoint[] = [];
    const events: MilestoneEvent[] = [];
    let firstNext: MilestoneEvent | null = null;

    for (let m = 0; m <= HORIZON; m++) {
      if (m > 0) {
        investments =
          investments * (1 + monthlyReturn) +
          (activePlan?.investmentContribution ?? 0);

        if (!debtCleared) {
          debt = Math.max(0, debt - debtPayment);
          if (debt === 0) {
            debtCleared = true;
            const ev: MilestoneEvent = {
              month: m,
              label: "Debt cleared",
              date: formatMonthWithOffset(snapshot.period, m),
              value: otherAssets + investments,
              type: "debt",
              icon: Star,
              description:
                "All liabilities paid off — freed capacity flows to goals.",
            };
            events.push(ev);
            if (!firstNext) firstNext = ev;
          }
        }

        for (const g of goalState) {
          if (g.completed) continue;
          g.current = Math.min(g.current + g.allocation, g.targetAmount);
          if (g.current >= g.targetAmount) {
            g.completed = true;
            const ev: MilestoneEvent = {
              month: m,
              label: g.name,
              date: formatMonthWithOffset(snapshot.period, m),
              value: g.targetAmount,
              type: "goal",
              icon: GOAL_TYPE_ICONS[g.type] ?? Target,
              description: `${g.name} target reached — ${formatCurrency(
                g.targetAmount,
                { compact: true },
              )} secured.`,
            };
            events.push(ev);
            if (!firstNext) firstNext = ev;
          }
        }
      }
      curvePoints.push({ month: m, netWorth: otherAssets + investments });
    }

    return {
      curve: curvePoints,
      milestones: events,
      firstMilestone: firstNext,
      finalNetWorth: curvePoints[curvePoints.length - 1]!.netWorth,
    };
  }, [snapshot.period, bs, cf, goalTrajectories, activePlan]);

  const minY = Math.min(...curve.map((c) => c.netWorth));
  const maxY = Math.max(...curve.map((c) => c.netWorth));

  // SVG geometry
  const VB_W = 920;
  const VB_H = 320;
  const PAD_T = 40;
  const PAD_R = 80;
  const PAD_B = 48;
  const PAD_L = 40;
  const PLOT_W = VB_W - PAD_L - PAD_R;
  const PLOT_H = VB_H - PAD_T - PAD_B;

  const xAt = (month: number) => PAD_L + (month / HORIZON) * PLOT_W;
  const yAt = (value: number) => {
    const range = maxY - minY || 1;
    return PAD_T + PLOT_H - ((value - minY) / range) * PLOT_H;
  };

  const curvePath = curve
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xAt(p.month).toFixed(2)} ${yAt(p.netWorth).toFixed(2)}`,
    )
    .join(" ");

  const curveAreaPath =
    curvePath +
    ` L ${xAt(HORIZON).toFixed(2)} ${(PAD_T + PLOT_H).toFixed(2)}` +
    ` L ${xAt(0).toFixed(2)} ${(PAD_T + PLOT_H).toFixed(2)} Z`;

  return (
    <PageShell
      eyebrow={`Journey · ${formatMonth(snapshot.period)}`}
      title="The five-year walk ahead."
      subtitle="A month-by-month projection of your net worth trajectory, with the milestones your plan is carrying you toward."
    >
      {!alphaStatus.hasCustomData && (
        <div
          className="mb-10 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-vellum-deep)" }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            You are viewing a demo profile in private alpha. Add your own
            numbers in{" "}
            <Link
              href="/alpha-setup"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Alpha Setup
            </Link>{" "}
            for a personalized projection.
          </p>
        </div>
      )}

      {/* Hero — next milestone + 5-year terminal */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label-meta">Next milestone</p>
          {firstMilestone ? (
            <>
              <h2 className="display-page mt-3">
                {firstMilestone.label} · {firstMilestone.date}
              </h2>
              <p
                className="lead-text mt-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {firstMilestone.description}
              </p>
            </>
          ) : (
            <h2 className="display-page mt-3">
              No milestones on the horizon yet.
            </h2>
          )}
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div
            className="flex flex-col gap-4 border-l pl-6"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <HeroStat
              label="5-year net worth"
              value={formatCurrency(finalNetWorth, { compact: true })}
              accent
            />
            <HeroStat
              label="Milestones ahead"
              value={String(milestones.length)}
            />
            <HeroStat
              label="Horizon"
              value={`${HORIZON} months`}
            />
          </div>
        </div>
      </div>

      {/* Journey curve */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Trajectory</p>
          <h2 className="display-page mt-2">Your net worth over 60 months.</h2>
          <p className="lead-text mt-4">
            Where your wealth goes month by month under the current plan — with
            each milestone marked at the point it lands.
          </p>
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full"
          style={{ maxHeight: "380px" }}
        >
          <defs>
            <linearGradient id="journey-area" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity="0.32"
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity="0"
              />
            </linearGradient>
            <filter id="journey-glow" x="-10%" y="-20%" width="120%" height="140%">
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Baseline line */}
          <line
            x1={PAD_L}
            x2={PAD_L + PLOT_W}
            y1={PAD_T + PLOT_H}
            y2={PAD_T + PLOT_H}
            stroke="var(--color-border)"
            strokeWidth={1}
          />

          <path d={curveAreaPath} fill="url(#journey-area)" />
          <path
            d={curvePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#journey-glow)"
          />

          {/* Milestone pins */}
          {milestones.map((ev) => {
            const point = curve.find((p) => p.month === ev.month);
            if (!point) return null;
            const cx = xAt(ev.month);
            const cy = yAt(point.netWorth);
            return (
              <g key={`${ev.month}-${ev.label}`}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={cy}
                  y2={PAD_T + PLOT_H}
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.4}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="var(--color-accent)"
                  opacity={0.18}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={
                    ev.type === "debt"
                      ? "var(--color-warning)"
                      : "var(--color-accent)"
                  }
                  stroke="var(--color-page-bg)"
                  strokeWidth={1.5}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          <text
            x={xAt(0)}
            y={PAD_T + PLOT_H + 22}
            fontSize={11}
            fontWeight={600}
            fill="var(--color-text-primary)"
            style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            {formatMonthWithOffset(snapshot.period, 0)}
          </text>
          <text
            x={xAt(HORIZON)}
            y={PAD_T + PLOT_H + 22}
            textAnchor="end"
            fontSize={11}
            fontWeight={600}
            fill="var(--color-text-primary)"
            style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            {formatMonthWithOffset(snapshot.period, HORIZON)}
          </text>

          {/* Terminal callout */}
          <g>
            <line
              x1={xAt(HORIZON)}
              x2={xAt(HORIZON) + 14}
              y1={yAt(finalNetWorth)}
              y2={yAt(finalNetWorth)}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              opacity={0.6}
            />
            <g transform={`translate(${xAt(HORIZON) + 18}, ${yAt(finalNetWorth) - 14})`}>
              <text
                x={0}
                y={0}
                fontSize={10}
                fontWeight={600}
                fill="var(--color-text-muted)"
                style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                5Y
              </text>
              <text
                x={0}
                y={16}
                fontSize={16}
                fontWeight={700}
                fill="var(--color-ink)"
                style={{ letterSpacing: "-0.02em" }}
              >
                {formatCurrency(finalNetWorth, { compact: true })}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Milestone list */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">Milestones</p>
            <h2 className="display-page mt-2">Every flag on the map.</h2>
            <p className="lead-text mt-4">
              Chronological list of each moment along the path — debt clearing,
              goals reaching target, each with its projected landing date.
            </p>
          </div>
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Try a different stance <ArrowRight size={14} />
          </Link>
        </div>

        {milestones.length === 0 ? (
          <p
            className="body-editorial"
            style={{ color: "var(--color-text-muted)" }}
          >
            No milestones land in the next {HORIZON} months under the current
            plan. Try a different stance on the Scenarios page to surface
            nearer outcomes.
          </p>
        ) : (
          <div className="flex flex-col">
            {milestones.map((ev) => {
              const EvIcon = ev.icon;
              return (
                <div
                  key={`${ev.month}-${ev.label}`}
                  className="grid grid-cols-12 items-center gap-4 py-5"
                  style={{
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <div className="col-span-1">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          ev.type === "debt"
                            ? "var(--color-warning-light)"
                            : "var(--color-accent-light)",
                        color:
                          ev.type === "debt"
                            ? "var(--color-warning)"
                            : "var(--color-accent)",
                      }}
                    >
                      <EvIcon size={16} />
                    </span>
                  </div>
                  <div className="col-span-5">
                    <p
                      className="text-[16px] font-semibold tracking-tight"
                      style={{
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {ev.label}
                    </p>
                    <p
                      className="mt-0.5 text-[12px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {ev.description}
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p
                      className="label-meta"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Month {ev.month}
                    </p>
                    <p
                      className="mt-1 text-[14px] font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {ev.date}
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p
                      className="label-meta"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Net worth
                    </p>
                    <p
                      className="mt-1 text-[15px] font-semibold tabular-nums"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {formatCurrency(ev.value, { compact: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

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
