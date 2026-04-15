"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { Liability, LiabilityCategory } from "@/lib/types";

interface Props {
  baseNetWorth: number;
  investedAssets: number;
  currentMonthlySaving: number;
  debtExtra: number;
  liabilities: Liability[];
  annualReturn?: number;
  years?: number;
}

interface SeriesPoint {
  u: number;
  value: number;
}

interface PathEvent {
  u: number;
  label: string;
  monthAbs: number;
  category: LiabilityCategory;
}

interface ChartState {
  netWorth: SeriesPoint[];
  liabilities: SeriesPoint[];
  events: PathEvent[];
  nwMin: number;
  nwMax: number;
  liabMax: number;
  debtFreeU: number | null;
  years: number;
}

const RESOLUTION = 61;

// ── Simulation ──────────────────────────────────────────────────────
/**
 * Simulates two parallel streams over `months`:
 *   1. Net worth growing from compound returns + monthly saving,
 *      boosted by freed capacity as each debt clears (snowball order).
 *   2. Total liabilities remaining — shrinking as debts get paid down.
 * Events fire at each debt clearance.
 */
function simulate(
  base: number,
  baseSavingRate: number,
  investedAssets: number,
  annualReturn: number,
  months: number,
  liabilitiesRaw: Liability[],
  extraMonthly: number,
): {
  rawNW: { month: number; value: number }[];
  rawLiab: { month: number; value: number }[];
  events: PathEvent[];
  debtFreeMonth: number | null;
  initialLiab: number;
} {
  const monthlyReturn = annualReturn / 12;

  const debts = liabilitiesRaw
    .filter((l) => l.monthlyPayment > 0 && l.balance > 0)
    .map((l) => ({
      name: l.name,
      category: l.category,
      remaining: l.balance,
      payment: l.monthlyPayment,
      cleared: false,
    }))
    .sort((a, b) => a.remaining - b.remaining);

  const initialLiab = debts.reduce((s, d) => s + d.remaining, 0);

  let investments = investedAssets;
  const other = base - investedAssets;

  const rawNW: { month: number; value: number }[] = [
    { month: 0, value: base },
  ];
  const rawLiab: { month: number; value: number }[] = [
    { month: 0, value: initialLiab },
  ];
  const events: PathEvent[] = [];

  let savingRate = baseSavingRate;
  let extra = extraMonthly;
  let allCleared = debts.length === 0;
  let debtFreeMonth: number | null = null;

  for (let m = 1; m <= months; m++) {
    // Apply standard debt payments + snowball extra
    let snowball = extra;
    for (const d of debts) {
      if (d.cleared) continue;
      d.remaining -= d.payment;
      if (snowball > 0) {
        d.remaining -= snowball;
        snowball = 0;
      }
      if (d.remaining <= 0) {
        events.push({
          u: m / months,
          monthAbs: m,
          label: d.name,
          category: d.category,
        });
        snowball = -d.remaining;
        d.remaining = 0;
        d.cleared = true;
        savingRate += d.payment; // freed capacity joins savings
      }
    }

    if (!allCleared && debts.every((d) => d.cleared)) {
      allCleared = true;
      debtFreeMonth = m;
      if (extra > 0) {
        savingRate += extra;
        extra = 0;
      }
    }

    investments = investments * (1 + monthlyReturn) + savingRate;

    const remainingTotal = debts.reduce(
      (s, d) => s + Math.max(0, d.remaining),
      0,
    );

    // Organic wobble for the NW curve (±~0.4%)
    const wobble =
      1 + Math.sin(m * 0.55) * 0.003 + Math.sin(m * 1.9 + 0.7) * 0.0015;

    rawNW.push({ month: m, value: (other + investments) * wobble });
    rawLiab.push({ month: m, value: remainingTotal });
  }

  return { rawNW, rawLiab, events, debtFreeMonth, initialLiab };
}

