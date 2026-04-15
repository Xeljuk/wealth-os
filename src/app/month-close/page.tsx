"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { useWealth } from "@/lib/wealth-context";
import { useToast } from "@/components/ui/Toast";
import { Skeleton, useDelayedLoading } from "@/components/ui/Skeleton";
import { formatCurrency, formatMonth } from "@/lib/format";
import { Loader2, CheckCircle2 } from "lucide-react";

interface HistoryRow {
  period: string;
  closed_at: string;
  net_worth: number;
  total_inflow: number;
  total_fixed: number;
  total_variable: number;
  total_debt_service: number;
  allocatable_surplus: number;
}

export default function MonthClosePage() {
  const router = useRouter();
  const { snapshot, refreshSnapshot, isLoading: wealthLoading } = useWealth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const showSkeleton = useDelayedLoading(wealthLoading || historyLoading);

  useEffect(() => {
    setHistoryLoading(true);
    fetch("/api/snapshot/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setHistory(data.rows ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const { balanceSheet: bs, cashFlow: cf } = snapshot;
  const alreadyClosed = history.some((h) => h.period === snapshot.period);

  async function closeMonth(advance: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/snapshot/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advance }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `HTTP ${res.status}`);
      }
      if (advance) {
        await refreshSnapshot();
      }
      toast.success(
        advance
          ? `${formatMonth(snapshot.period)} closed — next month is open`
          : `${formatMonth(snapshot.period)} closed`,
      );
      router.push("/copilot");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not close month.";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  }

  if (showSkeleton) {
    return (
      <PageShell
        eyebrow="Monthly ritual"
        title={`Close ${formatMonth(snapshot.period)}.`}
        subtitle="Lock in the numbers as they stand today. Future months compare against this snapshot — so you can see what actually moved."
      >
        <MonthCloseSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Monthly ritual"
      title={`Close ${formatMonth(snapshot.period)}.`}
      subtitle="Lock in the numbers as they stand today. Future months compare against this snapshot — so you can see what actually moved."
    >
      <div
        className="rounded-2xl px-8 py-7"
        style={{ backgroundColor: "var(--color-vellum-deep)" }}
      >
        <p className="label-meta">This month's numbers</p>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3">
          <Stat label="Net worth" value={formatCurrency(bs.netWorth, { compact: true })} />
          <Stat label="Inflow" value={formatCurrency(cf.totalInflow, { compact: true })} />
          <Stat label="Fixed" value={formatCurrency(cf.totalFixed, { compact: true })} />
          <Stat label="Variable" value={formatCurrency(cf.totalVariable, { compact: true })} />
          <Stat label="Debt service" value={formatCurrency(cf.totalDebtService, { compact: true })} />
          <Stat label="Allocatable" value={formatCurrency(cf.allocatableSurplus, { compact: true })} />
        </div>
      </div>

      <div className="section-breath-lg flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => closeMonth(true)}
          disabled={saving}
          className="inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{
            backgroundColor: "var(--color-accent)",
            boxShadow: "0 14px 36px -16px rgba(69,100,94,0.4)",
          }}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          Close & start next month
        </button>
        <button
          type="button"
          onClick={() => closeMonth(false)}
          disabled={saving}
          className="inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{
            backgroundColor: "var(--color-surface-low)",
            color: "var(--color-text-secondary)",
          }}
        >
          {alreadyClosed ? "Re-close without advancing" : "Close without advancing"}
        </button>
        {error && (
          <p className="text-[13px]" style={{ color: "var(--color-negative)" }}>
            {error}
          </p>
        )}
        {alreadyClosed && !error && (
          <p
            className="text-[12px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Already closed — re-closing will overwrite with current values.
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div className="section-breath-lg hairline-top pt-16">
          <p className="label-meta">Previous closes</p>
          <div className="mt-6 flex flex-col divide-y" style={{ borderColor: "var(--color-border-light)" }}>
            {history.map((h) => (
              <div
                key={h.period}
                className="flex items-center justify-between py-4"
                style={{ borderColor: "var(--color-border-light)" }}
              >
                <div>
                  <p
                    className="text-[15px] font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatMonth(h.period)}
                  </p>
                  <p className="label-meta mt-1">
                    Closed {h.closed_at.slice(0, 10)}
                  </p>
                </div>
                <p
                  className="text-[15px] font-semibold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatCurrency(h.net_worth, { compact: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-meta">{label}</p>
      <p
        className="mt-2 text-[22px] font-bold tabular-nums"
        style={{
          color: "var(--color-text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function MonthCloseSkeleton() {
  return (
    <>
      {/* Stats grid */}
      <div
        className="rounded-2xl px-8 py-7"
        style={{ backgroundColor: "var(--color-vellum-deep)" }}
      >
        <Skeleton width={150} height={12} />
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton width={80} height={10} />
              <Skeleton width={130} height={24} />
            </div>
          ))}
        </div>
      </div>

      {/* CTA row */}
      <div className="section-breath-lg flex gap-3">
        <Skeleton width={220} height={46} rounded="rounded-xl" />
        <Skeleton width={180} height={46} rounded="rounded-xl" />
      </div>

      {/* Previous closes */}
      <div className="section-breath-lg hairline-top pt-16">
        <Skeleton width={130} height={12} />
        <div className="mt-6 flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <Skeleton width={140} height={16} />
                <Skeleton width={110} height={11} />
              </div>
              <Skeleton width={120} height={16} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
