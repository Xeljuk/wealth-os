-- Seed data — parity with MOCK_SNAPSHOT in src/lib/mock-data.ts
-- Run after schema.sql (sqlite3 wealth-os.db < schema.sql && sqlite3 wealth-os.db < seed.sql)

BEGIN TRANSACTION;

INSERT INTO users (
  id, display_name, currency, currency_symbol, safety_buffer, operating_stance, snapshot_period
) VALUES (
  1, 'Emre', 'TRY', '₺', 15000, 'balanced', '2025-03'
);

INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES
  ('a1', 1, 'Checking & Savings', 'cash', 110000, '2025-03-15', 'immediate', NULL),
  ('a2', 1, 'Investment Portfolio', 'investment', 420000, '2025-03-15', 'short_term', 'Mix of funds and equities'),
  ('a3', 1, 'Primary Residence', 'property', 3500000, '2025-03-01', 'illiquid', NULL),
  ('a4', 1, 'Car', 'vehicle', 900000, '2025-03-01', 'illiquid', NULL);

INSERT INTO liabilities (id, user_id, name, category, balance, monthly_payment, apr, linked_asset_id, remaining_payments) VALUES
  ('l1', 1, 'Personal Loan', 'loan', 85000, 9500, 38, NULL, 10),
  ('l2', 1, 'Credit Card Installments', 'installment', 62000, 5500, NULL, NULL, 12),
  ('l3', 1, 'Credit Card Revolving', 'credit_card', 33000, 2000, 54, NULL, NULL);

INSERT INTO income_sources (id, user_id, name, amount, recurring) VALUES
  ('i1', 1, 'Salary', 78000, 1),
  ('i2', 1, 'Rental Income', 30000, 1);

INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES
  ('e1', 1, 'Rent & Utilities', 8500, 'fixed', 1),
  ('e2', 1, 'Insurance & Subscriptions', 4200, 'fixed', 1),
  ('e3', 1, 'Transport & Fuel', 5800, 'fixed', 1),
  ('e4', 1, 'Household & Maintenance', 5500, 'fixed', 1),
  ('e5', 1, 'Dining & Lifestyle', 9000, 'variable', 0),
  ('e6', 1, 'Shopping & Personal', 5500, 'variable', 0),
  ('e7', 1, 'Health & Misc', 4000, 'variable', 0),
  ('e8', 1, 'Personal Loan Payment', 9500, 'debt_service', 1),
  ('e9', 1, 'CC Installments', 5500, 'debt_service', 1),
  ('e10', 1, 'CC Minimum', 2000, 'debt_service', 1);

INSERT INTO goals (id, user_id, name, goal_type, target_amount, current_amount, target_date, priority, status_override) VALUES
  ('g1', 1, 'Second Property Down Payment', 'down_payment', 1200000, 280000, '2026-09', 1, 'at_risk'),
  ('g2', 1, 'Emergency Fund', 'emergency_fund', 300000, 110000, '2026-03', 2, 'tight'),
  ('g3', 1, 'Portfolio Growth', 'portfolio_growth', 600000, 420000, '2025-12', 3, 'on_track');

INSERT INTO net_worth_history (user_id, period, value) VALUES
  (1, '2024-10', 4480000),
  (1, '2024-11', 4530000),
  (1, '2024-12', 4590000),
  (1, '2025-01', 4640000),
  (1, '2025-02', 4698000),
  (1, '2025-03', 4750000);

INSERT INTO plan_variants (stance, debt_extra, goal_funding, investment_contribution, liquidity_reserve, headline, description) VALUES
  ('safe', 10000, 8500, 5000, 10000,
   'Protect liquidity, reduce debt pressure first',
   'Prioritizes accelerated debt paydown and cash buffer growth. Goal timelines stretch, but financial stress drops noticeably within 3–4 months.'),
  ('balanced', 5000, 13500, 10000, 5000,
   'Split surplus across debt, goals, and growth',
   'Balances debt reduction, down payment progress, and portfolio contributions. Moderate timeline risk on the primary goal, but preserves investment momentum.'),
  ('aggressive', 2000, 21500, 10000, 0,
   'Maximize goal funding and investment, accept tighter cash',
   'Channels most of the surplus toward the down payment and portfolio. Cash buffer stays thin; any income disruption would require immediate adjustment.');

