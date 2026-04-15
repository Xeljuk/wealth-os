"use client";

import { useMemo, useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Mountain,
  Sunrise,
  Crown,
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

/* ── Zones — atmospheric regions of the journey ───────────────── */

interface Zone {
  id: string;
  label: string;
  tagline: string;
  monthStart: number;
  monthEnd: number;
  bg: string;
  accent: string;
  icon: ComponentType<{ size?: number }>;
}

const ZONES: Zone[] = [
  {
    id: "sprint",
    label: "Year 1 · The Sprint",
    tagline: "Clear what weighs you down",
    monthStart: 0,
    monthEnd: 12,
    bg: "#f3eee4", // warm vellum deep
    accent: "#b56a12", // warning / earthy amber
    icon: Sunrise,
  },
  {
    id: "climb",
    label: "Years 2–3 · The Climb",
    tagline: "Build momentum in every bucket",
    monthStart: 13,
    monthEnd: 36,
    bg: "#e8efeb", // cool sage wash
    accent: "#45645e", // sage accent
    icon: Mountain,
  },
  {
    id: "plateau",
    label: "Years 4–5 · The Plateau",
    tagline: "Compound quietly, reach the summit",
    monthStart: 37,
    monthEnd: 60,
    bg: "#dfe7e3", // deeper moss wash
    accent: "#2f4641", // moss
    icon: Crown,
  },
];

function zoneForMonth(month: number): Zone {
  return (
    ZONES.find((z) => month >= z.monthStart && month <= z.monthEnd) ?? ZONES[0]!
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
/* ── MinimapStrip — compact horizontal overview ──────────────── */

function MinimapStrip({
  nodes,
  currentIdx,
  onJump,
}: {
  nodes: JourneyNode[];
  currentIdx: number;
  onJump: (idx: number) => void;
}) {
  return (
    <div
      className="relative h-[78px] w-full overflow-visible rounded-2xl px-8 py-4"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Guide line across the middle — dashed hairline */}
      <div
        className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-border) 0 4px, transparent 4px 8px)",
        }}
      />

      {/* Zone band markers */}
      {ZONES.map((zone, zi) => {
        const startPct = (zone.monthStart / HORIZON) * 100;
        const widthPct = ((zone.monthEnd - zone.monthStart) / HORIZON) * 100;
        return (
          <div
            key={zone.id}
            className="absolute bottom-1 top-1 rounded-md"
            style={{
              left: `calc(32px + ${startPct}% * (100% - 64px) / 100)`,
              width: `calc(${widthPct}% * (100% - 64px) / 100)`,
              backgroundColor: zone.accent,
              opacity: 0.06,
              pointerEvents: "none",
              // Small offset for separation between bands
              marginLeft: zi === 0 ? 0 : 1,
            }}
          />
        );
      })}

      {/* Node dots */}
      {nodes.map((node, i) => {
        const leftPct = (node.month / HORIZON) * 100;
        const isCurrent = i === currentIdx;
        const isReached = i < currentIdx;

        // Kind → dot styling
        const kindMeta = getDotMeta(node.kind);
        const size = isCurrent ? 18 : kindMeta.size;
        const bg = isCurrent
          ? node.accent
          : kindMeta.filled
            ? isReached
              ? node.accent
              : node.accent + "88"
            : "var(--color-surface)";
        const border = kindMeta.border
          ? `${kindMeta.borderWidth} ${kindMeta.borderStyle} ${kindMeta.borderColor(node.accent)}`
          : "none";

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onJump(i)}
            className="absolute top-1/2 rounded-full transition-all duration-200 hover:scale-125"
            style={{
              left: `calc(32px + ${leftPct}% * (100% - 64px) / 100)`,
              width: `${size}px`,
              height: `${size}px`,
              transform: "translate(-50%, -50%)",
              backgroundColor: bg,
              border,
              boxShadow: isCurrent
                ? `0 0 0 5px ${node.accent}22, 0 4px 16px -4px ${node.accent}80`
                : "none",
              zIndex: isCurrent ? 20 : kindMeta.filled ? 10 : 5,
            }}
            title={`${node.label} · ${node.dateLabel}`}
            aria-label={`Jump to ${node.label}`}
          />
        );
      })}

      {/* "You are here" marker label */}
      {nodes[currentIdx] && (
        <div
          className="pointer-events-none absolute transition-all duration-300"
          style={{
            left: `calc(32px + ${(nodes[currentIdx].month / HORIZON) * 100}% * (100% - 64px) / 100)`,
            top: "calc(50% - 30px)",
            transform: "translateX(-50%)",
          }}
        >
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: nodes[currentIdx].accent,
              color: "#ffffff",
            }}
          >
            You
          </span>
        </div>
      )}
    </div>
  );
}

