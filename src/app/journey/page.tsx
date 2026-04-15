"use client";

import { useMemo } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import {
  formatCurrency,
  formatMonth,
  formatMonthWithOffset,
} from "@/lib/format";
import {
  Trophy,
  Flame,
  Target,
  Shield,
  Home,
  Wallet,
  TrendingUp,
  Star,
  Circle,
  ArrowRight,
  MapPin,
  PiggyBank,
  LineChart,
  Scale,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

/* ── Config ───────────────────────────────────────────────────── */

const GOAL_TYPE_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  emergency_fund: Shield,
  down_payment: Home,
  car_purchase: Wallet,
  portfolio_growth: TrendingUp,
  debt_reduction: Star,
  custom: Target,
};

type NodeKind =
  | "start"
  | "milestone"
  | "checkpoint"
  | "recommendation"
  | "advisory"
  | "final";

interface JourneyNode {
  id: string;
  month: number;
  label: string;
  sublabel: string;
  dateLabel: string; // "Month 4 · Aug 2026" style
  icon: ComponentType<{ size?: number }>;
  kind: NodeKind;
  netWorth: number;
  stepNumber: number;
  accent: string;
  badge?: string; // "Recommended" / "Advisory" pill
}

const HORIZON = 60;

/* ── Page ─────────────────────────────────────────────────────── */

