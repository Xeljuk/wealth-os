import type Database from "better-sqlite3";
import type { MonthlySnapshot } from "@/lib/types";

export interface SnapshotLogRow {
  id: number;
  user_id: number;
  period: string;
  closed_at: string;
  net_worth: number;
  total_inflow: number;
  total_fixed: number;
  total_variable: number;
  total_debt_service: number;
  allocatable_surplus: number;
}

let tableReady = false;

export function ensureSnapshotLogTable(db: Database.Database): void {
  if (tableReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_snapshot_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      closed_at TEXT NOT NULL,
      net_worth INTEGER NOT NULL,
      total_inflow INTEGER NOT NULL,
      total_fixed INTEGER NOT NULL,
      total_variable INTEGER NOT NULL,
      total_debt_service INTEGER NOT NULL,
      allocatable_surplus INTEGER NOT NULL,
      UNIQUE(user_id, period)
    );
    CREATE INDEX IF NOT EXISTS idx_msl_user_period
      ON monthly_snapshot_log (user_id, period DESC);
  `);
  tableReady = true;
}

export function recordMonthClose(
  db: Database.Database,
  snapshot: MonthlySnapshot,
  userId = 1,
): SnapshotLogRow {
  ensureSnapshotLogTable(db);
  const row = {
    user_id: userId,
    period: snapshot.period,
    closed_at: new Date().toISOString(),
    net_worth: Math.round(snapshot.balanceSheet.netWorth),
    total_inflow: Math.round(snapshot.cashFlow.totalInflow),
    total_fixed: Math.round(snapshot.cashFlow.totalFixed),
    total_variable: Math.round(snapshot.cashFlow.totalVariable),
    total_debt_service: Math.round(snapshot.cashFlow.totalDebtService),
    allocatable_surplus: Math.round(snapshot.cashFlow.allocatableSurplus),
  };
  db.prepare(
    `INSERT INTO monthly_snapshot_log
       (user_id, period, closed_at, net_worth, total_inflow,
        total_fixed, total_variable, total_debt_service, allocatable_surplus)
     VALUES
       (@user_id, @period, @closed_at, @net_worth, @total_inflow,
        @total_fixed, @total_variable, @total_debt_service, @allocatable_surplus)
     ON CONFLICT(user_id, period) DO UPDATE SET
       closed_at = excluded.closed_at,
       net_worth = excluded.net_worth,
       total_inflow = excluded.total_inflow,
       total_fixed = excluded.total_fixed,
       total_variable = excluded.total_variable,
       total_debt_service = excluded.total_debt_service,
       allocatable_surplus = excluded.allocatable_surplus`,
  ).run(row);
  return db
    .prepare(
      "SELECT * FROM monthly_snapshot_log WHERE user_id = ? AND period = ?",
    )
    .get(userId, snapshot.period) as SnapshotLogRow;
}

export function listSnapshotLog(
  db: Database.Database,
  userId = 1,
): SnapshotLogRow[] {
  ensureSnapshotLogTable(db);
  return db
    .prepare(
      "SELECT * FROM monthly_snapshot_log WHERE user_id = ? ORDER BY period DESC",
    )
    .all(userId) as SnapshotLogRow[];
}
