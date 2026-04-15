"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { MOCK_SNAPSHOT } from "./mock-data";
import type { MonthlySnapshot, PlanStance, PlanVariant, Goal } from "./types";

type PlanAllocationField = keyof Pick<
  PlanVariant,
  "goalFunding" | "liquidityReserve" | "investmentContribution"
>;

const FUNDING_SLOTS: { field: PlanAllocationField; source: string }[] = [
  { field: "goalFunding", source: "Goal funding" },
  { field: "liquidityReserve", source: "Liquidity reserve" },
  { field: "investmentContribution", source: "Investment contribution" },
];

export interface GoalTrajectory extends Goal {
  remaining: number;
  allocation: number;
  allocationSource: string;
  projectedMonths: number;
  paceRatio: number;
}

export interface AlphaStatus {
  hasIncome: boolean;
  hasAssets: boolean;
  hasLiabilities: boolean;
  hasGoals: boolean;
  hasCustomData: boolean;
  isDemoMode: boolean;
  missing: string[];
}

export interface WealthState {
  snapshot: MonthlySnapshot;
  isLoading: boolean;
  error: string | null;
  snapshotSource: "api" | "fallback";
  stancePersistError: string | null;
  currentStance: PlanStance;
  setStance: (stance: PlanStance) => void;
  refreshSnapshot: () => Promise<void>;
  alphaStatus: AlphaStatus;
  activePlan: PlanVariant;
  goalTrajectories: GoalTrajectory[];
  totalGoalRequired: number;
  overcommitRatio: number;
}

const WealthContext = createContext<WealthState | null>(null);

const DEFAULT_ALPHA_STATUS: AlphaStatus = {
  hasIncome: true,
  hasAssets: true,
  hasLiabilities: true,
  hasGoals: true,
  hasCustomData: false,
  isDemoMode: true,
  missing: [],
};

