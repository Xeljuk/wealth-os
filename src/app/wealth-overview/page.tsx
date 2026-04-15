"use client";

import PageShell from "@/components/layout/PageShell";
import NetWorthHero from "@/components/wealth/NetWorthHero";
import MonthlyPulse from "@/components/wealth/MonthlyPulse";
import GoalTension from "@/components/wealth/GoalTension";
import FeatureCard from "@/components/ui/FeatureCard";
import { Skeleton, useDelayedLoading } from "@/components/ui/Skeleton";
import { useWealth } from "@/lib/wealth-context";
import { formatMonth } from "@/lib/format";
import { Sparkles, CalendarClock } from "lucide-react";
import Link from "next/link";

export default function WealthOverview() {
  const { snapshot, goalTrajectories, alphaStatus, activePlan, isLoading } =
    useWealth();
  const showSkeleton = useDelayedLoading(isLoading);
  const { balanceSheet, cashFlow, netWorthHistory } = snapshot;
  const totalAssets = balanceSheet.assets.reduce((s, a) => s + a.value, 0);
  const illiquidPct =
    totalAssets > 0
      ? Math.round((balanceSheet.realAssets / totalAssets) * 100)
      : 0;
  const productivePct =
    totalAssets > 0
      ? Math.round((balanceSheet.investedAssets / totalAssets) * 100)
      : 0;

  if (showSkeleton) {
    return (
      <PageShell
        eyebrow={`Wealth Overview · ${formatMonth(snapshot.period)}`}
        title="Your wealth, at a glance."
        subtitle="A single view of everything you own, owe, and earn — and what the next five years could look like if you stay the course."
      >
        <WealthOverviewSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={`Wealth Overview · ${formatMonth(snapshot.period)}`}
      title="Your wealth, at a glance."
      subtitle="A single view of everything you own, owe, and earn — and what the next five years could look like if you stay the course."
    >
      {/* Setup banner — tinted panel, no shadow */}
      {(!alphaStatus.hasCustomData || alphaStatus.missing.length > 0) && (
        <div
          className="mb-16 rounded-2xl px-6 py-5"
          style={{ backgroundColor: "var(--color-vellum-deep)" }}
        >
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {!alphaStatus.hasCustomData && alphaStatus.isDemoMode
              ? "You are viewing a demo profile in private alpha. Add your own numbers for a personalized, self-reported analysis."
              : `Add ${alphaStatus.missing.join(", ")} to improve analysis confidence.`}{" "}
            <Link
              href="/alpha-setup"
              className="font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              Open setup →
            </Link>
          </p>
        </div>
      )}

      {/* Hero: net worth + five-year projection */}
      <NetWorthHero
        balanceSheet={balanceSheet}
        netWorthHistory={netWorthHistory}
        monthlySurplus={cashFlow.surplus}
        activePlan={activePlan}
      />

      {/* ── Section: operating engine ─────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 max-w-2xl">
          <p className="label-meta">This month</p>
          <h2 className="display-page mt-2">Where your month stands.</h2>
        </div>

        <div className="grid grid-cols-12 gap-x-12 gap-y-16">
          <div className="col-span-12 lg:col-span-6">
            <MonthlyPulse cashFlow={cashFlow} />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <GoalTension
              goalTrajectories={goalTrajectories}
              allocatableSurplus={cashFlow.allocatableSurplus}
            />
          </div>
        </div>
      </div>

      {/* ── Section: next moves ─────────────────────────────── */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 max-w-2xl">
          <p className="label-meta">Your next moves</p>
          <h2 className="display-page mt-2">Go deeper from here.</h2>
          <p className="lead-text mt-4">
            Dive into the structure of your holdings or let the Copilot
            synthesize the trade-offs into a plain-language narrative.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <FeatureCard
              icon={<Sparkles size={18} />}
              title="Wealth Inventory"
              description={
                alphaStatus.hasAssets
                  ? `${illiquidPct}% of your assets are illiquid; productive capital is ${productivePct}%. Review the structural breakdown, liquidity layers, and liability pressure.`
                  : "Add asset values to activate structural inventory insights."
              }
              actionLabel="View asset board"
              actionHref="/assets"
            />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <FeatureCard
              icon={<CalendarClock size={18} />}
              title="Wealth Strategist"
              description="Your financial position synthesized into strategic guidance — tensions, tradeoffs, and thinking paths grounded in your data."
              actionLabel="Open Copilot"
              actionHref="/copilot"
              actionVariant="button"
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function WealthOverviewSkeleton() {
  return (
    <>
      {/* Hero: net worth number + chart stage */}
      <div className="grid grid-cols-12 items-end gap-x-12 gap-y-8">
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <Skeleton width={110} height={12} />
          <Skeleton width="80%" height={76} rounded="rounded-lg" />
          <Skeleton width={180} height={14} />
        </div>
        <div className="col-span-12 lg:col-span-7">
          <Skeleton width="100%" height={220} rounded="rounded-2xl" />
        </div>
      </div>

      {/* Where your month stands — 2 columns */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 flex flex-col gap-3">
          <Skeleton width={90} height={12} />
          <Skeleton width={360} height={36} />
        </div>
        <div className="grid grid-cols-12 gap-x-12 gap-y-16">
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
            <Skeleton width="100%" height={200} rounded="rounded-2xl" />
            <Skeleton width="75%" height={14} />
            <Skeleton width="60%" height={14} />
          </div>
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
            <Skeleton width="100%" height={200} rounded="rounded-2xl" />
            <Skeleton width="75%" height={14} />
            <Skeleton width="60%" height={14} />
          </div>
        </div>
      </div>

      {/* Go deeper — 2 feature cards */}
      <div className="section-breath-lg hairline-top pt-16">
        <div className="mb-10 flex flex-col gap-3">
          <Skeleton width={120} height={12} />
          <Skeleton width={280} height={36} />
          <Skeleton width="55%" height={14} />
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <Skeleton width="100%" height={160} rounded="rounded-2xl" />
          </div>
          <div className="col-span-12 lg:col-span-6">
            <Skeleton width="100%" height={160} rounded="rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  );
}
