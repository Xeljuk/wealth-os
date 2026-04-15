import type Database from "better-sqlite3";
import type { MonthlySnapshot, Scenario, ScenarioResult } from "@/lib/types";
import { buildBalanceSheet } from "./balance-sheet";
import { buildCashFlow } from "./cash-flow";
import { buildGoals } from "./goal-metrics";
import type {
  AssetRow,
  ExpenseRow,
  GoalRow,
  IncomeRow,
  InsightRow,
  LiabilityRow,
  PlanVariantRow,
  ScenarioRow,
  UserRow,
} from "./rows";

function loadUser(db: Database.Database, userId: number): UserRow {
  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
  if (!row) {
    throw new Error(`User ${userId} not found. Run schema.sql and seed.sql.`);
  }
  return row;
}

function loadRows<T>(db: Database.Database, sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

function parseScenario(row: ScenarioRow): Scenario {
  const parameters = JSON.parse(row.parameters_json) as Record<
    string,
    number | string
  >;
  const resultRaw = JSON.parse(row.result_json) as ScenarioResult;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.scenario_type as Scenario["type"],
    parameters,
    result: resultRaw,
  };
}

const PLAN_ORDER_SQL = `
  SELECT * FROM plan_variants
  ORDER BY CASE stance
    WHEN 'safe' THEN 1
    WHEN 'balanced' THEN 2
    WHEN 'aggressive' THEN 3
    ELSE 4
  END
`;

/**
 * Builds the full MonthlySnapshot for the single prototype user from SQLite.
 */
export function buildMonthlySnapshot(
  db: Database.Database,
  userId: number = 1
): MonthlySnapshot {
  const user = loadUser(db, userId);

  const assets = loadRows<AssetRow>(
    db,
    "SELECT * FROM assets WHERE user_id = ? ORDER BY id",
    userId
  );
  const liabilities = loadRows<LiabilityRow>(
    db,
    "SELECT * FROM liabilities WHERE user_id = ? ORDER BY id",
    userId
  );
  const incomes = loadRows<IncomeRow>(
    db,
    "SELECT * FROM income_sources WHERE user_id = ? ORDER BY id",
    userId
  );
  const expenses = loadRows<ExpenseRow>(
    db,
    `SELECT * FROM expense_lines WHERE user_id = ?
     ORDER BY CAST(substr(id, 2) AS INTEGER)`,
    userId
  );
  const goalRows = loadRows<GoalRow>(
    db,
    "SELECT * FROM goals WHERE user_id = ? ORDER BY priority",
    userId
  );
  const nwhRows = loadRows<{ period: string; value: number }>(
    db,
    "SELECT period, value FROM net_worth_history WHERE user_id = ? ORDER BY period",
    userId
  );

  const snapshotPeriod = user.snapshot_period;

  const balanceSheet = buildBalanceSheet(
    assets,
    liabilities,
    nwhRows,
    snapshotPeriod
  );

  const cashFlow = buildCashFlow(
    incomes,
    expenses,
    user.safety_buffer,
    snapshotPeriod
  );

  const goals = buildGoals(goalRows, snapshotPeriod);

  const planRows = db.prepare(PLAN_ORDER_SQL).all() as PlanVariantRow[];
  const plans = planRows.map((p) => ({
    stance: p.stance as MonthlySnapshot["plans"][0]["stance"],
    debtExtra: p.debt_extra,
    goalFunding: p.goal_funding,
    investmentContribution: p.investment_contribution,
    liquidityReserve: p.liquidity_reserve,
    headline: p.headline,
    description: p.description,
  }));

  const scenarioRows = loadRows<ScenarioRow>(
    db,
    "SELECT * FROM scenarios WHERE user_id = ? ORDER BY id",
    userId
  );
  const scenarios: Scenario[] = scenarioRows.map(parseScenario);

  const netWorthHistory = nwhRows.map((r) => ({
    period: r.period,
    value: r.value,
  }));

  const insightRows = loadRows<InsightRow>(
    db,
    "SELECT * FROM insights WHERE user_id = ? ORDER BY sort_order",
    userId
  );
  const insights = insightRows.map((r) => ({
    id: r.id,
    type: r.insight_type as MonthlySnapshot["insights"][0]["type"],
    text: r.text,
  }));

  return {
    period: snapshotPeriod,
    profile: {
      name: user.display_name,
      currency: user.currency,
      currencySymbol: user.currency_symbol,
      operatingStance: user.operating_stance as MonthlySnapshot["profile"]["operatingStance"],
      safetyBuffer: user.safety_buffer,
    },
    balanceSheet,
    cashFlow,
    goals,
    plans,
    scenarios,
    netWorthHistory,
    insights,
  };
}