export function WealthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<MonthlySnapshot>(MOCK_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotSource, setSnapshotSource] = useState<"api" | "fallback">(
    "fallback"
  );
  const [stancePersistError, setStancePersistError] = useState<string | null>(
    null
  );
  const [currentStance, setStance] = useState<PlanStance>(
    MOCK_SNAPSHOT.profile.operatingStance
  );
  const [alphaStatus, setAlphaStatus] = useState<AlphaStatus>(
    DEFAULT_ALPHA_STATUS
  );

  const stanceSeqRef = useRef(0);
  const currentStanceRef = useRef<PlanStance>(
    MOCK_SNAPSHOT.profile.operatingStance
  );

  useEffect(() => {
    currentStanceRef.current = currentStance;
  }, [currentStance]);

  const refreshSnapshot = useCallback(async () => {
    try {
      const [snapshotRes, statusRes] = await Promise.all([
        fetch("/api/snapshot", { cache: "no-store" }),
        fetch("/api/alpha/status", { cache: "no-store" }),
      ]);
      if (!snapshotRes.ok) {
        const text = await snapshotRes.text();
        throw new Error(text || `HTTP ${snapshotRes.status}`);
      }
      const data = (await snapshotRes.json()) as MonthlySnapshot;
      setSnapshot(data);
      setSnapshotSource("api");
      setError(null);
      setStance(data.profile.operatingStance);
      currentStanceRef.current = data.profile.operatingStance;
      setStancePersistError(null);

      if (statusRes.ok) {
        const status = (await statusRes.json()) as AlphaStatus;
        setAlphaStatus(status);
      } else {
        setAlphaStatus({
          hasIncome: data.cashFlow.totalInflow > 0,
          hasAssets: data.balanceSheet.assets.length > 0,
          hasLiabilities: data.balanceSheet.liabilities.length > 0,
          hasGoals: data.goals.length > 0,
          hasCustomData: false,
          isDemoMode: true,
          missing: [],
        });
      }
    } catch (e) {
      setSnapshot(MOCK_SNAPSHOT);
      setSnapshotSource("fallback");
      setError(e instanceof Error ? e.message : "Failed to load snapshot");
      setAlphaStatus(DEFAULT_ALPHA_STATUS);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snapshotRes, statusRes] = await Promise.all([
          fetch("/api/snapshot", { cache: "no-store" }),
          fetch("/api/alpha/status", { cache: "no-store" }),
        ]);
        if (!snapshotRes.ok) {
          const text = await snapshotRes.text();
          throw new Error(text || `HTTP ${snapshotRes.status}`);
        }
        const data = (await snapshotRes.json()) as MonthlySnapshot;
        if (cancelled) return;
        setSnapshot(data);
        setSnapshotSource("api");
        setError(null);
        setStance(data.profile.operatingStance);
        currentStanceRef.current = data.profile.operatingStance;
        setStancePersistError(null);
        if (statusRes.ok) {
          const status = (await statusRes.json()) as AlphaStatus;
          if (cancelled) return;
          setAlphaStatus(status);
        }
      } catch (e) {
        if (cancelled) return;
        setSnapshot(MOCK_SNAPSHOT);
        setSnapshotSource("fallback");
        setError(e instanceof Error ? e.message : "Failed to load snapshot");
        setAlphaStatus(DEFAULT_ALPHA_STATUS);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistStance = useCallback((next: PlanStance) => {
    const prev = currentStanceRef.current;
    if (next === prev) return;

    const mySeq = ++stanceSeqRef.current;

    setStance(next);
    currentStanceRef.current = next;
    setSnapshot((s) => ({
      ...s,
      profile: { ...s.profile, operatingStance: next },
    }));
    setStancePersistError(null);

    void (async () => {
      try {
        const res = await fetch("/api/profile/stance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stance: next }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        if (mySeq !== stanceSeqRef.current) return;
        setStancePersistError(null);
      } catch {
        if (mySeq !== stanceSeqRef.current) return;
        setStance(prev);
        currentStanceRef.current = prev;
        setSnapshot((s) => ({
          ...s,
          profile: { ...s.profile, operatingStance: prev },
        }));
        setStancePersistError(
          "Operating stance could not be saved. Your previous choice was restored."
        );
      }
    })();
  }, []);

  const derived = useMemo(() => {
    const { goals, plans, cashFlow } = snapshot;
    const activePlan =
      plans.find((p) => p.stance === currentStance) ?? plans[0]!;

    const totalGoalRequired = goals.reduce((s, g) => s + g.monthlyRequired, 0);
    const overcommitRatio =
      cashFlow.allocatableSurplus > 0
        ? totalGoalRequired / cashFlow.allocatableSurplus
        : 0;

    const sortedByPriority = [...goals].sort((a, b) => a.priority - b.priority);
    const slotByGoalId = new Map<string, (typeof FUNDING_SLOTS)[number]>();
    sortedByPriority.forEach((g, idx) => {
      const slot = FUNDING_SLOTS[idx] ?? FUNDING_SLOTS[0]!;
      slotByGoalId.set(g.id, slot);
    });

    const goalTrajectories: GoalTrajectory[] = goals.map((g) => {
      const mapping = slotByGoalId.get(g.id) ?? FUNDING_SLOTS[0]!;
      const allocation = activePlan[mapping.field];
      const allocationSource = mapping.source;
      const remaining = g.targetAmount - g.currentAmount;
      const projectedMonths =
        allocation > 0 ? Math.ceil(remaining / allocation) : 999;
      const paceRatio =
        g.monthlyRequired > 0 ? allocation / g.monthlyRequired : 0;

      return {
        ...g,
        remaining,
        allocation,
        allocationSource,
        projectedMonths,
        paceRatio,
      };
    });

    return { activePlan, goalTrajectories, overcommitRatio, totalGoalRequired };
  }, [currentStance, snapshot]);

  const value: WealthState = {
    snapshot,
    isLoading,
    error,
    snapshotSource,
    stancePersistError,
    currentStance,
    setStance: persistStance,
    refreshSnapshot,
    alphaStatus,
    ...derived,
  };

  const showSnapshotBanner = Boolean(error && snapshotSource === "fallback");

  return (
    <WealthContext.Provider value={value}>
      {children}
      {(stancePersistError || showSnapshotBanner) && (
        <div
          className="fixed bottom-0 left-64 right-0 z-40 flex flex-col"
          role="status"
        >
          {stancePersistError && (
            <div
              className="px-6 py-2 text-center text-[11px] font-medium"
              style={{
                backgroundColor: "var(--color-negative-light)",
                color: "var(--color-negative)",
              }}
            >
              {stancePersistError}
            </div>
          )}
          {showSnapshotBanner && (
            <div
              className="px-6 py-2 text-center text-[11px] font-medium"
              style={{
                backgroundColor: "var(--color-warning-light)",
                color: "var(--color-warning)",
              }}
            >
              Snapshot unavailable — showing demo data.{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {error}
              </span>
            </div>
          )}
        </div>
      )}
    </WealthContext.Provider>
  );
}

export function useWealth(): WealthState {
  const ctx = useContext(WealthContext);
  if (!ctx) {
    throw new Error("useWealth must be used within a WealthProvider");
  }
  return ctx;
}
