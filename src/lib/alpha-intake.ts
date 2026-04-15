export interface AlphaGoalInput {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  priority: number;
}

export interface AlphaCustomIntakeInput {
  monthlyEngine: {
    salary: number;
    otherRecurringIncome: number;
    fixedExpenses: number;
    variableExpenses: number;
    debtService: number;
    safetyBuffer: number;
  };
  balanceSheet: {
    cash: number;
    investments: number;
    property: number;
    vehicle: number;
  };
  liabilities: {
    installmentLiabilities: number;
    revolvingLiabilities: number;
  };
  goals: AlphaGoalInput[];
}

export type AlphaIntakePayload =
  | { mode: "demo" }
  | { mode: "custom"; data: AlphaCustomIntakeInput };