INSERT INTO scenarios (id, user_id, name, description, scenario_type, parameters_json, result_json) VALUES
  ('s1', 1, 'Prioritize debt for 6 months', 'Redirect all discretionary allocation to accelerate debt payoff.', 'debt_vs_invest',
   '{"extraDebtMonthly":20000,"durationMonths":6}',
   '{"surplusImpact":-20000,"goalTimelineShift":"+4 months on down payment","debtPressureChange":-0.35,"netWorthProjection12m":4920000,"headline":"Debt clears faster; down payment slips one quarter.","tradeoffs":["Personal loan fully paid by month 9 instead of 10","Monthly debt service drops ₺9,500 after payoff","Down payment target shifts from Sep 2026 to Jan 2027"]}'),
  ('s2', 1, 'Buy second property in 12 months', 'Assess readiness for a ₺1.2M down payment by March 2026.', 'major_purchase',
   '{"downPayment":1200000,"targetMonth":12}',
   '{"surplusImpact":0,"goalTimelineShift":"Gap of ₺680,000 at current pace","debtPressureChange":0,"netWorthProjection12m":5100000,"headline":"Significant funding gap — requires either more aggressive saving or longer horizon.","tradeoffs":["Current pace funds ₺520K of ₺1.2M in 12 months","Closing the gap needs ₺56,700/mo — exceeds allocatable surplus","Extending to 24 months makes it feasible under balanced plan"]}'),
  ('s3', 1, 'Rental income drops 20%', 'Test resilience if rent falls from ₺30,000 to ₺24,000.', 'income_change',
   '{"incomeChange":-6000}',
   '{"surplusImpact":-6000,"goalTimelineShift":"+3 months on all goals","debtPressureChange":0.04,"netWorthProjection12m":4680000,"headline":"Manageable stress, but goal timelines slip and buffer shrinks.","tradeoffs":["Allocatable surplus drops from ₺33,500 to ₺27,500","Down payment timeline extends past target date","Emergency fund becomes higher priority to absorb risk"]}'),
  ('s4', 1, 'Cut discretionary spending 15%', 'Reduce variable expenses from ₺18,500 to ~₺15,700.', 'expense_reduction',
   '{"reductionPercent":15}',
   '{"surplusImpact":2775,"goalTimelineShift":"−1 month on down payment","debtPressureChange":-0.02,"netWorthProjection12m":4790000,"headline":"Small but real improvement — gains one month on primary goal.","tradeoffs":["Monthly surplus rises from ₺48,500 to ₺51,275","Lifestyle impact is moderate (dining, shopping)","Stacking with debt-first scenario amplifies effect"]}');

INSERT INTO insights (id, user_id, insight_type, text, sort_order) VALUES
  ('ins1', 1, 'attention', 'Debt service is 15.7% of income — reducing it would free ₺9,500/mo within 10 months.', 1),
  ('ins2', 1, 'attention', 'Primary goal needs ₺51,111/mo but only ₺33,500 is allocatable. Consider extending timeline or boosting contributions.', 2),
  ('ins3', 1, 'positive', 'Rental income covers 28% of total inflow, adding meaningful diversification beyond salary.', 3),
  ('ins4', 1, 'info', 'Liquid assets cover 1.8 months of total obligations. Recommended minimum is 3 months.', 4),
  ('ins5', 1, 'positive', 'Net worth grew ₺52,000 this month (+1.1%), driven by debt paydown and investment appreciation.', 5);

COMMIT;
