/**
 * SnapshotBuilder — design contract (implementation in a later phase)
 *
 * Goal: produce `MonthlySnapshot` (see `src/lib/types.ts`) from DB rows with the same
 * numbers as `MOCK_SNAPSHOT` for parity tests.
 *
 * ── Pipeline order ─────────────────────────────────────────────
 *
 * 1. Load raw rows for `user_id = 1` + global `plan_variants`.
 * 2. BalanceSheetService.build(rows) → BalanceSheet
 *    - Sum assets by category/tier → liquidAssets, investedAssets, realAssets
 *      (rules must match current UI: cash → liquid; investment → invested;
 *       property + vehicle → realAssets)
 *    - totalLiabilities = sum(liability.balance)
 *    - netWorth = sum(asset.value) - totalLiabilities
 *    - netWorthPrevious: value for `snapshot_period` minus 1 month from `net_worth_history`,
 *      or previous row in ordered history
 * 3. CashFlowService.build(incomes, expenses, profile.safety_buffer, period)
 *    - totalInflow = sum(incomes)
 *    - totalFixed / totalVariable / totalDebtService from expense_lines by expense_type
 *    - surplus = totalInflow - totalFixed - totalVariable - totalDebtService
 *    - allocatableSurplus = surplus - safetyBuffer
 * 4. GoalMetricsService.build(goals[], cashFlow.allocatableSurplus, snapshot_period)
 *    - monthlyRequired: ceil((targetAmount - currentAmount) / monthsRemaining)
 *      where monthsRemaining from targetDate month − snapshot month (match mock formulas)
 *    - status: rule-based (pace vs required) OR match mock rules — must match MOCK for g1/g2/g3
 * 5. Map `plan_variants` rows → plans[] (PlanVariant[])
 * 6. Map `scenarios` JSON → Scenario[]
 * 7. Map `net_worth_history` → NetWorthPoint[] (sorted by period)
 * 8. Map `insights` → Insight[] (sorted by sort_order)
 * 9. profile: from users row (name = display_name, operatingStance = operating_stance, etc.)
 *
 * ── GET /api/snapshot — implementation plan (next phase) ────────
 *
 * - Add Route Handler: `src/app/api/snapshot/route.ts` (App Router)
 * - Server-only: open SQLite (e.g. `better-sqlite3`), path via env `DATABASE_PATH` or
 *   `process.cwd()/wealth-os.db`
 * - Run query helpers → SnapshotBuilder.build() → `NextResponse.json(snapshot)`
 * - No auth; single user
 * - Optional query `?period=` deferred until multi-period DB support
 *
 * ── Not in this phase ──────────────────────────────────────────
 *
 * - PUT /api/profile/stance
 * - Manual CRUD for entities
 * - Frontend switch from MOCK_SNAPSHOT
 */

export type SnapshotBuilderPhase = "design-only";
