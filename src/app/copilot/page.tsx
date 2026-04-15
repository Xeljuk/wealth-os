"use client";

import { useState, useRef, Fragment } from "react";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { formatCurrency, formatMonth } from "@/lib/format";
import type { PlanStance } from "@/lib/types";
import Link from "next/link";
import {
  Target,
  Scale,
  Shield,
  TrendingUp,
  BarChart3,
  ArrowRightLeft,
  Landmark,
  GitBranch,
  AlertTriangle,
  Info,
  Send,
  Loader2,
} from "lucide-react";
import type { ComponentType } from "react";

/* ── Stance-independent config ────────────────────────────────── */

const STANCE_LABEL: Record<PlanStance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

/* ── Preset questions (buttons) ───────────────────────────────── */

interface PresetQuestion {
  id: string;
  question: string;
  Icon: ComponentType<{ size?: number }>;
}

const PRESETS: PresetQuestion[] = [
  {
    id: "property",
    question: "What is the most realistic timeline for my property goal?",
    Icon: Target,
  },
  {
    id: "debt",
    question: "Should I clear debt before funding goals aggressively?",
    Icon: Scale,
  },
  {
    id: "liquidity",
    question: "How do I strengthen liquidity without sacrificing goal momentum?",
    Icon: Shield,
  },
  {
    id: "twelve-months",
    question: "What is the healthiest financial path for the next 12 months?",
    Icon: TrendingUp,
  },
];

/* ── Actions (static) ─────────────────────────────────────────── */

const ACTIONS: { label: string; description: string; href: string }[] = [
  {
    label: "Review scenario stances",
    description: "Compare Safe, Balanced, and Aggressive paths side by side",
    href: "/scenarios",
  },
  {
    label: "Adjust property timeline",
    description: "Revisit the primary goal\u2019s target date and funding pace",
    href: "/goals",
  },
  {
    label: "Update asset valuations",
    description: "Refresh property, portfolio, and cash balances",
    href: "/assets",
  },
  {
    label: "Revisit cash flow structure",
    description: "Check if variable spending or debt service has changed",
    href: "/cash-flow",
  },
];