interface DotMeta {
  size: number;
  filled: boolean;
  border: boolean;
  borderWidth: string;
  borderStyle: "dashed" | "dotted" | "solid";
  borderColor: (accent: string) => string;
}

function getDotMeta(kind: NodeKind): DotMeta {
  switch (kind) {
    case "start":
    case "final":
      return {
        size: 13,
        filled: true,
        border: false,
        borderWidth: "0",
        borderStyle: "solid",
        borderColor: () => "",
      };
    case "milestone":
      return {
        size: 11,
        filled: true,
        border: false,
        borderWidth: "0",
        borderStyle: "solid",
        borderColor: () => "",
      };
    case "recommendation":
      return {
        size: 10,
        filled: false,
        border: true,
        borderWidth: "1.75px",
        borderStyle: "dashed",
        borderColor: (accent) => accent,
      };
    case "advisory":
      return {
        size: 10,
        filled: false,
        border: true,
        borderWidth: "1.75px",
        borderStyle: "dotted",
        borderColor: () => "var(--color-text-secondary)",
      };
    case "checkpoint":
    default:
      return {
        size: 8,
        filled: false,
        border: true,
        borderWidth: "1.5px",
        borderStyle: "dashed",
        borderColor: () => "var(--color-text-muted)",
      };
  }
}

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

  // ── Stepper state ───────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  // If node count changes (data update), clamp the index
  useEffect(() => {
    if (currentIdx >= nodes.length) setCurrentIdx(0);
  }, [nodes.length, currentIdx]);

  // Auto-play driver
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setCurrentIdx((i) => {
        if (i >= nodes.length - 1) {
          setAutoPlay(false);
          return i;
        }
        return i + 1;
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [autoPlay, nodes.length]);

  const currentNode = nodes[currentIdx] ?? nodes[0]!;
  const currentZone = zoneForMonth(currentNode.month);
  const ZoneIcon = currentZone.icon;
  const CurrentIcon = currentNode.icon;
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < nodes.length - 1;
  const goto = (idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(nodes.length - 1, idx)));
    setAutoPlay(false);
  };

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

      {/* ── Live stepper — one scene at a time ────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">The walk</p>
          <h2 className="display-page mt-2">One step at a time.</h2>
          <p className="lead-text mt-4">
            Step through each moment along the path. The background shifts as
            you move through the three zones of the five-year walk. Hit play
            to let the journey walk itself.
          </p>
        </div>

        {/* Scene card with zone-colored backdrop */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            backgroundColor: currentZone.bg,
            transition:
              "background-color 0.9s cubic-bezier(0.22, 0.61, 0.36, 1)",
            minHeight: "520px",
          }}
        >
          {/* Zone atmosphere — subtle dotted backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage: `radial-gradient(circle at 15% 20%, ${currentZone.accent}18 0%, transparent 35%), radial-gradient(circle at 85% 80%, ${currentZone.accent}14 0%, transparent 40%)`,
              transition: "background-image 0.9s ease-out",
            }}
          />

          {/* Header row — zone pill + chapter counter */}
          <div className="relative flex items-center justify-between px-9 pt-8">
            <div
              key={currentZone.id}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                backgroundColor: currentZone.accent + "24",
                color: currentZone.accent,
                transition: "all 0.6s ease-out",
              }}
            >
              <ZoneIcon size={13} />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                {currentZone.label}
              </span>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em] tabular-nums"
              style={{ color: "var(--color-text-muted)" }}
            >
              Chapter {String(currentIdx + 1).padStart(2, "0")} ·{" "}
              {String(nodes.length).padStart(2, "0")}
            </span>
          </div>

          {/* Scene content — remounts with key to trigger fade animation */}
          <div
            key={currentNode.id}
            className="journey-scene relative grid grid-cols-12 gap-8 px-9 pb-14 pt-8 lg:gap-12"
          >
            {/* Left: icon chip + date + kind */}
            <div className="col-span-12 flex flex-col items-center gap-5 lg:col-span-4 lg:items-start">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute rounded-full"
                  style={{
                    width: "140px",
                    height: "140px",
                    backgroundColor: currentNode.accent,
                    opacity: 0.14,
                    animation: "journeyHalo 3s ease-in-out infinite",
                  }}
                />
                <div
                  className="relative flex items-center justify-center rounded-3xl"
                  style={{
                    width: "112px",
                    height: "112px",
                    backgroundColor: currentNode.accent,
                    color: "#ffffff",
                    boxShadow: `0 20px 56px -14px ${currentNode.accent}66`,
                  }}
                >
                  <CurrentIcon size={44} />
                </div>
              </div>
              <div className="text-center lg:text-left">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {currentNode.dateLabel}
                </p>
                {currentNode.badge && (
                  <span
                    className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      backgroundColor:
                        currentNode.kind === "recommendation"
                          ? "var(--color-accent-light)"
                          : "var(--color-surface)",
                      color:
                        currentNode.kind === "recommendation"
                          ? "var(--color-accent)"
                          : "var(--color-text-secondary)",
                    }}
                  >
                    {currentNode.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Right: title + narrative + net worth */}
            <div className="col-span-12 lg:col-span-8">
              <h3
                className="font-bold tracking-tight"
                style={{
                  color: "var(--color-ink)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  fontSize: "clamp(2.2rem, 3.8vw, 3rem)",
                }}
              >
                {currentNode.label}
              </h3>
              <p
                className="mt-4 text-[16px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {currentNode.sublabel}
              </p>
              <p
                className="mt-6 text-[12px] italic"
                style={{ color: "var(--color-text-muted)" }}
              >
                {currentZone.tagline}
              </p>
              {currentNode.kind !== "checkpoint" &&
                currentNode.kind !== "advisory" &&
                currentNode.kind !== "recommendation" && (
                  <div className="mt-8 flex items-baseline gap-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Net worth at this moment
                    </span>
                    <span
                      className="font-bold tabular-nums"
                      style={{
                        color: currentNode.accent,
                        letterSpacing: "-0.02em",
                        fontSize: "32px",
                      }}
                    >
                      {formatCurrency(currentNode.netWorth, { compact: true })}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* Scene progress bar along the bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: "rgba(45,52,53,0.08)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${((currentIdx + 1) / nodes.length) * 100}%`,
                backgroundColor: currentZone.accent,
                transition: "width 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)",
              }}
            />
          </div>

          <style>{`
            @keyframes journeyHalo {
              0%, 100% { transform: scale(1); opacity: 0.14; }
              50% { transform: scale(1.08); opacity: 0.22; }
            }
            @keyframes journeyFade {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .journey-scene {
              animation: journeyFade 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
            }
          `}</style>
        </div>

        {/* Navigation bar */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => canPrev && goto(currentIdx - 1)}
            disabled={!canPrev}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all hover:opacity-80 disabled:opacity-30"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
              boxShadow: "0 2px 8px -4px rgba(45,52,53,0.1)",
            }}
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-all hover:opacity-90"
            style={{
              backgroundColor: autoPlay
                ? "var(--color-accent)"
                : "var(--color-surface)",
              color: autoPlay ? "#ffffff" : "var(--color-accent)",
              border: autoPlay
                ? "1px solid var(--color-accent)"
                : "1px solid var(--color-accent)",
              boxShadow: autoPlay
                ? "0 4px 16px -6px rgba(69,100,94,0.45)"
                : "none",
            }}
          >
            {autoPlay ? <Pause size={12} /> : <Play size={12} />}
            {autoPlay ? "Pause walk" : "Walk it"}
          </button>

          <button
            type="button"
            onClick={() => canNext && goto(currentIdx + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all hover:opacity-80 disabled:opacity-30"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
              boxShadow: "0 2px 8px -4px rgba(45,52,53,0.1)",
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Minimap strip */}
        <div className="mt-4">
          <MinimapStrip
            nodes={nodes}
            currentIdx={currentIdx}
            onJump={goto}
          />
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
