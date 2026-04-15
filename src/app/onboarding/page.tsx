"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWealth } from "@/lib/wealth-context";
import type { AlphaIntakePayload } from "@/lib/alpha-intake";
import { formatCurrency } from "@/lib/format";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

type Phase = "wizard" | "exiting" | "reveal";

const REVEAL_HOLD_MS = 2700;
const JUST_ONBOARDED_KEY = "wealth:justOnboarded";

type StepId = "hello" | "income" | "expenses" | "debts" | "goal";

const STEP_ORDER: StepId[] = ["hello", "income", "expenses", "debts", "goal"];

interface Draft {
  salary: string;
  otherIncome: string;
  fixedExpenses: string;
  variableExpenses: string;
  cash: string;
  debtBalance: string;
  debtService: string;
  goalName: string;
  goalTarget: string;
  goalCurrent: string;
  goalMonth: string;
}

const EMPTY: Draft = {
  salary: "",
  otherIncome: "",
  fixedExpenses: "",
  variableExpenses: "",
  cash: "",
  debtBalance: "",
  debtService: "",
  goalName: "",
  goalTarget: "",
  goalCurrent: "",
  goalMonth: "",
};

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshSnapshot } = useWealth();
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("wizard");

  const step = STEP_ORDER[stepIdx]!;
  const isLast = stepIdx === STEP_ORDER.length - 1;

  // After the reveal animation finishes, sit for a beat then hand off.
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(JUST_ONBOARDED_KEY, "1");
      }
      router.push("/copilot");
    }, REVEAL_HOLD_MS);
    return () => clearTimeout(t);
  }, [phase, router]);

  const canAdvance = useMemo(() => {
    if (step === "hello") return true;
    if (step === "income") return n(draft.salary) > 0;
    if (step === "expenses")
      return n(draft.fixedExpenses) + n(draft.variableExpenses) > 0;
    if (step === "debts") return true;
    if (step === "goal")
      return (
        draft.goalName.trim().length > 0 &&
        n(draft.goalTarget) > 0 &&
        /^\d{4}-\d{2}$/.test(draft.goalMonth)
      );
    return false;
  }, [step, draft]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: AlphaIntakePayload = {
        mode: "custom",
        data: {
          monthlyEngine: {
            salary: n(draft.salary),
            otherRecurringIncome: n(draft.otherIncome),
            fixedExpenses: n(draft.fixedExpenses),
            variableExpenses: n(draft.variableExpenses),
            debtService: n(draft.debtService),
            safetyBuffer: 0,
          },
          balanceSheet: {
            cash: n(draft.cash),
            investments: 0,
            property: 0,
            vehicle: 0,
          },
          liabilities: {
            installmentLiabilities: n(draft.debtBalance),
            revolvingLiabilities: 0,
          },
          goals: [
            {
              name: draft.goalName.trim(),
              targetAmount: n(draft.goalTarget),
              currentAmount: n(draft.goalCurrent),
              targetMonth: draft.goalMonth,
              priority: 1,
            },
          ],
        },
      };

      const res = await fetch("/api/alpha/intake", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      await refreshSnapshot();
      // Fade the wizard out, then swap to the reveal view.
      setPhase("exiting");
      setTimeout(() => setPhase("reveal"), 220);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setSaving(false);
    }
  }

  function next() {
    setError(null);
    if (isLast) {
      submit();
      return;
    }
    setStepIdx((i) => i + 1);
  }

  function back() {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  const leftover =
    n(draft.salary) +
    n(draft.otherIncome) -
    n(draft.fixedExpenses) -
    n(draft.variableExpenses) -
    n(draft.debtService);

  if (phase === "reveal") {
    return <OnboardingReveal draft={draft} />;
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--color-vellum-deep)" }}
    >
      <div
        className={`mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12 ${
          phase === "exiting" ? "wizard-exiting" : ""
        }`}
      >
        <Progress idx={stepIdx} total={STEP_ORDER.length} />

        <div className="flex flex-1 flex-col justify-center py-12">
          {step === "hello" && <HelloStep />}

          {step === "income" && (
            <StepFrame
              eyebrow="Step 2 of 5"
              title="What comes in every month?"
              hint="Just the steady stuff. We'll add one-offs later."
            >
              <BigField
                label="Salary (net, monthly)"
                value={draft.salary}
                onChange={(v) => set("salary", v)}
                autoFocus
              />
              <BigField
                label="Other recurring (rent, side income, etc.)"
                value={draft.otherIncome}
                onChange={(v) => set("otherIncome", v)}
                optional
              />
            </StepFrame>
          )}

          {step === "expenses" && (
            <StepFrame
              eyebrow="Step 3 of 5"
              title="What goes out every month?"
              hint="Rough numbers are fine. You'll refine them later."
            >
              <BigField
                label="Fixed (rent, utilities, subscriptions)"
                value={draft.fixedExpenses}
                onChange={(v) => set("fixedExpenses", v)}
                autoFocus
              />
              <BigField
                label="Variable (groceries, eating out, transport)"
                value={draft.variableExpenses}
                onChange={(v) => set("variableExpenses", v)}
              />
              <BigField
                label="Cash on hand"
                value={draft.cash}
                onChange={(v) => set("cash", v)}
                optional
              />
              {leftover !== 0 && (
                <div
                  className="rounded-xl px-5 py-4 text-[13px]"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Roughly{" "}
                  <span
                    className="font-semibold tabular-nums"
                    style={{
                      color:
                        leftover >= 0
                          ? "var(--color-accent)"
                          : "var(--color-negative)",
                    }}
                  >
                    {formatCurrency(leftover)}
                  </span>{" "}
                  left over each month.
                </div>
              )}
            </StepFrame>
          )}

          {step === "debts" && (
            <StepFrame
              eyebrow="Step 4 of 5"
              title="Any debts pulling on you?"
              hint="Skip if none. Otherwise, the total balance and what you pay monthly."
            >
              <BigField
                label="Total debt balance"
                value={draft.debtBalance}
                onChange={(v) => set("debtBalance", v)}
                optional
                autoFocus
              />
              <BigField
                label="Monthly debt payment"
                value={draft.debtService}
                onChange={(v) => set("debtService", v)}
                optional
              />
            </StepFrame>
          )}

          {step === "goal" && (
            <StepFrame
              eyebrow="Step 5 of 5"
              title="What's the one thing you're saving for?"
              hint="One goal is enough to start. You can add more inside."
            >
              <TextBig
                label="Goal name"
                value={draft.goalName}
                onChange={(v) => set("goalName", v)}
                placeholder="e.g. Emergency fund, Down payment"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-4">
                <BigField
                  label="Target amount"
                  value={draft.goalTarget}
                  onChange={(v) => set("goalTarget", v)}
                />
                <BigField
                  label="Already saved"
                  value={draft.goalCurrent}
                  onChange={(v) => set("goalCurrent", v)}
                  optional
                />
              </div>
              <div>
                <label
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Target month
                </label>
                <input
                  type="month"
                  value={draft.goalMonth}
                  onChange={(e) => set("goalMonth", e.target.value)}
                  className="mt-2 w-full rounded-xl px-5 py-4 text-[18px] outline-none"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
            </StepFrame>
          )}
        </div>

        {error && (
          <p
            className="mb-4 text-[13px]"
            style={{ color: "var(--color-negative)" }}
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={stepIdx === 0 || saving}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!canAdvance || saving}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-accent)",
              boxShadow: "0 14px 36px -16px rgba(69,100,94,0.4)",
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isLast ? (saving ? "Setting up…" : "Finish") : "Continue"}
            {!isLast && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Progress({ idx, total }: { idx: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-colors"
          style={{
            backgroundColor:
              i <= idx ? "var(--color-accent)" : "var(--color-surface)",
          }}
        />
      ))}
    </div>
  );
}