/* ── Minimal markdown rendering for **bold** headings ─────────── */
function renderMarkdown(text: string) {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p
        key={i}
        className="mt-4 text-sm leading-[1.8] first:mt-0"
        style={{ color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}
      >
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong
                key={j}
                className="block text-[13px] font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <Fragment key={j}>{part}</Fragment>;
        })}
      </p>
    );
  });
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function AICopilot() {
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const {
    snapshot,
    currentStance,
    goalTrajectories,
    totalGoalRequired,
    overcommitRatio,
    alphaStatus,
  } = useWealth();

  const { balanceSheet: bs, cashFlow: cf, profile, goals } = snapshot;

  async function askCopilot(question: string) {
    if (!question.trim() || isStreaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentQuestion(question);
    setAnswer("");
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Request failed (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setIsStreaming(false);
    }
  }

  /* ── Derived values for narrative & tensions ──────────────────── */
  const totalAssets = bs.assets.reduce((s, a) => s + a.value, 0);
  const illiquidPct =
    totalAssets > 0 ? Math.round((bs.realAssets / totalAssets) * 100) : 0;
  const totalObligations = cf.totalFixed + cf.totalVariable + cf.totalDebtService;
  const liquidityCoverage =
    totalObligations > 0 ? (bs.liquidAssets / totalObligations).toFixed(1) : "0.0";
  const debtPct =
    cf.totalInflow > 0 ? ((cf.totalDebtService / cf.totalInflow) * 100).toFixed(1) : "0.0";
  const featured = goals[0];
  const ft = goalTrajectories[0];
  const canNarrate = alphaStatus.hasIncome && alphaStatus.hasAssets && alphaStatus.hasGoals;

  const highAprLiabilities = bs.liabilities
    .filter((l) => l.apr && l.apr >= 30)
    .sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0));

  const highAprDesc = highAprLiabilities
    .map((l) => `${l.apr}% APR ${l.name.toLowerCase()}`)
    .join(" and ");

  /* ── Dynamic tensions ────────────────────────────────────────── */
  const tensions: { label: string; detail: string; accent: string }[] = [
    {
      label: "Goal ambition exceeds capacity",
      detail: `${goals.length} goals require ${formatCurrency(totalGoalRequired, { compact: true })}/mo but only ${formatCurrency(cf.allocatableSurplus, { compact: true })}/mo is allocatable \u2014 a ${overcommitRatio.toFixed(1)}x structural gap that forces prioritization.`,
      accent: "var(--color-warning)",
    },
    {
      label: "Debt pressure vs goal progress",
      detail: `${formatCurrency(cf.totalDebtService, { compact: true })}/mo debt service at high APR is actively eroding wealth. Accelerating payoff frees capacity but temporarily slows goals.`,
      accent: "var(--color-negative)",
    },
    {
      label: "Thin liquidity coverage",
      detail: `${formatCurrency(bs.liquidAssets, { compact: true })} covers ${liquidityCoverage} months of obligations versus the recommended 3 months. Any income disruption has immediate impact.`,
      accent: "var(--color-warning)",
    },
    {
      label: "Wealth concentrated in illiquid assets",
      detail: `${illiquidPct}% of total assets are in property and vehicle \u2014 strong long-term, but inaccessible for near-term goals or emergencies.`,
      accent: "var(--color-accent)",
    },
  ];

  /* ── Dynamic data sources ────────────────────────────────────── */
  const dataSources: {
    label: string;
    stat: string;
    href: string;
    Icon: ComponentType<{ size?: number }>;
  }[] = [
    {
      label: "Balance Sheet",
      stat: `${formatCurrency(bs.netWorth, { compact: true })} net worth`,
      href: "/assets",
      Icon: Landmark,
    },
    {
      label: "Cash Flow",
      stat: `${formatCurrency(cf.allocatableSurplus, { compact: true })} allocatable/mo`,
      href: "/cash-flow",
      Icon: ArrowRightLeft,
    },
    {
      label: "Goal Program",
      stat: `${overcommitRatio.toFixed(1)}x overcommitted`,
      href: "/goals",
      Icon: Target,
    },
    {
      label: "Scenarios",
      stat: `${snapshot.plans.length} stances \u00b7 ${STANCE_LABEL[currentStance]} active`,
      href: "/scenarios",
      Icon: GitBranch,
    },
  ];

  return (
    <PageShell>
      {/* ── Editorial header ──────────────────────────────────── */}
      <div className="pb-10 pt-6">
        <h1
          className="text-[2.75rem] font-bold leading-tight tracking-tight lg:text-[3.25rem]"
          style={{ color: "var(--color-text-primary)" }}
        >
          Your Wealth{" "}
          <span style={{ color: "var(--color-accent)" }}>Strategist.</span>
        </h1>
        <p
          className="mt-3 max-w-lg text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          A planning synthesis of your current model — balance sheet, cash flow,
          goals, and scenarios — interpreted as directional guidance.
        </p>
      </div>

      {/* ── Copilot identity bar ──────────────────────────────── */}
      <div
        className="atmospheric-shadow flex items-center justify-between rounded-2xl px-7 py-5"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
          >
            <BarChart3 size={18} />
          </span>
          <div>
            <p
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Ethos Intelligence
            </p>
            <p
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Interpreting {profile.name}&apos;s current model —{" "}
              {formatMonth(snapshot.period)} · {STANCE_LABEL[currentStance]}{" "}
              stance
            </p>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{
            backgroundColor: "var(--color-accent-light)",
            color: "var(--color-accent)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
          Planning View
        </span>
      </div>

      {/* ── Financial narrative ────────────────────────────────── */}
      <div
        className="atmospheric-shadow mt-6 rounded-2xl p-7"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <p className="label-meta" style={{ color: "var(--color-text-muted)" }}>
          Current Financial Narrative
        </p>
        {!canNarrate || !featured || !ft ? (
          <p
            className="mt-4 text-sm leading-[1.8]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Insufficient data for a full narrative. Add{" "}
            {alphaStatus.missing.join(", ")} in{" "}
            <Link href="/alpha-setup" style={{ color: "var(--color-accent)" }}>
              Alpha Setup
            </Link>{" "}
            to improve confidence across cross-screen analysis.
          </p>
        ) : (
          <p
            className="mt-4 text-sm leading-[1.8]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Your net worth stands at{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {formatCurrency(bs.netWorth, { compact: true })}
            </strong>
            , driven primarily by real estate and vehicle — together comprising{" "}
            {illiquidPct}% of total assets. Your liquid position is thin:{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {formatCurrency(bs.liquidAssets, { compact: true })} in cash covers
              roughly {liquidityCoverage} months
            </strong>{" "}
            of total obligations, well below the recommended 3-month buffer.
            Monthly, your engine produces{" "}
            {formatCurrency(cf.totalInflow, { compact: true })} of inflow and
            commits {formatCurrency(totalObligations, { compact: true })} to
            obligations, leaving{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {formatCurrency(cf.allocatableSurplus, { compact: true })}{" "}
              allocatable
            </strong>{" "}
            after your safety buffer. Your primary goal — {featured.name} at{" "}
            {formatCurrency(featured.targetAmount, { compact: true })} — requires{" "}
            {formatCurrency(featured.monthlyRequired, { compact: true })}/mo to
            meet target, but total goal requirements across all {goals.length}{" "}
            priorities total{" "}
            <strong style={{ color: "var(--color-warning)" }}>
              {formatCurrency(totalGoalRequired, { compact: true })}/mo —{" "}
              {overcommitRatio.toFixed(1)}x your available surplus
            </strong>
            . Debt service consumes{" "}
            {formatCurrency(cf.totalDebtService, { compact: true })}/mo ({debtPct}
            % of inflow)
            {highAprDesc && (
              <>
                , with {highAprDesc} adding structural pressure
              </>
            )}
            . Under the current{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              {STANCE_LABEL[currentStance]}
            </strong>{" "}
            stance, the primary goal receives{" "}
            {formatCurrency(ft.allocation, { compact: true })}/mo — a{" "}
            {Math.round(ft.paceRatio * 100)}% pace ratio.
          </p>
        )}
      </div>

      {/* ── Key tensions ──────────────────────────────────────── */}
      <div className="mt-6">
        <p className="label-meta mb-4" style={{ color: "var(--color-text-muted)" }}>
          Key Tensions
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tensions.map((t) => (
            <div
              key={t.label}
              className="atmospheric-shadow flex gap-3 rounded-2xl border-l-2 py-5 pl-5 pr-6"
              style={{
                backgroundColor: "var(--color-surface)",
                borderLeftColor: t.accent,
              }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: t.accent }}>
                <AlertTriangle size={14} />
              </span>
              <div>
                <p
                  className="text-sm font-semibold tracking-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t.label}
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ask Copilot ───────────────────────────────────────── */}
      <div className="mt-6">
        <p className="label-meta mb-4" style={{ color: "var(--color-text-muted)" }}>
          Ask the Copilot
        </p>
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Pick a starter question or ask your own. Responses are generated live from your current model.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((path) => {
            const isActive = path.question === currentQuestion;
            return (
              <button
                key={path.id}
                onClick={() => askCopilot(path.question)}
                disabled={isStreaming}
                className="atmospheric-shadow flex items-start gap-3 rounded-2xl p-5 text-left transition-all duration-200 disabled:opacity-60"
                style={{
                  backgroundColor: "var(--color-surface)",
                  outline: isActive
                    ? "2px solid var(--color-accent)"
                    : "2px solid transparent",
                }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: isActive
                      ? "var(--color-accent)"
                      : "var(--color-surface-low)",
                    color: isActive ? "#fff" : "var(--color-text-muted)",
                    transition: "all 200ms",
                  }}
                >
                  <path.Icon size={16} />
                </span>
                <p
                  className="text-[13px] font-medium leading-snug"
                  style={{
                    color: isActive
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                  }}
                >
                  {path.question}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom question input */}
        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (customInput.trim()) {
              askCopilot(customInput.trim());
              setCustomInput("");
            }
          }}
        >
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Ask your own question about your financial model..."
            disabled={isStreaming}
            className="atmospheric-shadow flex-1 rounded-2xl px-5 py-3 text-sm outline-none disabled:opacity-60"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !customInput.trim()}
            className="atmospheric-shadow flex h-11 w-11 items-center justify-center rounded-2xl disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#fff",
            }}
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>

      {/* ── Copilot response ──────────────────────────────────── */}
      {(currentQuestion || isStreaming || answer || error) && (
        <div
          className="atmospheric-shadow mt-6 overflow-hidden rounded-2xl border-l-[3px]"
          style={{
            backgroundColor: "var(--color-surface)",
            borderLeftColor: "var(--color-accent)",
          }}
        >
          <div className="p-7 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="label-meta"
                  style={{ color: "var(--color-accent)" }}
                >
                  Ethos Intelligence · Private Alpha
                </p>
                <p
                  className="mt-2 text-lg font-semibold tracking-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {currentQuestion}
                </p>
              </div>
              {isStreaming && (
                <Loader2
                  size={18}
                  className="mt-1 animate-spin shrink-0"
                  style={{ color: "var(--color-accent)" }}
                />
              )}
            </div>

            <div className="mt-6">
              {error ? (
                <p
                  className="text-sm"
                  style={{ color: "var(--color-negative)" }}
                >
                  {error}
                </p>
              ) : answer ? (
                renderMarkdown(answer)
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Thinking through your model…
                </p>
              )}
            </div>

            <div
              className="mt-6 rounded-xl px-5 py-3"
              style={{ backgroundColor: "var(--color-surface-low)" }}
            >
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                This planning output is based on your current self-reported data as of{" "}
                {formatMonth(snapshot.period)}. Confidence depends on data completeness.
                It is not financial advice. In private alpha, your data is stored for
                prototype testing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Linked intelligence ───────────────────────────────── */}
      <div className="mt-6">
        <p className="label-meta mb-4" style={{ color: "var(--color-text-muted)" }}>
          Data Sources
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {dataSources.map((src) => (
            <Link
              key={src.label}
              href={src.href}
              className="atmospheric-shadow flex items-center gap-3 rounded-2xl p-4 transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: "var(--color-surface-low)",
                  color: "var(--color-text-muted)",
                }}
              >
                <src.Icon size={15} />
              </span>
              <div className="min-w-0">
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {src.label}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {src.stat}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Suggested actions ─────────────────────────────────── */}
      <div className="mt-6">
        <p className="label-meta mb-4" style={{ color: "var(--color-text-muted)" }}>
          Suggested Next Steps
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {ACTIONS.map((act) => (
            <Link
              key={act.label}
              href={act.href}
              className="atmospheric-shadow group flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div>
                <p
                  className="text-sm font-semibold tracking-tight"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {act.label}
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {act.description}
                </p>
              </div>
              <span style={{ color: "var(--color-text-muted)" }}>
                <Info size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
