"use client";

import { useState, useRef, useEffect, Fragment } from "react";
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
  Landmark,
  ArrowRightLeft,
  GitBranch,
  AlertTriangle,
  Sparkles,
  Send,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { ComponentType } from "react";

/* ── Config ───────────────────────────────────────────────────── */

const STANCE_LABEL: Record<PlanStance, string> = {
  safe: "Safe",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

interface PresetQuestion {
  id: string;
  question: string;
  Icon: ComponentType<{ size?: number }>;
}

const PRESETS: PresetQuestion[] = [
  {
    id: "property",
    question: "What is the most realistic timeline for my primary goal?",
    Icon: Target,
  },
  {
    id: "debt",
    question: "Should I clear debt before funding goals aggressively?",
    Icon: Scale,
  },
  {
    id: "liquidity",
    question: "How do I strengthen liquidity without losing goal momentum?",
    Icon: Shield,
  },
  {
    id: "twelve-months",
    question: "What is the healthiest financial path for the next 12 months?",
    Icon: TrendingUp,
  },
];

const NEXT_MOVES: { label: string; description: string; href: string }[] = [
  {
    label: "Review scenario stances",
    description: "Compare Safe, Balanced, and Aggressive paths side by side.",
    href: "/scenarios",
  },
  {
    label: "Revisit goal timelines",
    description: "Adjust target dates and priorities of your active missions.",
    href: "/goals",
  },
  {
    label: "Update asset valuations",
    description: "Refresh property, portfolio, and cash balances.",
    href: "/assets",
  },
  {
    label: "Tune cash flow",
    description: "Check fixed, variable, and debt service for any drift.",
    href: "/cash-flow",
  },
];

function DiffStat({
  label,
  delta,
  color,
  arrow,
}: {
  label: string;
  delta: number;
  color: string;
  arrow: string;
}) {
  const abs = Math.abs(delta);
  return (
    <div>
      <p className="label-meta">{label} · vs last close</p>
      <p
        className="mt-2 text-[22px] font-bold tabular-nums"
        style={{ color, letterSpacing: "-0.02em" }}
      >
        {arrow} {abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

/* ── Markdown renderer for **bold** headings + paragraphs ─────── */
function renderMarkdown(text: string) {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p
        key={i}
        className="mt-5 first:mt-0"
        style={{
          color: "var(--color-text-secondary)",
          whiteSpace: "pre-wrap",
          fontSize: "15px",
          lineHeight: 1.75,
        }}
      >
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong
                key={j}
                className="mt-1 block text-[13px] font-semibold uppercase tracking-[0.08em]"
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
export default function CopilotPage() {
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>("");
  const [history, setHistory] = useState<
    { period: string; net_worth: number; allocatable_surplus: number; total_debt_service: number }[]
  >([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/snapshot/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setHistory(data.rows ?? []))
      .catch(() => setHistory([]));
  }, []);

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

  /* ── Derived values for narrative + tensions ───────────────── */
  const totalAssets = bs.assets.reduce((s, a) => s + a.value, 0);
  const illiquidPct =
    totalAssets > 0 ? Math.round((bs.realAssets / totalAssets) * 100) : 0;
  const totalObligations =
    cf.totalFixed + cf.totalVariable + cf.totalDebtService;
  const liquidityCoverage =
    totalObligations > 0
      ? (bs.liquidAssets / totalObligations).toFixed(1)
      : "0.0";
  const debtPct =
    cf.totalInflow > 0
      ? ((cf.totalDebtService / cf.totalInflow) * 100).toFixed(1)
      : "0.0";
  const featured = goals[0];
  const ft = goalTrajectories[0];
  const canNarrate =
    alphaStatus.hasIncome && alphaStatus.hasAssets && alphaStatus.hasGoals;

  const tensions: { label: string; detail: string; accent: string }[] =
    canNarrate
      ? [
          {
            label: "Goal ambition exceeds capacity",
            detail: `${goals.length} goals require ${formatCurrency(totalGoalRequired, { compact: true })}/mo but only ${formatCurrency(cf.allocatableSurplus, { compact: true })}/mo is allocatable — a ${overcommitRatio.toFixed(1)}× gap that forces prioritisation.`,
            accent: "var(--color-warning)",
          },
          {
            label: "Debt pressure vs. goal progress",
            detail: `${formatCurrency(cf.totalDebtService, { compact: true })}/mo in debt service — ${debtPct}% of inflow. Accelerating payoff frees capacity but temporarily slows goals.`,
            accent: "var(--color-negative)",
          },
          {
            label: "Thin liquidity coverage",
            detail: `${formatCurrency(bs.liquidAssets, { compact: true })} covers ${liquidityCoverage} months of obligations versus the 3-month recommended floor.`,
            accent: "var(--color-warning)",
          },
          {
            label: "Wealth concentrated in illiquid assets",
            detail: `${illiquidPct}% of total assets sit in property and vehicle — solid long-term, hard to tap in the near term.`,
            accent: "var(--color-accent)",
          },
        ]
      : [];

  const dataSources: {
    label: string;
    stat: string;
    href: string;
    Icon: ComponentType<{ size?: number }>;
  }[] = [
    {
      label: "Balance sheet",
      stat: `${formatCurrency(bs.netWorth, { compact: true })} net worth`,
      href: "/assets",
      Icon: Landmark,
    },
    {
      label: "Cash flow",
      stat: `${formatCurrency(cf.allocatableSurplus, { compact: true })}/mo allocatable`,
      href: "/cash-flow",
      Icon: ArrowRightLeft,
    },
    {
      label: "Goal program",
      stat: `${overcommitRatio.toFixed(1)}× overcommitted`,
      href: "/goals",
      Icon: Target,
    },
    {
      label: "Scenarios",
      stat: `${STANCE_LABEL[currentStance]} stance active`,
      href: "/scenarios",
      Icon: GitBranch,
    },
  ];

  return (
    <PageShell
      eyebrow={`AI Copilot · ${formatMonth(snapshot.period)}`}
      title="Your wealth strategist, on call."
      subtitle={`Synthesises ${profile.name}'s current model — balance sheet, cash flow, goals, scenarios — into plain-language guidance. Ground every answer in your real numbers.`}
    >
      {/* ── Month-over-month diff ────────────────────────────── */}
      {history.length >= 2 && (() => {
        const [curr, prev] = history;
        const dNet = curr!.net_worth - prev!.net_worth;
        const dSurplus = curr!.allocatable_surplus - prev!.allocatable_surplus;
        const dDebt = curr!.total_debt_service - prev!.total_debt_service;
        const arrow = (n: number) => (n > 0 ? "↑" : n < 0 ? "↓" : "·");
        const good = (n: number) =>
          n > 0 ? "var(--color-accent)" : n < 0 ? "var(--color-negative)" : "var(--color-text-muted)";
        const badInv = (n: number) =>
          n < 0 ? "var(--color-accent)" : n > 0 ? "var(--color-negative)" : "var(--color-text-muted)";
        return (
          <div className="mb-10 grid grid-cols-1 gap-6 rounded-2xl px-7 py-6 md:grid-cols-3"
            style={{ backgroundColor: "var(--color-vellum-deep)" }}>
            <DiffStat label="Net worth" delta={dNet} color={good(dNet)} arrow={arrow(dNet)} />
            <DiffStat label="Allocatable" delta={dSurplus} color={good(dSurplus)} arrow={arrow(dSurplus)} />
            <DiffStat label="Debt service" delta={dDebt} color={badInv(dDebt)} arrow={arrow(dDebt)} />
          </div>
        );
      })()}

      {/* ── Narrative strip (hero) ────────────────────────────── */}
      {!canNarrate || !featured || !ft ? (
        <div
          className="mb-10 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-vellum-deep)" }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Not enough data for a synthesised narrative yet. Add{" "}
            {alphaStatus.missing.join(", ") || "your model inputs"} in{" "}
            <Link
              href="/onboarding"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              onboarding
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 items-start gap-6">
          <div className="col-span-12 lg:col-span-8">
            <p className="label-meta">Current narrative</p>
            <p className="body-editorial mt-4">
              Your net worth stands at{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {formatCurrency(bs.netWorth, { compact: true })}
              </strong>
              , with {illiquidPct}% locked into illiquid assets. Monthly inflow
              of {formatCurrency(cf.totalInflow, { compact: true })} meets{" "}
              {formatCurrency(totalObligations, { compact: true })} of
              obligations, leaving{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {formatCurrency(cf.allocatableSurplus, { compact: true })}{" "}
                allocatable
              </strong>
              . Your primary mission{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>
                {featured.name}
              </strong>{" "}
              needs {formatCurrency(featured.monthlyRequired, { compact: true })}
              /mo to meet target, but all {goals.length} goals combined require{" "}
              <strong style={{ color: "var(--color-warning)" }}>
                {formatCurrency(totalGoalRequired, { compact: true })}/mo (
                {overcommitRatio.toFixed(1)}×)
              </strong>
              . Debt service consumes {debtPct}% of inflow. Under the{" "}
              <strong style={{ color: "var(--color-accent)" }}>
                {STANCE_LABEL[currentStance]}
              </strong>{" "}
              stance, the primary goal is funded at{" "}
              {Math.round(ft.paceRatio * 100)}% of its required pace.
            </p>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div
              className="flex flex-col gap-5 border-l pl-6"
              style={{ borderColor: "var(--color-border-light)" }}
            >
              {dataSources.map((src) => (
                <Link
                  key={src.label}
                  href={src.href}
                  className="group flex items-start gap-3 transition-opacity hover:opacity-80"
                >
                  <span
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <src.Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="label-meta">{src.label}</p>
                    <p
                      className="mt-0.5 text-[13px] font-semibold tabular-nums"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {src.stat}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Key tensions ───────────────────────────────────────── */}
      {tensions.length > 0 && (
        <div className="section-breath-lg hairline-top pt-16">
          <div className="mb-8 max-w-2xl">
            <p className="label-meta">Key tensions</p>
            <h2 className="display-page mt-2">Where your plan pulls against itself.</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {tensions.map((t) => (
              <div
                key={t.label}
                className="flex gap-4 border-l-2 py-1 pl-5"
                style={{ borderLeftColor: t.accent }}
              >
                <span className="mt-0.5 shrink-0" style={{ color: t.accent }}>
                  <AlertTriangle size={14} />
                </span>
                <div>
                  <p
                    className="text-[14px] font-semibold tracking-tight"
                    style={{
                      color: "var(--color-text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {t.label}
                  </p>
                  <p
                    className="mt-1 text-[13px] leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ask the copilot ───────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Ask the copilot</p>
          <h2 className="display-page mt-2">Pose a question, get a plain answer.</h2>
          <p className="lead-text mt-4">
            Pick a starter prompt or write your own. Responses stream live,
            grounded in your current model state.
          </p>
        </div>

        {/* Preset question tiles */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((path) => {
            const isActive = path.question === currentQuestion;
            return (
              <button
                key={path.id}
                onClick={() => askCopilot(path.question)}
                disabled={isStreaming}
                className="flex items-start gap-3 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-surface)"
                    : "var(--color-vellum-deep)",
                  boxShadow: isActive
                    ? "0 16px 40px -18px rgba(69,100,94,0.25)"
                    : "none",
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
                      : "var(--color-surface)",
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

        {/* Custom input */}
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
            placeholder="Ask your own question about your model…"
            disabled={isStreaming}
            className="flex-1 rounded-2xl px-5 py-3 text-sm outline-none disabled:opacity-60"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-light)",
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !customInput.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl disabled:opacity-40"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#fff",
            }}
          >
            {isStreaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>

        {/* Response panel */}
        {(currentQuestion || isStreaming || answer || error) && (
          <div
            className="mt-8 rounded-2xl border-l-[3px] p-7 lg:p-8"
            style={{
              backgroundColor: "var(--color-surface)",
              borderLeftColor: "var(--color-accent)",
              boxShadow: "0 12px 40px -20px rgba(45,52,53,0.1)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-meta" style={{ color: "var(--color-accent)" }}>
                  Ethos Intelligence · Private Alpha
                </p>
                <p
                  className="mt-2 text-[19px] font-semibold tracking-tight"
                  style={{
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {currentQuestion}
                </p>
              </div>
              {isStreaming && (
                <Loader2
                  size={18}
                  className="mt-1 shrink-0 animate-spin"
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
              style={{ backgroundColor: "var(--color-vellum-deep)" }}
            >
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                This planning output is based on your current self-reported
                data as of {formatMonth(snapshot.period)}. Confidence depends
                on data completeness. It is not financial advice.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Next moves ──────────────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-8 max-w-2xl">
          <p className="label-meta">Your next moves</p>
          <h2 className="display-page mt-2">Go deeper from here.</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {NEXT_MOVES.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="group flex items-center justify-between gap-4 rounded-2xl px-6 py-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--color-surface)",
                boxShadow: "0 10px 32px -18px rgba(45,52,53,0.1)",
              }}
            >
              <div>
                <p
                  className="text-[15px] font-semibold tracking-tight"
                  style={{
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {m.label}
                </p>
                <p
                  className="mt-1 text-[13px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {m.description}
                </p>
              </div>
              <span
                className="opacity-40 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--color-accent)" }}
              >
                <ArrowRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
