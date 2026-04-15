// ── Asset & Liability (Balance Sheet) ────────────────────────────

export type AssetCategory =
  | "cash"
  | "investment"
  | "property"
  | "vehicle"
  | "other";

export type LiquidityTier =
  | "immediate"
  | "short_term"
  | "long_term"
  | "illiquid";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  asOfDate: string;
  liquidityTier: LiquidityTier;
  note?: string;
}

export type LiabilityCategory =
  | "loan"
  | "credit_card"
  | "mortgage"
  | "installment"
  | "other";

export interface Liability {
  id: string;
  name: string;
  category: LiabilityCategory;
  balance: number;
  monthlyPayment: number;
  apr?: number;
  linkedAssetId?: string;
  remainingPayments?: number;
}

export interface BalanceSheet {
  assets: Asset[];
  liabilities: Liability[];
  netWorth: number;
  netWorthPrevious: number;
  liquidAssets: number;
  investedAssets: number;
  realAssets: number;
  totalLiabilities: number;
}

// ── Cash Flow (Monthly Operating Statement) ─────────────────────

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  recurring: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  type: "fixed" | "variable" | "debt_service";
  recurring: boolean;
}

export interface MonthlyCashFlow {
  period: string;
  totalInflow: number;
  totalFixed: number;
  totalVariable: number;
  totalDebtService: number;
  surplus: number;
  safetyBuffer: number;
  allocatableSurplus: number;
  incomes: IncomeSource[];
  expenses: ExpenseItem[];
}

// ── Goals ────────────────────────────────────────────────────────

export type GoalStatus = "on_track" | "tight" | "at_risk";

export type GoalType =
  | "emergency_fund"
  | "down_payment"
  | "car_purchase"
  | "portfolio_growth"
  | "debt_reduction"
  | "custom";

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyRequired: number;
  status: GoalStatus;
  priority: number;
}

// ── Scenarios ────────────────────────────────────────────────────

export type ScenarioType =
  | "debt_vs_invest"
  | "major_purchase"
  | "income_change"
  | "expense_reduction"
  | "aggressive_saving";

export interface ScenarioResult {
  surplusImpact: number;
  goalTimelineShift: string;
  debtPressureChange: number;
  netWorthProjection12m: number;
  headline: string;
  tradeoffs: string[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  parameters: Record<string, number | string>;
  result: ScenarioResult;
}

// ── Plan Variants ────────────────────────────────────────────────

export type PlanStance = "safe" | "balanced" | "aggressive";

export interface PlanVariant {
  stance: PlanStance;
  debtExtra: number;
  goalFunding: number;
  investmentContribution: number;
  liquidityReserve: number;
  headline: string;
  description: string;
}

// ── Net Worth History ────────────────────────────────────────────

export interface NetWorthPoint {
  period: string;
  value: number;
}

// ── Insights ─────────────────────────────────────────────────────

export type InsightType = "attention" | "positive" | "info";

export interface Insight {
  id: string;
  type: InsightType;
  text: string;
}

// ── User Profile ─────────────────────────────────────────────────

export interface UserProfile {
  name: string;
  currency: string;
  currencySymbol: string;
  operatingStance: PlanStance;
  safetyBuffer: number;
}

// ── Monthly Snapshot (top-level composite) ───────────────────────

export interface MonthlySnapshot {
  period: string;
  profile: UserProfile;
  balanceSheet: BalanceSheet;
  cashFlow: MonthlyCashFlow;
  goals: Goal[];
  plans: PlanVariant[];
  scenarios: Scenario[];
  netWorthHistory: NetWorthPoint[];
  insights: Insight[];
}
