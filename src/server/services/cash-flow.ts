import type { ExpenseItem, IncomeSource, MonthlyCashFlow } from "@/lib/types";
import type { ExpenseRow, IncomeRow } from "./rows";

function mapIncome(row: IncomeRow): IncomeSource {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    recurring: row.recurring === 1,
  };
}

function mapExpense(row: ExpenseRow): ExpenseItem {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.expense_type as ExpenseItem["type"],
    recurring: row.recurring === 1,
  };
}

export function buildCashFlow(
  incomes: IncomeRow[],
  expenses: ExpenseRow[],
  safetyBuffer: number,
  period: string
): MonthlyCashFlow {
  const totalInflow = incomes.reduce((s, i) => s + i.amount, 0);
  const totalFixed = expenses
    .filter((e) => e.expense_type === "fixed")
    .reduce((s, e) => s + e.amount, 0);
  const totalVariable = expenses
    .filter((e) => e.expense_type === "variable")
    .reduce((s, e) => s + e.amount, 0);
  const totalDebtService = expenses
    .filter((e) => e.expense_type === "debt_service")
    .reduce((s, e) => s + e.amount, 0);

  const surplus =
    totalInflow - totalFixed - totalVariable - totalDebtService;
  const allocatableSurplus = surplus - safetyBuffer;

  return {
    period,
    totalInflow,
    totalFixed,
    totalVariable,
    totalDebtService,
    surplus,
    safetyBuffer,
    allocatableSurplus,
    incomes: incomes.map(mapIncome),
    expenses: expenses.map(mapExpense),
  };
}
