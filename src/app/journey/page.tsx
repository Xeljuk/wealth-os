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
  Flag,
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

type NodeKind = "start" | "milestone" | "checkpoint" | "final";

interface JourneyNode {
  id: string;
  month: number;
  label: string;
  sublabel: string;
  icon: ComponentType<{ size?: number }>;
  kind: NodeKind;
  netWorth: number;
  stepNumber: number;
  // For events — which category tinted the node
  accent: string;
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

    // Assemble unique month set: start + end + events + yearly checkpoints
    const monthSet = new Set<number>([0, HORIZON]);
    events.forEach((e) => monthSet.add(e.month));
    for (let y = 12; y < HORIZON; y += 12) monthSet.add(y);

    const sorted = [...monthSet].sort((a, b) => a - b);

    return sorted.map((month, idx): JourneyNode => {
      const event = events.find((e) => e.month === month);
      if (month === 0) {
        return {
          id: "start",
          month,
          label: "You are here",
          sublabel: formatMonth(snapshot.period),
          icon: MapPin,
          kind: "start",
          netWorth: netWorthAt[0]!,
          stepNumber: idx + 1,
          accent: "var(--color-ink)",
        };
      }
      if (month === HORIZON) {
        return {
          id: "final",
          month,
          label: "Five years ahead",
          sublabel: "Destination",
          icon: Trophy,
          kind: "final",
          netWorth: netWorthAt[HORIZON]!,
          stepNumber: idx + 1,
          accent: "var(--color-accent)",
        };
      }
      if (event) {
        return {
          id: `event-${month}`,
          month,
          label: event.label,
          sublabel: event.sublabel,
          icon: event.icon,
          kind: "milestone",
          netWorth: netWorthAt[month]!,
          stepNumber: idx + 1,
          accent: event.accent,
        };
      }
      return {
        id: `checkpoint-${month}`,
        month,
        label: `${month / 12} year${month / 12 > 1 ? "s" : ""} in`,
        sublabel: "Checkpoint",
        icon: Circle,
        kind: "checkpoint",
        netWorth: netWorthAt[month]!,
        stepNumber: idx + 1,
        accent: "var(--color-text-muted)",
      };
    });
  }, [snapshot, bs, cf, goalTrajectories, activePlan]);

  // ── Path geometry ───────────────────────────────────────────
  const NODE_SPACING = 200; // px between nodes vertically
  const TOP_PAD = 60;
  const BOTTOM_PAD = 100;
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
                  <p
                    className="text-[15px] font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {node.label}
                  </p>
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

  // Sizing
  const circleSize = isStart || isFinal ? 128 : isMilestone ? 104 : 76;
  const iconSize = isStart || isFinal ? 32 : isMilestone ? 24 : 18;
  const haloSize = circleSize + 32;

  const circleBg = isCheckpoint ? "var(--color-surface)" : node.accent;
  const iconColor = isCheckpoint ? node.accent : "#ffffff";
  const borderStyle = isCheckpoint
    ? `2px dashed ${node.accent}`
    : "none";

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ transform: "translateX(-50%)" }}
    >
      {/* "You are here" tag only on start */}
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

      {/* Circle node */}
      <div className="relative flex items-center justify-center">
        {/* Outer halo */}
        {(isStart || isFinal || isMilestone) && (
          <div
            className="absolute rounded-full journey-pulse"
            style={{
              width: `${haloSize}px`,
              height: `${haloSize}px`,
              backgroundColor: node.accent,
              opacity: 0.2,
            }}
          />
        )}
        {/* Main circle */}
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
        {/* Step number badge */}
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
        className="flex w-[200px] flex-col items-center text-center"
        style={{ marginTop: "4px" }}
      >
        <p
          className="text-[14px] font-bold leading-tight"
          style={{
            color: isCheckpoint
              ? "var(--color-text-muted)"
              : "var(--color-text-primary)",
            letterSpacing: "-0.015em",
          }}
        >
          {node.label}
        </p>
        <p
          className="mt-0.5 text-[10px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {node.sublabel}
        </p>
        {!isCheckpoint && (
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
