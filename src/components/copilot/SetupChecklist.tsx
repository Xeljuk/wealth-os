"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, ArrowUpRight, X } from "lucide-react";

/* ── localStorage keys ──────────────────────────────────────────── */
export const LS_KEYS = {
  visitedScenarios: "wealth:visitedScenarios",
  visitedJourney: "wealth:visitedJourney",
  dismissed: "wealth:checklistDismissed",
} as const;

function lsHas(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function lsSet(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

/** Call once from a page's top-level useEffect to mark it as visited. */
export function markVisited(key: keyof typeof LS_KEYS): void {
  lsSet(LS_KEYS[key]);
}

/* ── Items ──────────────────────────────────────────────────────── */

export interface SetupSignal {
  hasIncome: boolean;
  hasExpenses: boolean;
  hasGoals: boolean;
  hasAssets: boolean;
  hasLiabilities: boolean;
  hasClosedMonth: boolean;
}

interface Item {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

function buildItems(s: SetupSignal, visitedScenarios: boolean, visitedJourney: boolean): Item[] {
  return [
    {
      key: "income",
      label: "Income added",
      hint: "Copilot now knows your earning capacity.",
      href: "/cash-flow",
      done: s.hasIncome,
    },
    {
      key: "expenses",
      label: "Expenses added",
      hint: "Copilot can compute your allocatable surplus.",
      href: "/cash-flow",
      done: s.hasExpenses,
    },
    {
      key: "goal",
      label: "First goal set",
      hint: "Copilot builds a timeline and funding plan around this.",
      href: "/goals",
      done: s.hasGoals,
    },
    {
      key: "assets",
      label: "Add your assets",
      hint: "Unlocks net worth tracking and existing-savings offset toward goals.",
      href: "/assets",
      done: s.hasAssets,
    },
    {
      key: "liabilities",
      label: "Add your liabilities",
      hint: "Unlocks debt-vs-goal priority trade-offs and avalanche analysis.",
      href: "/assets",
      done: s.hasLiabilities,
    },
    {
      key: "scenarios",
      label: "Review your scenarios",
      hint: "Compare Safe, Balanced, Aggressive — see how each reshapes your timeline.",
      href: "/scenarios",
      done: visitedScenarios,
    },
    {
      key: "journey",
      label: "Explore your journey",
      hint: "See the year-by-year projection and where inflection points land.",
      href: "/journey",
      done: visitedJourney,
    },
    {
      key: "close",
      label: "Close your first month",
      hint: "Activates month-over-month drift detection — the copilot tracks changes for you.",
      href: "/month-close",
      done: s.hasClosedMonth,
    },
  ];
}

/* ── Hook — progress state ─────────────────────────────────────── */

export interface SetupProgress {
  items: Item[];
  completed: number;
  total: number;
  allDone: boolean;
  dismissed: boolean;
  mounted: boolean;
  dismiss: () => void;
  undismiss: () => void;
}

export function useSetupProgress(signal: SetupSignal): SetupProgress {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visitedScenarios, setVisitedScenarios] = useState(false);
  const [visitedJourney, setVisitedJourney] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(lsHas(LS_KEYS.dismissed));
    setVisitedScenarios(lsHas(LS_KEYS.visitedScenarios));
    setVisitedJourney(lsHas(LS_KEYS.visitedJourney));

    // Pick up cross-tab changes.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEYS.dismissed) setDismissed(e.newValue === "1");
      if (e.key === LS_KEYS.visitedScenarios)
        setVisitedScenarios(e.newValue === "1");
      if (e.key === LS_KEYS.visitedJourney)
        setVisitedJourney(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const items = buildItems(signal, visitedScenarios, visitedJourney);
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = completed === total;

  function dismiss() {
    lsSet(LS_KEYS.dismissed);
    setDismissed(true);
  }
  function undismiss() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LS_KEYS.dismissed);
      } catch {
        /* ignore */
      }
    }
    setDismissed(false);
  }

  return {
    items,
    completed,
    total,
    allDone,
    dismissed,
    mounted,
    dismiss,
    undismiss,
  };
}

/* ── Component ──────────────────────────────────────────────────── */

export default function SetupChecklist({ signal }: { signal: SetupSignal }) {
  const p = useSetupProgress(signal);

  // SSR-safe: render nothing until mounted, so localStorage reads don't
  // cause hydration mismatch. The panel fades in post-mount anyway.
  if (!p.mounted) return null;
  if (p.dismissed) return null;
  if (p.allDone) return null;

  return (
    <div
      className="mb-10 rounded-2xl px-7 py-6"
      style={{
        backgroundColor: "var(--color-vellum-deep)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="label-meta">Sharpen your strategy</p>
          <p
            className="mt-2 text-[17px] font-semibold tracking-tight"
            style={{
              color: "var(--color-text-primary)",
              letterSpacing: "-0.015em",
            }}
          >
            {p.completed} of {p.total} complete
          </p>
          <p
            className="mt-1 text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Each step teaches the copilot more about your situation.
            The deeper it sees, the sharper its strategy gets.
          </p>
        </div>
        <button
          type="button"
          onClick={p.dismiss}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Dismiss checklist"
        >
          <X size={11} /> I'll do this later
        </button>
      </div>

      {/* Progress rail */}
      <div
        className="mb-6 h-1 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-surface-low)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(p.completed / p.total) * 100}%`,
            backgroundColor: "var(--color-accent)",
          }}
        />
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {p.items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className="group flex items-center gap-4 border-b py-3.5 last:border-b-0"
            style={{ borderColor: "var(--color-border-light)" }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                backgroundColor: it.done
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
                color: it.done ? "#fff" : "var(--color-text-muted)",
                border: it.done
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
              }}
            >
              {it.done ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <Circle size={8} strokeWidth={0} fill="currentColor" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="text-[14px] font-semibold tracking-tight"
                style={{
                  color: it.done
                    ? "var(--color-text-muted)"
                    : "var(--color-text-primary)",
                  letterSpacing: "-0.01em",
                  textDecoration: it.done ? "line-through" : "none",
                  textDecorationColor: "var(--color-border)",
                }}
              >
                {it.label}
              </p>
              <p
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                {it.hint}
              </p>
            </div>
            <span
              className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--color-accent)" }}
            >
              <ArrowUpRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
