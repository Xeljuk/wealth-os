"use client";

import { formatCurrency } from "@/lib/format";

interface Props {
  totalInflow: number;
  totalFixed: number;
  totalVariable: number;
  totalDebtService: number;
  safetyBuffer: number;
  allocatable: number;
  currencySymbol?: string;
}

interface Stage {
  label: string;
  value: number;     // running total AT THIS POINT (the top of this segment)
  deduction: number; // how much was removed from the PREVIOUS stage to reach this one
  dedLabel: string;
  accent?: boolean;
}

// ── Geometry ────────────────────────────────────────────────────────
const VB_W = 960;
const VB_H = 400;
const PAD_T = 80;
const PAD_B = 96;
const PAD_L = 40;
const PAD_R = 40;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;
const BASELINE = PAD_T + PLOT_H;

export default function CashFlowWaterfall({
  totalInflow,
  totalFixed,
  totalVariable,
  totalDebtService,
  safetyBuffer,
  allocatable,
  currencySymbol = "₺",
}: Props) {
  // Stages are the TOP of each flat segment, in order left → right.
  const stages: Stage[] = [
    {
      label: "Inflow",
      value: totalInflow,
      deduction: 0,
      dedLabel: "",
    },
    {
      label: "After fixed",
      value: totalInflow - totalFixed,
      deduction: totalFixed,
      dedLabel: "Fixed",
    },
    {
      label: "After variable",
      value: totalInflow - totalFixed - totalVariable,
      deduction: totalVariable,
      dedLabel: "Variable",
    },
    {
      label: "Surplus",
      value: totalInflow - totalFixed - totalVariable - totalDebtService,
      deduction: totalDebtService,
      dedLabel: "Debt service",
    },
    {
      label: "Allocatable",
      value: allocatable,
      deduction: safetyBuffer,
      dedLabel: "Safety buffer",
      accent: true,
    },
  ];

  const segW = PLOT_W / stages.length; // each flat segment's width
  const maxVal = Math.max(totalInflow, 1);

  const yFor = (value: number) => {
    // top of the ribbon for a given running-total value
    return BASELINE - (value / maxVal) * PLOT_H;
  };

  // Build the ribbon path — flat segments joined by vertical drops
  let ribbonPath = `M ${PAD_L} ${BASELINE} `;
  for (let i = 0; i < stages.length; i++) {
    const x0 = PAD_L + i * segW;
    const x1 = x0 + segW;
    const topY = yFor(stages[i]!.value);
    if (i === 0) {
      // rise from baseline to first stage top
      ribbonPath += `L ${x0} ${topY} `;
    }
    ribbonPath += `L ${x1} ${topY} `;
    // If there's a next stage, vertical drop to its top level
    if (i < stages.length - 1) {
      const nextTop = yFor(stages[i + 1]!.value);
      ribbonPath += `L ${x1} ${nextTop} `;
    }
  }
  // Close back along the baseline
  ribbonPath += `L ${PAD_L + PLOT_W} ${BASELINE} Z`;

  // Separate stroke path just for the TOP (contour) of the ribbon — no baseline
  let topStroke = "";
  for (let i = 0; i < stages.length; i++) {
    const x0 = PAD_L + i * segW;
    const x1 = x0 + segW;
    const topY = yFor(stages[i]!.value);
    if (i === 0) {
      topStroke += `M ${x0} ${topY} `;
    }
    topStroke += `L ${x1} ${topY} `;
    if (i < stages.length - 1) {
      const nextTop = yFor(stages[i + 1]!.value);
      topStroke += `L ${x1} ${nextTop} `;
    }
  }

  // Accent overlay for the allocatable (final) segment only
  const lastIdx = stages.length - 1;
  const lastX0 = PAD_L + lastIdx * segW;
  const lastX1 = lastX0 + segW;
  const lastTop = yFor(stages[lastIdx]!.value);
  const accentArea = `M ${lastX0} ${BASELINE} L ${lastX0} ${lastTop} L ${lastX1} ${lastTop} L ${lastX1} ${BASELINE} Z`;

  // Drop annotations — the red "−X" labels at each drop point
  const drops = stages.slice(1).map((s, idx) => {
    const prevIdx = idx; // 0..3
    const x = PAD_L + (prevIdx + 1) * segW;
    const prevTop = yFor(stages[prevIdx]!.value);
    const thisTop = yFor(s.value);
    const midY = (prevTop + thisTop) / 2;
    return {
      label: s.dedLabel,
      value: s.deduction,
      x,
      y: midY,
      prevTop,
      thisTop,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-auto w-full"
      style={{ maxHeight: "460px" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Main ribbon gradient — sage dense on top, fading to light at baseline */}
        <linearGradient id="cf-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.38" />
          <stop offset="55%" stopColor="var(--color-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.03" />
        </linearGradient>

        {/* Allocatable accent — stronger sage for the final chunk */}
        <linearGradient id="cf-accent-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.62" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.22" />
        </linearGradient>

        {/* Soft glow under contour */}
        <filter id="cf-glow" x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Left-to-right reveal animation */}
        <style>{`
          @keyframes cfReveal {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes cfFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .cf-ribbon-reveal {
            transform-origin: ${PAD_L}px ${BASELINE}px;
            animation: cfReveal 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 0.1s backwards;
          }
          .cf-label { opacity: 0; animation: cfFade 0.5s ease-out forwards; }
          .cf-drop  { opacity: 0; animation: cfFade 0.6s ease-out forwards; }
          .cf-l-0 { animation-delay: 0.4s; }
          .cf-l-1 { animation-delay: 0.55s; }
          .cf-l-2 { animation-delay: 0.7s; }
          .cf-l-3 { animation-delay: 0.85s; }
          .cf-l-4 { animation-delay: 1.0s; }
          .cf-d-0 { animation-delay: 0.65s; }
          .cf-d-1 { animation-delay: 0.8s; }
          .cf-d-2 { animation-delay: 0.95s; }
          .cf-d-3 { animation-delay: 1.1s; }
        `}</style>
      </defs>

      {/* Baseline line */}
      <line
        x1={PAD_L}
        x2={PAD_L + PLOT_W}
        y1={BASELINE}
        y2={BASELINE}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Main ribbon fill */}
      <g className="cf-ribbon-reveal">
        <path d={ribbonPath} fill="url(#cf-ribbon)" />
        <path d={accentArea} fill="url(#cf-accent-fill)" />
        <path
          d={topStroke}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#cf-glow)"
        />
      </g>

      {/* Stage labels above each segment top */}
      {stages.map((stage, i) => {
        const x = PAD_L + i * segW + segW / 2;
        const topY = yFor(stage.value);
        // Eyebrow text just above segment top
        const labelY = topY - 18;
        return (
          <g key={stage.label} className={`cf-label cf-l-${i}`}>
            {/* Small tick connecting label to ribbon */}
            <line
              x1={x}
              x2={x}
              y1={topY - 4}
              y2={topY - 12}
              stroke={
                stage.accent
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)"
              }
              strokeWidth={1}
              opacity={0.55}
            />
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill={
                stage.accent
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)"
              }
              style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {stage.label}
            </text>
            <text
              x={x}
              y={labelY - 14}
              textAnchor="middle"
              fontSize={stage.accent ? 18 : 14}
              fontWeight={stage.accent ? 700 : 600}
              fill={
                stage.accent
                  ? "var(--color-ink)"
                  : "var(--color-text-primary)"
              }
              style={{ letterSpacing: "-0.015em" }}
            >
              {formatCurrency(stage.value, { compact: true })}
            </text>
          </g>
        );
      })}

      {/* Drop deduction labels — placed just below baseline at the drop x */}
      {drops.map((d, i) => (
        <g key={`${d.label}-${i}`} className={`cf-drop cf-d-${i}`}>
          {/* Short tick mark below baseline */}
          <line
            x1={d.x}
            x2={d.x}
            y1={BASELINE + 4}
            y2={BASELINE + 14}
            stroke="var(--color-negative)"
            strokeWidth={1}
            opacity={0.7}
          />
          <text
            x={d.x}
            y={BASELINE + 28}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="var(--color-negative)"
            style={{ letterSpacing: "-0.01em" }}
          >
            −{formatCurrency(d.value, { compact: true })}
          </text>
          <text
            x={d.x}
            y={BASELINE + 44}
            textAnchor="middle"
            fontSize={9}
            fontWeight={500}
            fill="var(--color-text-muted)"
            style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            {d.label}
          </text>
        </g>
      ))}

      {/* Final amount pennant — points at the end of allocatable segment */}
      {(() => {
        const x = PAD_L + PLOT_W;
        const y = yFor(allocatable);
        return (
          <g className="cf-label cf-l-4">
            <circle
              cx={x}
              cy={y}
              r={8}
              fill="var(--color-accent)"
              opacity={0.18}
            />
            <circle
              cx={x}
              cy={y}
              r={4}
              fill="var(--color-accent)"
              stroke="var(--color-page-bg)"
              strokeWidth={1.5}
            />
          </g>
        );
      })()}
    </svg>
  );
}

// Keep the currency symbol prop typed (reserved for future inline symbol support)
export type { Props as CashFlowWaterfallProps };