function HelloStep() {
  return (
    <div className="flex flex-col gap-6">
      <p className="label-meta">Step 1 of 5 · About 60 seconds</p>
      <h1
        className="display-hero"
        style={{ color: "var(--color-text-primary)" }}
      >
        Let's seed your model.
      </h1>
      <p className="lead-text" style={{ color: "var(--color-text-secondary)" }}>
        Five short questions: what comes in, what goes out, what you owe, and
        what you're saving for. Rough numbers are fine — you'll refine them
        inside.
      </p>
    </div>
  );
}

function StepFrame({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="label-meta">{eyebrow}</p>
        <h2
          className="display-page"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h2>
        <p
          className="text-[14px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {hint}
        </p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

function BigField({
  label,
  value,
  onChange,
  optional,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
        {optional && <span style={{ opacity: 0.6 }}>· optional</span>}
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-2 w-full rounded-xl px-5 py-4 text-[22px] font-semibold tabular-nums outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
          letterSpacing: "-0.01em",
        }}
      />
    </div>
  );
}

function TextBig({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl px-5 py-4 text-[18px] outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}

/* ── Finish reveal ────────────────────────────────────────────────
   The quiet acknowledgment. Numbers from the wizard slide up one
   by one, then "Your model is live." fades in under them. No
   confetti, no sound — professional and intentional. */
function OnboardingReveal({ draft }: { draft: Draft }) {
  const income = n(draft.salary) + n(draft.otherIncome);
  const expenses = n(draft.fixedExpenses) + n(draft.variableExpenses);
  const leftover = income - expenses - n(draft.debtService);
  const debt = n(draft.debtBalance);
  const goalName = draft.goalName.trim() || "Your goal";

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    { label: "Monthly income", value: formatCurrency(income) },
    { label: "Monthly spend", value: formatCurrency(expenses) },
    { label: "Left over", value: formatCurrency(leftover), emphasis: true },
    { label: "Debt balance", value: formatCurrency(debt) },
    { label: "Goal", value: goalName },
  ];

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--color-vellum-deep)" }}
    >
      <div className="reveal-container w-full max-w-lg">
        <p
          className="reveal-row reveal-row-1 label-meta text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          Your financial model
        </p>

        <div
          className="mt-8 rounded-3xl px-10 py-10"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow:
              "0 24px 72px -28px rgba(45,52,53,0.14), 0 1px 0 0 rgba(45,52,53,0.04)",
          }}
        >
          <div className="flex flex-col gap-5">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`reveal-row reveal-row-${i + 2} flex items-baseline justify-between border-b pb-4 last:border-b-0 last:pb-0`}
                style={{ borderColor: "var(--color-border-light)" }}
              >
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {row.label}
                </span>
                <span
                  className="text-[19px] font-semibold tabular-nums tracking-tight"
                  style={{
                    color: row.emphasis
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p
          className="reveal-caption mt-10 text-center text-[15px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your model is live.
        </p>
      </div>
    </div>
  );
}
