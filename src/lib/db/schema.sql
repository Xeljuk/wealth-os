-- AI Wealth OS — SQLite schema (single-user prototype)
-- Parity target: MonthlySnapshot in src/lib/types.ts

PRAGMA foreign_keys = ON;

-- Exactly one row for V1 (id = 1)
CREATE TABLE users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  safety_buffer INTEGER NOT NULL,
  operating_stance TEXT NOT NULL CHECK (operating_stance IN ('safe', 'balanced', 'aggressive')),
  snapshot_period TEXT NOT NULL
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  value INTEGER NOT NULL,
  as_of_date TEXT NOT NULL,
  liquidity_tier TEXT NOT NULL,
  note TEXT
);

CREATE TABLE liabilities (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  balance INTEGER NOT NULL,
  monthly_payment INTEGER NOT NULL,
  apr INTEGER,
  linked_asset_id TEXT,
  remaining_payments INTEGER
);

CREATE TABLE income_sources (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  recurring INTEGER NOT NULL CHECK (recurring IN (0, 1))
);

CREATE TABLE expense_lines (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'variable', 'debt_service')),
  recurring INTEGER NOT NULL CHECK (recurring IN (0, 1))
);

-- monthly_required and status are derived in GoalMetricsService; optional overrides for tests
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL,
  target_date TEXT NOT NULL,
  priority INTEGER NOT NULL,
  status_override TEXT CHECK (status_override IS NULL OR status_override IN ('on_track', 'tight', 'at_risk'))
);

CREATE TABLE net_worth_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  value INTEGER NOT NULL,
  UNIQUE (user_id, period)
);

-- Global stance presets (same for all users in V1)
CREATE TABLE plan_variants (
  stance TEXT PRIMARY KEY CHECK (stance IN ('safe', 'balanced', 'aggressive')),
  debt_extra INTEGER NOT NULL,
  goal_funding INTEGER NOT NULL,
  investment_contribution INTEGER NOT NULL,
  liquidity_reserve INTEGER NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  result_json TEXT NOT NULL
);

CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('attention', 'positive', 'info')),
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_assets_user ON assets (user_id);
CREATE INDEX idx_liabilities_user ON liabilities (user_id);
CREATE INDEX idx_income_user ON income_sources (user_id);
CREATE INDEX idx_expense_user ON expense_lines (user_id);
CREATE INDEX idx_goals_user ON goals (user_id);
CREATE INDEX idx_nwh_user_period ON net_worth_history (user_id, period);
CREATE INDEX idx_scenarios_user ON scenarios (user_id);
CREATE INDEX idx_insights_user ON insights (user_id);
