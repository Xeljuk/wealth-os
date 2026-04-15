import type { Goal, GoalStatus, GoalType } from "@/lib/types";
import type { GoalRow } from "./rows";

/**
 * Months from snapshot month (YYYY-MM) to target month (YYYY-MM), inclusive span
 * used by MOCK_SNAPSHOT: e.g. 2025-03 → 2026-09 = 18.
 */
export function monthsBetweenSnapshotAndTarget(
  snapshotPeriod: string,
  targetDate: string
): number {
  const [sy, sm] = snapshotPeriod.split("-").map(Number);
  const [ty, tm] = targetDate.split("-").map(Number);
  return (ty - sy) * 12 + (tm - sm);
}

/**
 * Remaining monthly savings pace: floor(remaining / months).
 * Matches mock: 920000/18 → 51111, 190000/12 → 15833, 180000/9 → 20000.
 */
export function computeMonthlyRequired(
  targetAmount: number,
  currentAmount: number,
  snapshotPeriod: string,
  targetDate: string
): number {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  const months = monthsBetweenSnapshotAndTarget(snapshotPeriod, targetDate);
  if (months <= 0) return 0;
  return Math.floor(remaining / months);
}

function mapGoalStatus(override: string | null): GoalStatus {
  if (
    override === "on_track" ||
    override === "tight" ||
    override === "at_risk"
  ) {
    return override;
  }
  return "on_track";
}

/**
 * Status: use `status_override` when set (parity with seeded MOCK_SNAPSHOT labels).
 * Monthly pace is always derived from amounts and dates.
 */
export function buildGoals(
  rows: GoalRow[],
  snapshotPeriod: string
): Goal[] {
  const sorted = [...rows].sort((a, b) => a.priority - b.priority);

  return sorted.map((row) => {
    const monthlyRequired = computeMonthlyRequired(
      row.target_amount,
      row.current_amount,
      snapshotPeriod,
      row.target_date
    );

    return {
      id: row.id,
      name: row.name,
      type: row.goal_type as GoalType,
      targetAmount: row.target_amount,
      currentAmount: row.current_amount,
      targetDate: row.target_date,
      monthlyRequired,
      status: mapGoalStatus(row.status_override),
      priority: row.priority,
    };
  });
}