/** Resample a dense raw series to RESOLUTION points, u∈[0,1]. */
function normalize(raw: { month: number; value: number }[]): SeriesPoint[] {
  const last = raw[raw.length - 1]!.month;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < RESOLUTION; i++) {
    const u = i / (RESOLUTION - 1);
    const targetMonth = u * last;
    const idx = Math.min(Math.floor(targetMonth), raw.length - 2);
    const frac = targetMonth - idx;
    const a = raw[idx]!.value;
    const b = raw[idx + 1]!.value;
    out.push({ u, value: a * (1 - frac) + b * frac });
  }
  return out;
}

// ── Tween hook ──────────────────────────────────────────────────────
function useTweenedState(target: ChartState, duration = 750): ChartState {
  const [display, setDisplay] = useState<ChartState>(target);
  const prevRef = useRef<ChartState>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (
      from.years === to.years &&
      from.netWorth === to.netWorth &&
      from.liabilities === to.liabilities
    ) {
      return;
    }

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / duration);
      const t = easeOutCubic(raw);

      const nwInterp: SeriesPoint[] = [];
      const liabInterp: SeriesPoint[] = [];
      for (let i = 0; i < RESOLUTION; i++) {
        const u = i / (RESOLUTION - 1);
        const fNW = from.netWorth[i]!.value;
        const tNW = to.netWorth[i]!.value;
        const fL = from.liabilities[i]!.value;
        const tL = to.liabilities[i]!.value;
        nwInterp.push({ u, value: fNW * (1 - t) + tNW * t });
        liabInterp.push({ u, value: fL * (1 - t) + tL * t });
      }

      setDisplay({
        netWorth: nwInterp,
        liabilities: liabInterp,
        events: raw > 0.55 ? to.events : from.events,
        nwMin: from.nwMin * (1 - t) + to.nwMin * t,
        nwMax: from.nwMax * (1 - t) + to.nwMax * t,
        liabMax: from.liabMax * (1 - t) + to.liabMax * t,
        debtFreeU:
          raw > 0.55 ? to.debtFreeU : from.debtFreeU,
        years: from.years * (1 - t) + to.years * t,
      });

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

// ── Icons (inline Lucide, viewBox 24×24) ────────────────────────────
const ICON_PATHS: Record<LiabilityCategory, React.ReactNode> = {
  credit_card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  loan: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
    </>
  ),
  mortgage: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  installment: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
};

// ── Geometry ────────────────────────────────────────────────────────
const VB_W = 920;
const VB_H = 440;
const PAD_T = 50;
const PAD_R = 150;
const PAD_B = 56;
const PAD_L = 28;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;

const UPPER_RATIO = 0.62;
const GAP_RATIO = 0.04;
const LOWER_RATIO = 0.34;

const UPPER_H = PLOT_H * UPPER_RATIO;
const GAP_H = PLOT_H * GAP_RATIO;
const LOWER_H = PLOT_H * LOWER_RATIO;

const WATERLINE_TOP = PAD_T + UPPER_H;
const WATERLINE_BOTTOM = WATERLINE_TOP + GAP_H;
const LOWER_BOTTOM = WATERLINE_BOTTOM + LOWER_H;

