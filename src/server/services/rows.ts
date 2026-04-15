/** Raw SQLite row shapes (snake_case column names) */

export interface UserRow {
  id: number;
  display_name: string;
  currency: string;
  currency_symbol: string;
  safety_buffer: number;
  operating_stance: string;
  snapshot_period: string;
}

export interface AssetRow {
  id: string;
  name: string;
  category: string;
  value: number;
  as_of_date: string;
  liquidity_tier: string;
  note: string | null;
}

export interface LiabilityRow {
  id: string;
  name: string;
  category: string;
  balance: number;
  monthly_payment: number;
  apr: number | null;
  linked_asset_id: string | null;
  remaining_payments: number | null;
}

export interface IncomeRow {
  id: string;
  name: string;
  amount: number;
  recurring: number;
}

export interface ExpenseRow {
  id: string;
  name: string;
  amount: number;
  expense_type: string;
  recurring: number;
}

export interface GoalRow {
  id: string;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: number;
  status_override: string | null;
}

export interface NetWorthHistoryRow {
  period: string;
  value: number;
}

export interface PlanVariantRow {
  stance: string;
  debt_extra: number;
  goal_funding: number;
  investment_contribution: number;
  liquidity_reserve: number;
  headline: string;
  description: string;
}

export interface ScenarioRow {
  id: string;
  name: string;
  description: string;
  scenario_type: string;
  parameters_json: string;
  result_json: string;
}

export interface InsightRow {
  id: string;
  insight_type: string;
  text: string;
  sort_order: number;
}