export default function JourneyPage() {
  const { snapshot, goalTrajectories, activePlan, alphaStatus } = useWealth();
  const { balanceSheet: bs, cashFlow: cf } = snapshot;

  const nodes = useMemo<JourneyNode[]>(() => {
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

    const netWorthAt: number[] = [bs.netWorth];
    const events: {
      month: number;
      label: string;
      sublabel: string;
      icon: ComponentType<{ size?: number }>;
      accent: string;
    }[] = [];

    for (let m = 1; m <= HORIZON; m++) {
      investments =
        investments * (1 + monthlyReturn) +
        (activePlan?.investmentContribution ?? 0);

      if (!debtCleared) {
        debt = Math.max(0, debt - debtPayment);
        if (debt === 0) {
          debtCleared = true;
          events.push({
            month: m,
            label: "Debt cleared",
            sublabel: "A weight lifted — freed capacity flows to goals",
            icon: Flame,
            accent: "var(--color-warning)",
          });
        }
      }

      for (const g of goalState) {
        if (g.completed) continue;
        g.current = Math.min(g.current + g.allocation, g.targetAmount);
        if (g.current >= g.targetAmount) {
          g.completed = true;
          events.push({
            month: m,
            label: g.name,
            sublabel: `Goal reached — ${formatCurrency(g.targetAmount, { compact: true })} secured`,
            icon: GOAL_TYPE_ICONS[g.type] ?? Target,
            accent: "var(--color-accent)",
          });
        }
      }

      netWorthAt.push(otherAssets + investments - debt);
    }

    // ── Recommendations (heuristics on current snapshot) ──────
    const recommendations: {
      month: number;
      label: string;
      sublabel: string;
      icon: ComponentType<{ size?: number }>;
    }[] = [];

    const monthlyObligations =
      cf.totalFixed + cf.totalVariable + cf.totalDebtService;
    const coverageMonths =
      monthlyObligations > 0 ? bs.liquidAssets / monthlyObligations : 99;
    const totalAssets = bs.assets.reduce((s, a) => s + a.value, 0);
    const productivePct =
      totalAssets > 0 ? (bs.investedAssets / totalAssets) * 100 : 0;
    const debtRatio =
      cf.totalInflow > 0
        ? (cf.totalDebtService / cf.totalInflow) * 100
        : 0;
    const hasEmergencyGoal = goalTrajectories.some(
      (g) => g.type === "emergency_fund",
    );
    const hasGrowthGoal = goalTrajectories.some(
      (g) => g.type === "portfolio_growth",
    );
    const hasDebtGoal = goalTrajectories.some(
      (g) => g.type === "debt_reduction",
    );

    if (coverageMonths < 3 && !hasEmergencyGoal) {
      recommendations.push({
        month: 6,
        label: "Start an emergency fund",
        sublabel: `Liquid reserves cover only ${coverageMonths.toFixed(1)} months. Aim for 3.`,
        icon: PiggyBank,
      });
    }
    if (productivePct < 20 && !hasGrowthGoal) {
      recommendations.push({
        month: 12,
        label: "Grow productive capital",
        sublabel: `Only ${Math.round(productivePct)}% of wealth is invested — add a growth goal.`,
        icon: LineChart,
      });
    }
    if (debtRatio > 15 && !hasDebtGoal) {
      recommendations.push({
        month: 3,
        label: "Debt avalanche",
        sublabel: `Debt service is ${debtRatio.toFixed(1)}% of inflow — prioritise payoff.`,
        icon: Scale,
      });
    }

    // ── Advisory external event ───────────────────────────────
    // Placed mid-journey as a neutral "take stock" moment
    const advisoryEvents: {
      month: number;
      label: string;
      sublabel: string;
      icon: ComponentType<{ size?: number }>;
    }[] = [
      {
        month: 24,
        label: "Mid-journey review",
        sublabel:
          "Reassess your stance: has your income, life, or appetite for risk shifted?",
        icon: CalendarClock,
      },
    ];

    // ── Assemble unique month → node list ─────────────────────
    // Preferred kind per month: start/final > milestone > recommendation > advisory > checkpoint
    type PreNode = {
      month: number;
      kind: NodeKind;
      label: string;
      sublabel: string;
      icon: ComponentType<{ size?: number }>;
      accent: string;
      badge?: string;
    };
    const preNodes = new Map<number, PreNode>();

    preNodes.set(0, {
      month: 0,
      kind: "start",
      label: "You are here",
      sublabel: "The starting point",
      icon: MapPin,
      accent: "var(--color-ink)",
    });
    preNodes.set(HORIZON, {
      month: HORIZON,
      kind: "final",
      label: "Five years ahead",
      sublabel: "Destination",
      icon: Trophy,
      accent: "var(--color-accent)",
    });

    for (const e of events) {
      preNodes.set(e.month, {
        month: e.month,
        kind: "milestone",
        label: e.label,
        sublabel: e.sublabel,
        icon: e.icon,
        accent: e.accent,
      });
    }
    for (const r of recommendations) {
      if (!preNodes.has(r.month)) {
        preNodes.set(r.month, {
          month: r.month,
          kind: "recommendation",
          label: r.label,
          sublabel: r.sublabel,
          icon: r.icon,
          accent: "var(--color-accent)",
          badge: "Recommended",
        });
      }
    }
    for (const a of advisoryEvents) {
      if (!preNodes.has(a.month)) {
        preNodes.set(a.month, {
          month: a.month,
          kind: "advisory",
          label: a.label,
          sublabel: a.sublabel,
          icon: a.icon,
          accent: "var(--color-text-secondary)",
          badge: "Advisory",
        });
      }
    }
    // Yearly checkpoints — only if that month isn't already claimed
    for (let y = 12; y < HORIZON; y += 12) {
      if (!preNodes.has(y)) {
        preNodes.set(y, {
          month: y,
          kind: "checkpoint",
          label: `${y / 12} year${y / 12 > 1 ? "s" : ""} in`,
          sublabel: "Checkpoint",
          icon: Circle,
          accent: "var(--color-text-muted)",
        });
      }
    }

    const sorted = [...preNodes.values()].sort((a, b) => a.month - b.month);

    return sorted.map((pre, idx): JourneyNode => {
      const dateLabel =
        pre.month === 0
          ? `Month 0 · ${formatMonth(snapshot.period)}`
          : `Month ${pre.month} · ${formatMonthWithOffset(snapshot.period, pre.month)}`;

      return {
        id: `${pre.kind}-${pre.month}`,
        month: pre.month,
        label: pre.label,
        sublabel: pre.sublabel,
        dateLabel,
        icon: pre.icon,
        kind: pre.kind,
        netWorth: netWorthAt[pre.month]!,
        stepNumber: idx + 1,
        accent: pre.accent,
        badge: pre.badge,
      };
    });
  }, [snapshot, bs, cf, goalTrajectories, activePlan]);

  // ── Path geometry ───────────────────────────────────────────
  const NODE_SPACING = 230; // px between nodes vertically (extra room for dates + badges)
  const TOP_PAD = 80;
  const BOTTOM_PAD = 120;
  const containerHeight =
    TOP_PAD + (nodes.length - 1) * NODE_SPACING + BOTTOM_PAD;

  // SVG viewBox coordinates (x: 0-1000, y: 0-containerHeight)
  const VB_W = 1000;
  const X_LEFT = 250;
  const X_RIGHT = 750;

  const nodePos = (i: number) => ({
    x: i % 2 === 0 ? X_LEFT : X_RIGHT,
    y: TOP_PAD + i * NODE_SPACING,
  });

  // Build connecting path with smooth cubic bezier S-curves
  let pathD = "";
  for (let i = 0; i < nodes.length; i++) {
    const { x, y } = nodePos(i);
    if (i === 0) {
      pathD += `M ${x} ${y} `;
    } else {
      const prev = nodePos(i - 1);
      const midY = (prev.y + y) / 2;
      pathD += `C ${prev.x} ${midY}, ${x} ${midY}, ${x} ${y} `;
    }
  }

  const finalNetWorth = nodes[nodes.length - 1]?.netWorth ?? bs.netWorth;
  const startNetWorth = nodes[0]?.netWorth ?? bs.netWorth;
  const gain = finalNetWorth - startNetWorth;

  const milestoneCount = nodes.filter((n) => n.kind === "milestone").length;

  return (
    <PageShell
      eyebrow={`Journey · ${formatMonth(snapshot.period)}`}
      title="Your five-year walk."
      subtitle="The path ahead, laid out one step at a time. Every node is a moment your plan carries you toward — a debt clearing, a goal reached, a checkpoint along the way."
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
            for a personalized path.
          </p>
        </div>
      )}

      {/* Hero strip — journey stats */}
      <div className="grid grid-cols-12 items-end gap-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="label-meta">Destination</p>
          <p className="display-hero mt-3">
            {formatCurrency(finalNetWorth, { compact: true })}
          </p>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Projected net worth 60 months from now —{" "}
            {gain > 0 && (
              <span
                className="font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                +{formatCurrency(gain, { compact: true })} from today
              </span>
            )}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div
            className="flex flex-col gap-5 border-l pl-6"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <MiniStat
              label="Steps on the path"
              value={String(nodes.length)}
            />
            <MiniStat
              label="Milestones ahead"
              value={String(milestoneCount)}
              accent
            />
            <MiniStat
              label="Horizon"
              value={`${HORIZON} months`}
            />
          </div>
        </div>
      </div>

      {/* ── The journey path ──────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 max-w-2xl">
          <p className="label-meta">The path</p>
          <h2 className="display-page mt-2">Walk it step by step.</h2>
          <p className="lead-text mt-4">
            Read top to bottom. Each node is a checkpoint your plan will hit
            under the current stance — the path meanders between them so you
            can feel the distance covered.
          </p>
        </div>

        {/* Path container */}
        <div className="mx-auto w-full max-w-[920px]">
          <div
            className="relative"
            style={{ height: `${containerHeight}px` }}
          >
            {/* SVG layer for the connecting curves */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${VB_W} ${containerHeight}`}
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <linearGradient
                  id="journey-path-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-ink)"
                    stopOpacity="0.6"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0.8"
                  />
                </linearGradient>
                <style>{`
                  @keyframes journeyDraw {
                    from { stroke-dashoffset: 3000; }
                    to { stroke-dashoffset: 0; }
                  }
                  .journey-path {
                    stroke-dasharray: 6 10;
                    animation: journeyDraw 2s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s backwards;
                  }
                  @keyframes journeyNode {
                    from { opacity: 0; transform: translate(-50%, 10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                  }
                  .journey-node {
                    opacity: 0;
                    animation: journeyNode 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                  }
                  @keyframes journeyPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.15); opacity: 0.2; }
                  }
                  .journey-pulse {
                    animation: journeyPulse 2.8s ease-in-out infinite;
                    transform-origin: center;
                  }
                `}</style>
              </defs>
              <path
                d={pathD}
                fill="none"
                stroke="url(#journey-path-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="journey-path"
              />
            </svg>

            {/* HTML node layer */}
            {nodes.map((node, i) => {
              const pos = nodePos(i);
              const leftPct = (pos.x / VB_W) * 100;
              const topPx = pos.y;
              const delay = 0.4 + i * 0.12;

              return (
                <div
                  key={node.id}
                  className="journey-node absolute"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPx}px`,
                    animationDelay: `${delay}s`,
                  }}
                >
                  <NodeCard node={node} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Milestone list — chronological table ──────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="max-w-2xl">
            <p className="label-meta">All checkpoints</p>
            <h2 className="display-page mt-2">
              Every node, in the order you&apos;ll reach them.
            </h2>
          </div>
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: "var(--color-accent)" }}
          >
            Try a different stance <ArrowRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col">
          {nodes.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={`list-${node.id}`}
                className="grid grid-cols-12 items-center gap-4 py-5"
                style={{ borderBottom: "1px solid var(--color-border-light)" }}
              >
                <div className="col-span-1 text-center">
                  <span
                    className="inline-block text-[11px] font-bold tabular-nums"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {String(node.stepNumber).padStart(2, "0")}
                  </span>
                </div>
                <div className="col-span-1">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor:
                        node.kind === "milestone" || node.kind === "start" || node.kind === "final"
                          ? node.accent + "22"
                          : "var(--color-surface-low)",
                      color: node.accent,
                    }}
                  >
                    <Icon size={16} />
                  </span>
                </div>
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-[15px] font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {node.label}
                    </p>
                    {node.badge && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                        style={{
                          backgroundColor:
                            node.kind === "recommendation"
                              ? "var(--color-accent-light)"
                              : "var(--color-surface-low)",
                          color:
                            node.kind === "recommendation"
                              ? "var(--color-accent)"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {node.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-0.5 text-[12px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {node.sublabel}
                  </p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="label-meta">Month</p>
                  <p
                    className="mt-1 text-[13px] font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {node.month === 0
                      ? "Now"
                      : formatMonthWithOffset(snapshot.period, node.month)}
                  </p>
                </div>
                <div className="col-span-3 text-right">
                  <p className="label-meta">Net worth</p>
                  <p
                    className="mt-1 text-[14px] font-semibold tabular-nums"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {formatCurrency(node.netWorth, { compact: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

/* ── NodeCard ─────────────────────────────────────────────────── */

function NodeCard({ node }: { node: JourneyNode }) {
  const Icon = node.icon;
  const isStart = node.kind === "start";
  const isFinal = node.kind === "final";
  const isMilestone = node.kind === "milestone";
  const isCheckpoint = node.kind === "checkpoint";
  const isRecommendation = node.kind === "recommendation";
  const isAdvisory = node.kind === "advisory";

  // Sizing
  const circleSize =
    isStart || isFinal
      ? 128
      : isMilestone
        ? 104
        : isRecommendation || isAdvisory
          ? 84
          : 76;
  const iconSize =
    isStart || isFinal ? 32 : isMilestone ? 24 : isRecommendation || isAdvisory ? 20 : 18;
  const haloSize = circleSize + 32;

  // Solid vs outlined presentation
  const isFilled = isStart || isFinal || isMilestone;
  const circleBg = isFilled ? node.accent : "var(--color-surface)";
  const iconColor = isFilled ? "#ffffff" : node.accent;
  const borderStyle = isCheckpoint
    ? `2px dashed ${node.accent}`
    : isRecommendation
      ? `2px dashed var(--color-accent)`
      : isAdvisory
        ? `2px dotted var(--color-text-secondary)`
        : "none";

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ transform: "translateX(-50%)" }}
    >
      {/* Top flag — "You are here" for start, badges for others */}
      {isStart && (
        <div
          className="mb-1 flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "#ffffff",
          }}
        >
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: "#ffffff" }}
          />
          <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
            You are here
          </span>
        </div>
      )}
      {node.badge && !isStart && (
        <div
          className="mb-1 rounded-full px-2.5 py-0.5"
          style={{
            backgroundColor: isRecommendation
              ? "var(--color-accent-light)"
              : "var(--color-surface-low)",
            color: isRecommendation
              ? "var(--color-accent)"
              : "var(--color-text-secondary)",
          }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
            {node.badge}
          </span>
        </div>
      )}

      {/* Circle node */}
      <div className="relative flex items-center justify-center">
        {(isStart || isFinal || isMilestone) && (
          <div
            className="journey-pulse absolute rounded-full"
            style={{
              width: `${haloSize}px`,
              height: `${haloSize}px`,
              backgroundColor: node.accent,
              opacity: 0.2,
            }}
          />
        )}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            backgroundColor: circleBg,
            border: borderStyle,
            boxShadow:
              isStart || isFinal
                ? `0 12px 40px -10px ${node.accent}88`
                : isMilestone
                  ? `0 8px 24px -8px ${node.accent}55`
                  : "none",
            color: iconColor,
          }}
        >
          <Icon size={iconSize} />
        </div>
        {/* Step badge */}
        <div
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
          style={{
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text-primary)",
            boxShadow: "0 2px 8px -2px rgba(45,52,53,0.2)",
            border: `1.5px solid ${node.accent}`,
          }}
        >
          {String(node.stepNumber).padStart(2, "0")}
        </div>
      </div>

      {/* Label block */}
      <div
        className="flex w-[210px] flex-col items-center text-center"
        style={{ marginTop: "4px" }}
      >
        {/* Date line — always visible */}
        <p
          className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {node.dateLabel}
        </p>
        <p
          className="mt-1.5 text-[14px] font-bold leading-tight"
          style={{
            color:
              isCheckpoint || isAdvisory
                ? "var(--color-text-secondary)"
                : "var(--color-text-primary)",
            letterSpacing: "-0.015em",
          }}
        >
          {node.label}
        </p>
        <p
          className="mt-1 text-[10px] leading-snug"
          style={{ color: "var(--color-text-muted)" }}
        >
          {node.sublabel}
        </p>
        {!isCheckpoint && !isAdvisory && !isRecommendation && (
          <div
            className="mt-2 rounded-md px-2.5 py-1"
            style={{
              backgroundColor: "var(--color-surface)",
              border: `1px solid ${node.accent}33`,
            }}
          >
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: node.accent }}
            >
              {formatCurrency(node.netWorth, { compact: true })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function MiniStat({
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