// ── Component ───────────────────────────────────────────────────────
export default function NetWorthProjectionChart({
  baseNetWorth,
  investedAssets,
  currentMonthlySaving,
  debtExtra,
  liabilities,
  annualReturn = 0.06,
  years = 5,
}: Props) {
  const target = useMemo<ChartState>(() => {
    const months = Math.max(1, Math.round(years * 12));
    const sim = simulate(
      baseNetWorth,
      currentMonthlySaving,
      investedAssets,
      annualReturn,
      months,
      liabilities,
      debtExtra,
    );

    const nwNormalized = normalize(sim.rawNW);
    const liabNormalized = normalize(sim.rawLiab);
    const events = sim.events.filter((e) => e.u <= 1).slice(0, 6);

    const nwValues = nwNormalized.map((p) => p.value);
    const rawMin = Math.min(...nwValues);
    const rawMax = Math.max(...nwValues);
    const pad = (rawMax - rawMin) * 0.1 || 1;
    const nwMin = rawMin - pad * 0.2;
    const nwMax = rawMax + pad * 0.5;

    const liabMax = Math.max(sim.initialLiab, 1);

    const debtFreeU =
      sim.debtFreeMonth !== null ? sim.debtFreeMonth / months : null;

    return {
      netWorth: nwNormalized,
      liabilities: liabNormalized,
      events,
      nwMin,
      nwMax,
      liabMax,
      debtFreeU,
      years,
    };
  }, [
    baseNetWorth,
    investedAssets,
    currentMonthlySaving,
    debtExtra,
    liabilities,
    annualReturn,
    years,
  ]);

  const display = useTweenedState(target);

  const xAt = (u: number) => PAD_L + u * PLOT_W;
  const yUpper = (value: number) => {
    const range = display.nwMax - display.nwMin || 1;
    return WATERLINE_TOP - ((value - display.nwMin) / range) * UPPER_H;
  };
  const yLower = (value: number) => {
    const range = display.liabMax || 1;
    return WATERLINE_BOTTOM + (value / range) * LOWER_H;
  };

  // Upper net worth curve path
  const nwCurve = display.netWorth
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xAt(p.u).toFixed(2)} ${yUpper(p.value).toFixed(2)}`,
    )
    .join(" ");

  // Upper area: curve on top, waterline on bottom
  const nwArea =
    display.netWorth
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${xAt(p.u).toFixed(2)} ${yUpper(p.value).toFixed(2)}`,
      )
      .join(" ") +
    ` L ${xAt(1).toFixed(2)} ${WATERLINE_TOP.toFixed(2)}` +
    ` L ${xAt(0).toFixed(2)} ${WATERLINE_TOP.toFixed(2)} Z`;

  // Lower liabilities curve path (starts bottom-left, rises to waterline as debts clear)
  const liabCurve = display.liabilities
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xAt(p.u).toFixed(2)} ${yLower(p.value).toFixed(2)}`,
    )
    .join(" ");

  // Lower area: bounded by waterline on top and the debt curve on bottom
  // (i.e. rust fill hangs down from waterline to the current debt amount)
  const liabArea =
    `M ${xAt(0).toFixed(2)} ${WATERLINE_BOTTOM.toFixed(2)}` +
    " " +
    display.liabilities
      .map(
        (p) =>
          `L ${xAt(p.u).toFixed(2)} ${yLower(p.value).toFixed(2)}`,
      )
      .join(" ") +
    ` L ${xAt(1).toFixed(2)} ${WATERLINE_BOTTOM.toFixed(2)} Z`;

  // Time axis
  const liveYears = Math.max(1, Math.round(display.years));
  const timeMarks = buildTimeMarks(liveYears);

  const finalNW = display.netWorth[RESOLUTION - 1]!.value;
  const startNW = display.netWorth[0]!.value;
  const nwGain = finalNW - startNW;

  // Event pin placements — sit near the waterline where the debt clears
  const eventPlacements = display.events.map((ev, i) => {
    const closest = display.liabilities.reduce((best, p) =>
      Math.abs(p.u - ev.u) < Math.abs(best.u - ev.u) ? p : best,
    );
    return {
      ...ev,
      x: xAt(ev.u),
      y: yLower(closest.value),
      below: i % 2 === 0,
      idx: i,
    };
  });

  // Debt-free marker position (if applicable)
  const debtFreeX =
    display.debtFreeU !== null && display.debtFreeU <= 1
      ? xAt(display.debtFreeU)
      : null;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-auto w-full"
      style={{ maxHeight: "500px" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Upper gradient — sage, dense at top, fading toward waterline */}
        <linearGradient id="nw-up-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-accent)"
            stopOpacity="0.38"
          />
          <stop
            offset="60%"
            stopColor="var(--color-accent)"
            stopOpacity="0.16"
          />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity="0.02"
          />
        </linearGradient>

        {/* Lower gradient — rust, dense at waterline, fading toward the deep */}
        <linearGradient id="nw-down-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-negative)"
            stopOpacity="0.30"
          />
          <stop
            offset="100%"
            stopColor="var(--color-negative)"
            stopOpacity="0.05"
          />
        </linearGradient>

        {/* Horizon fade — softens the right edge */}
        <linearGradient id="nw-horizon-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="82%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.35" />
        </linearGradient>
        <mask id="nw-horizon-mask">
          <rect
            x={PAD_L}
            y={PAD_T}
            width={PLOT_W}
            height={PLOT_H}
            fill="url(#nw-horizon-fade)"
          />
        </mask>

        {/* 3D icon chip — now red/rust toned for debt events */}
        <radialGradient id="chip-orb-rust" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#d29a91" />
          <stop offset="50%" stopColor="#a34e43" />
          <stop offset="100%" stopColor="#6a2920" />
        </radialGradient>

        {/* Soft curve glow */}
        <filter id="nw-glow" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Chip drop shadow */}
        <filter id="chip-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
          <feOffset dx="0" dy="2" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Waterline label — left side */}
      <g>
        <text
          x={PAD_L}
          y={WATERLINE_TOP - 14}
          fontSize={10}
          fontWeight={600}
          fill="var(--color-positive)"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Wealth growing
        </text>
        <text
          x={PAD_L}
          y={WATERLINE_BOTTOM + 16}
          fontSize={10}
          fontWeight={600}
          fill="var(--color-negative)"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Debt clearing
        </text>
      </g>

      {/* The waterline itself — a thin separator */}
      <line
        x1={PAD_L}
        x2={PAD_L + PLOT_W}
        y1={WATERLINE_TOP + GAP_H / 2}
        y2={WATERLINE_TOP + GAP_H / 2}
        stroke="var(--color-border)"
        strokeWidth={1}
        strokeDasharray="2 4"
      />

      {/* Everything masked for soft right fade */}
      <g mask="url(#nw-horizon-mask)">
        {/* Upper sage area */}
        <path d={nwArea} fill="url(#nw-up-fill)" />
        {/* Upper curve */}
        <path
          d={nwCurve}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#nw-glow)"
        />

        {/* Lower rust area */}
        <path d={liabArea} fill="url(#nw-down-fill)" />
        {/* Lower curve */}
        <path
          d={liabCurve}
          fill="none"
          stroke="var(--color-negative)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      </g>

      {/* Debt-free moment marker (if reached within horizon) */}
      {debtFreeX !== null && (
        <g>
          <line
            x1={debtFreeX}
            x2={debtFreeX}
            y1={PAD_T}
            y2={LOWER_BOTTOM}
            stroke="var(--color-positive)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.45}
          />
          <rect
            x={debtFreeX - 38}
            y={PAD_T - 6}
            width={76}
            height={18}
            rx={9}
            fill="var(--color-positive-light)"
            stroke="var(--color-positive)"
            strokeWidth={1}
          />
          <text
            x={debtFreeX}
            y={PAD_T + 6}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="var(--color-positive)"
            style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            DEBT FREE
          </text>
        </g>
      )}

      {/* Time axis */}
      {timeMarks.map((t) => {
        const x = xAt(t.u);
        return (
          <g key={`${t.u.toFixed(3)}-${t.label}`}>
            <line
              x1={x}
              x2={x}
              y1={LOWER_BOTTOM}
              y2={LOWER_BOTTOM + 6}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={x}
              y={LOWER_BOTTOM + 24}
              textAnchor="middle"
              fontSize={11}
              fontWeight={t.strong ? 600 : 400}
              fill={
                t.strong
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)"
              }
              className="select-none"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {t.label}
            </text>
          </g>
        );
      })}

      {/* Start anchor on the NW curve */}
      <g>
        <circle
          cx={xAt(0)}
          cy={yUpper(startNW)}
          r={9}
          fill="var(--color-ink)"
          opacity={0.12}
        />
        <circle
          cx={xAt(0)}
          cy={yUpper(startNW)}
          r={5}
          fill="var(--color-ink)"
          stroke="var(--color-page-bg)"
          strokeWidth={2}
        />
      </g>

      {/* Event pins — positioned on the lower debt curve */}
      {eventPlacements.map((ev) => {
        const chipRadius = 15;
        const offset = 26;
        const chipCY = ev.below ? ev.y + offset : ev.y + offset; // always below curve, in the rust area
        const iconPath = ICON_PATHS[ev.category] ?? ICON_PATHS.other;

        return (
          <g key={`${ev.monthAbs}-${ev.label}`}>
            {/* Inflection dot on the debt curve */}
            <circle
              cx={ev.x}
              cy={ev.y}
              r={5}
              fill="var(--color-negative)"
              opacity={0.2}
            />
            <circle
              cx={ev.x}
              cy={ev.y}
              r={3}
              fill="var(--color-negative)"
              stroke="var(--color-page-bg)"
              strokeWidth={1.5}
            />

            {/* Stem to icon chip */}
            <line
              x1={ev.x}
              x2={ev.x}
              y1={ev.y + 4}
              y2={chipCY - chipRadius + 2}
              stroke="var(--color-negative)"
              strokeWidth={1}
              opacity={0.5}
            />

            {/* 3D icon chip — rust toned */}
            <g filter="url(#chip-shadow)">
              <circle
                cx={ev.x}
                cy={chipCY}
                r={chipRadius}
                fill="url(#chip-orb-rust)"
              />
              <path
                d={`M ${ev.x - 9} ${chipCY - 6} A 11 9 0 0 1 ${ev.x + 9} ${chipCY - 7}`}
                fill="none"
                stroke="white"
                strokeOpacity={0.5}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
              <svg
                x={ev.x - 8}
                y={chipCY - 8}
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {iconPath}
              </svg>
            </g>
          </g>
        );
      })}

      {/* Terminal callout — net worth end state */}
      <g>
        {(() => {
          const x = xAt(1);
          const y = yUpper(finalNW);
          const labelYears = Math.round(display.years);
          return (
            <>
              <line
                x1={x}
                x2={x + 18}
                y1={y}
                y2={y}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                opacity={0.6}
              />
              <circle
                cx={x}
                cy={y}
                r={11}
                fill="var(--color-accent)"
                opacity={0.14}
              />
              <circle
                cx={x}
                cy={y}
                r={5.5}
                fill="var(--color-accent)"
                stroke="var(--color-page-bg)"
                strokeWidth={2}
              />
              <g transform={`translate(${x + 24}, ${y - 30})`}>
                <text
                  x={0}
                  y={0}
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--color-text-muted)"
                  className="select-none"
                  style={{
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  In {labelYears} {labelYears === 1 ? "year" : "years"}
                </text>
                <text
                  x={0}
                  y={22}
                  fontSize={21}
                  fontWeight={700}
                  fill="var(--color-ink)"
                  className="select-none"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {formatCurrency(finalNW, { compact: true })}
                </text>
                {nwGain > 0 && (
                  <text
                    x={0}
                    y={42}
                    fontSize={11}
                    fontWeight={500}
                    fill="var(--color-accent)"
                    className="select-none"
                  >
                    +{formatCurrency(nwGain, { compact: true })} gained
                  </text>
                )}
              </g>
            </>
          );
        })()}
      </g>
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildTimeMarks(years: number): {
  u: number;
  label: string;
  strong: boolean;
}[] {
  const marks: { u: number; label: string; strong: boolean }[] = [
    { u: 0, label: "Today", strong: true },
  ];

  if (years <= 1) {
    marks.push({ u: 0.25, label: "3 mo", strong: false });
    marks.push({ u: 0.5, label: "6 mo", strong: false });
    marks.push({ u: 0.75, label: "9 mo", strong: false });
  } else {
    const step = years > 6 ? 2 : 1;
    for (let y = step; y < years; y += step) {
      marks.push({
        u: y / years,
        label: y === 1 ? "1 yr" : `${y} yrs`,
        strong: false,
      });
    }
  }

  marks.push({
    u: 1,
    label: years === 1 ? "1 yr" : `${years} yrs`,
    strong: true,
  });

  return marks;
}
