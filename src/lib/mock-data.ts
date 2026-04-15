import type { MonthlySnapshot } from "./types";

/**
 * Single realistic mock user — salaried professional in Turkey.
 *
 * Income:  78 000 salary + 30 000 rent = 108 000 TL/mo
 * Outflow: 24 000 fixed + 18 500 variable + 17 000 debt = 59 500 TL/mo
 * Surplus: 48 500 TL before allocation
 *
 * Net worth: 4 930 000 assets − 180 000 liabilities = 4 750 000 TL
 */
export const MOCK_SNAPSHOT: MonthlySnapshot = {
  period: "2025-03",

  profile: {
    name: "Emre",
    currency: "TRY",
    currencySymbol: "₺",
    operatingStance: "balanced",
    safetyBuffer: 15_000,
  },

  // ── Balance Sheet ───────────────────────────────────────────
  balanceSheet: {
    assets: [
      {
        id: "a1",
        name: "Checking & Savings",
        category: "cash",
        value: 110_000,
        asOfDate: "2025-03-15",
        liquidityTier: "immediate",
      },
      {
        id: "a2",
        name: "Investment Portfolio",
        category: "investment",
        value: 420_000,
        asOfDate: "2025-03-15",
        liquidityTier: "short_term",
        note: "Mix of funds and equities",
      },
      {
        id: "a3",
        name: "Primary Residence",
        category: "property",
        value: 3_500_000,
        asOfDate: "2025-03-01",
        liquidityTier: "illiquid",
      },
      {
        id: "a4",
        name: "Car",
        category: "vehicle",
        value: 900_000,
        asOfDate: "2025-03-01",
        liquidityTier: "illiquid",
      },
    ],
    liabilities: [
      {
        id: "l1",
        name: "Personal Loan",
        category: "loan",
        balance: 85_000,
        monthlyPayment: 9_500,
        apr: 38,
        remainingPayments: 10,
      },
      {
        id: "l2",
        name: "Credit Card Installments",
        category: "installment",
        balance: 62_000,
        monthlyPayment: 5_500,
        remainingPayments: 12,
      },
      {
        id: "l3",
        name: "Credit Card Revolving",
        category: "credit_card",
        balance: 33_000,
        monthlyPayment: 2_000,
        apr: 54,
      },
    ],
    netWorth: 4_750_000,
    netWorthPrevious: 4_698_000,
    liquidAssets: 110_000,
    investedAssets: 420_000,
    realAssets: 4_400_000,
    totalLiabilities: 180_000,
  },

  // ── Cash Flow (March 2025) ──────────────────────────────────
  cashFlow: {
    period: "2025-03",
    totalInflow: 108_000,
    totalFixed: 24_000,
    totalVariable: 18_500,
    totalDebtService: 17_000,
    surplus: 48_500,
    safetyBuffer: 15_000,
    allocatableSurplus: 33_500,
    incomes: [
      { id: "i1", name: "Salary", amount: 78_000, recurring: true },
      { id: "i2", name: "Rental Income", amount: 30_000, recurring: true },
    ],
    expenses: [
      { id: "e1", name: "Rent & Utilities", amount: 8_500, type: "fixed", recurring: true },
      { id: "e2", name: "Insurance & Subscriptions", amount: 4_200, type: "fixed", recurring: true },
      { id: "e3", name: "Transport & Fuel", amount: 5_800, type: "fixed", recurring: true },
      { id: "e4", name: "Household & Maintenance", amount: 5_500, type: "fixed", recurring: true },
      { id: "e5", name: "Dining & Lifestyle", amount: 9_000, type: "variable", recurring: false },
      { id: "e6", name: "Shopping & Personal", amount: 5_500, type: "variable", recurring: false },
      { id: "e7", name: "Health & Misc", amount: 4_000, type: "variable", recurring: false },
      { id: "e8", name: "Personal Loan Payment", amount: 9_500, type: "debt_service", recurring: true },
      { id: "e9", name: "CC Installments", amount: 5_500, type: "debt_service", recurring: true },
      { id: "e10", name: "CC Minimum", amount: 2_000, type: "debt_service", recurring: true },
    ],
  },

  // ── Goals ───────────────────────────────────────────────────
  goals: [
    {
      id: "g1",
      name: "Second Property Down Payment",
      type: "down_payment",
      targetAmount: 1_200_000,
      currentAmount: 280_000,
      targetDate: "2026-09",
      monthlyRequired: 51_111,
      status: "at_risk",
      priority: 1,
    },
    {
      id: "g2",
      name: "Emergency Fund",
      type: "emergency_fund",
      targetAmount: 300_000,
      currentAmount: 110_000,
      targetDate: "2026-03",
      monthlyRequired: 15_833,
      status: "tight",
      priority: 2,
    },
    {
      id: "g3",
      name: "Portfolio Growth",
      type: "portfolio_growth",
      targetAmount: 600_000,
      currentAmount: 420_000,
      targetDate: "2025-12",
      monthlyRequired: 20_000,
      status: "on_track",
      priority: 3,
    },
  ],

  // ── Plan Variants ───────────────────────────────────────────
  plans: [
    {
      stance: "safe",
      debtExtra: 10_000,
      goalFunding: 8_500,
      investmentContribution: 5_000,
      liquidityReserve: 10_000,
      headline: "Protect liquidity, reduce debt pressure first",
      description:
        "Prioritizes accelerated debt paydown and cash buffer growth. Goal timelines stretch, but financial stress drops noticeably within 3–4 months.",
    },
    {
      stance: "balanced",
      debtExtra: 5_000,
      goalFunding: 13_500,
      investmentContribution: 10_000,
      liquidityReserve: 5_000,
      headline: "Split surplus across debt, goals, and growth",
      description:
        "Balances debt reduction, down payment progress, and portfolio contributions. Moderate timeline risk on the primary goal, but preserves investment momentum.",
    },
    {
      stance: "aggressive",
      debtExtra: 2_000,
      goalFunding: 21_500,
      investmentContribution: 10_000,
      liquidityReserve: 0,
      headline: "Maximize goal funding and investment, accept tighter cash",
      description:
        "Channels most of the surplus toward the down payment and portfolio. Cash buffer stays thin; any income disruption would require immediate adjustment.",
    },
  ],

  // ── Scenarios ───────────────────────────────────────────────
  scenarios: [
    {
      id: "s1",
      name: "Prioritize debt for 6 months",
      description: "Redirect all discretionary allocation to accelerate debt payoff.",
      type: "debt_vs_invest",
      parameters: { extraDebtMonthly: 20_000, durationMonths: 6 },
      result: {
        surplusImpact: -20_000,
        goalTimelineShift: "+4 months on down payment",
        debtPressureChange: -0.35,
        netWorthProjection12m: 4_920_000,
        headline: "Debt clears faster; down payment slips one quarter.",
        tradeoffs: [
          "Personal loan fully paid by month 9 instead of 10",
          "Monthly debt service drops ₺9,500 after payoff",
          "Down payment target shifts from Sep 2026 to Jan 2027",
        ],
      },
    },
    {
      id: "s2",
      name: "Buy second property in 12 months",
      description: "Assess readiness for a ₺1.2M down payment by March 2026.",
      type: "major_purchase",
      parameters: { downPayment: 1_200_000, targetMonth: 12 },
      result: {
        surplusImpact: 0,
        goalTimelineShift: "Gap of ₺680,000 at current pace",
        debtPressureChange: 0,
        netWorthProjection12m: 5_100_000,
        headline: "Significant funding gap — requires either more aggressive saving or longer horizon.",
        tradeoffs: [
          "Current pace funds ₺520K of ₺1.2M in 12 months",
          "Closing the gap needs ₺56,700/mo — exceeds allocatable surplus",
          "Extending to 24 months makes it feasible under balanced plan",
        ],
      },
    },
    {
      id: "s3",
      name: "Rental income drops 20%",
      description: "Test resilience if rent falls from ₺30,000 to ₺24,000.",
      type: "income_change",
      parameters: { incomeChange: -6_000 },
      result: {
        surplusImpact: -6_000,
        goalTimelineShift: "+3 months on all goals",
        debtPressureChange: 0.04,
        netWorthProjection12m: 4_680_000,
        headline: "Manageable stress, but goal timelines slip and buffer shrinks.",
        tradeoffs: [
          "Allocatable surplus drops from ₺33,500 to ₺27,500",
          "Down payment timeline extends past target date",
          "Emergency fund becomes higher priority to absorb risk",
        ],
      },
    },
    {
      id: "s4",
      name: "Cut discretionary spending 15%",
      description: "Reduce variable expenses from ₺18,500 to ~₺15,700.",
      type: "expense_reduction",
      parameters: { reductionPercent: 15 },
      result: {
        surplusImpact: 2_775,
        goalTimelineShift: "−1 month on down payment",
        debtPressureChange: -0.02,
        netWorthProjection12m: 4_790_000,
        headline: "Small but real improvement — gains one month on primary goal.",
        tradeoffs: [
          "Monthly surplus rises from ₺48,500 to ₺51,275",
          "Lifestyle impact is moderate (dining, shopping)",
          "Stacking with debt-first scenario amplifies effect",
        ],
      },
    },
  ],

  // ── Net Worth History (6 months) ────────────────────────────────
  netWorthHistory: [
    { period: "2024-10", value: 4_480_000 },
    { period: "2024-11", value: 4_530_000 },
    { period: "2024-12", value: 4_590_000 },
    { period: "2025-01", value: 4_640_000 },
    { period: "2025-02", value: 4_698_000 },
    { period: "2025-03", value: 4_750_000 },
  ],

  // ── Insights ────────────────────────────────────────────────────
  insights: [
    {
      id: "ins1",
      type: "attention",
      text: "Debt service is 15.7% of income — reducing it would free ₺9,500/mo within 10 months.",
    },
    {
      id: "ins2",
      type: "attention",
      text: "Primary goal needs ₺51,111/mo but only ₺33,500 is allocatable. Consider extending timeline or boosting contributions.",
    },
    {
      id: "ins3",
      type: "positive",
      text: "Rental income covers 28% of total inflow, adding meaningful diversification beyond salary.",
    },
    {
      id: "ins4",
      type: "info",
      text: "Liquid assets cover 1.8 months of total obligations. Recommended minimum is 3 months.",
    },
    {
      id: "ins5",
      type: "positive",
      text: "Net worth grew ₺52,000 this month (+1.1%), driven by debt paydown and investment appreciation.",
    },
  ],
};
