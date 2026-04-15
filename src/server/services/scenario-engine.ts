import type { MonthlySnapshot, ScenarioResult, ScenarioType } from "@/lib/types";

/**
 * Scenario computation engine.
 *
 * Each scenario type takes a set of numeric parameters and the current
 * MonthlySnapshot context, then returns a computed ScenarioResult. The
 * engine is pure: same input → same output, no DB access, no I/O.
 *
 * Formulas are intentionally simple and directional — these are planning
 * previews, not financial-grade projections.
 */

export type ScenarioParameters = Record<string, number>;

export interface ScenarioInput {
  type: ScenarioType;
  parameters: ScenarioParameters;
}

const MIN_NW_FLOOR = 0;

// ── Type definitions for parameter shapes ───────────────────────────
// Each type documents which keys are expected on `parameters`.

const PARAM_SHAPES: Record<ScenarioType, readonly string[]> = {
  debt_vs_invest: ["extraDebtMonthly", "durationMonths"],
  major_purchase: ["downPayment", "targetMonths"],
  income_change: ["incomeChange"],
  expense_reduction: ["reductionPercent", "category"],
  aggressive_saving: ["extraMonthly"],
};

// `category` is a string in expense_reduction, but we store it as a numeric
// enum to keep the parameters map uniform: 0 = variable, 1 = fixed.
export const EXPENSE_CATEGORY: Record<string, number> = {
  variable: 0,
  fixed: 1,
};

// ── Validation ───────────────────────────────────────────────────────

export function validateScenarioInput(
  input: ScenarioInput,
): { ok: true } | { ok: false; message: string } {
  const shape = PARAM_SHAPES[input.type];
  if (!shape) return { ok: false, message: `Unknown scenario type: ${input.type}` };

  for (const key of shape) {
    const val = input.parameters[key];
    if (val === undefined || val === null) {
      return { ok: false, message: `Missing parameter: ${key}` };
    }
    if (typeof val !== "number" || !Number.isFinite(val)) {
      return { ok: false, message: `Parameter ${key} must be a finite number` };
    }
  }
  return { ok: true };
}

// ── Engine ───────────────────────────────────────────────────────────

export function computeScenarioResult(
  input: ScenarioInput,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  switch (input.type) {
    case "debt_vs_invest":
      return computeDebtVsInvest(input.parameters, snapshot);
    case "major_purchase":
      return computeMajorPurchase(input.parameters, snapshot);
    case "income_change":
      return computeIncomeChange(input.parameters, snapshot);
    case "expense_reduction":
      return computeExpenseReduction(input.parameters, snapshot);
    case "aggressive_saving":
      return computeAggressiveSaving(input.parameters, snapshot);
  }
}

// ── Individual formulas ──────────────────────────────────────────────

function computeDebtVsInvest(
  params: ScenarioParameters,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  const extraDebtMonthly = params.extraDebtMonthly ?? 0;
  const durationMonths = Math.max(1, params.durationMonths ?? 6);
  const cf = snapshot.cashFlow;
  const bs = snapshot.balanceSheet;

  const totalLiabilities = bs.totalLiabilities;
  const baseDebtService = cf.totalDebtService;
  const acceleratedDebtService = baseDebtService + extraDebtMonthly;

  const monthsToClearBase =
    baseDebtService > 0 ? Math.ceil(totalLiabilities / baseDebtService) : 999;
  const monthsToClearAccel =
    acceleratedDebtService > 0
      ? Math.ceil(totalLiabilities / acceleratedDebtService)
      : 999;
  const monthsSaved = Math.max(0, monthsToClearBase - monthsToClearAccel);

  const surplusImpact = -extraDebtMonthly;
  const newDebtRatio =
    cf.totalInflow > 0 ? acceleratedDebtService / cf.totalInflow : 0;
  const oldDebtRatio =
    cf.totalInflow > 0 ? baseDebtService / cf.totalInflow : 0;
  const debtPressureChange = newDebtRatio - oldDebtRatio;

  // After duration, goal allocation is impaired by extraDebtMonthly × duration
  const goalSlipMonths = Math.round(
    (extraDebtMonthly * durationMonths) / Math.max(cf.allocatableSurplus, 1),
  );

  const nw = bs.netWorth;
  const netWorthProjection12m = Math.max(
    MIN_NW_FLOOR,
    nw +
      (cf.allocatableSurplus - extraDebtMonthly) * 12 +
      monthsSaved * baseDebtService,
  );

  return {
    surplusImpact,
    goalTimelineShift: `+${goalSlipMonths} months on goals, −${monthsSaved} months on debt`,
    debtPressureChange,
    netWorthProjection12m,
    headline:
      monthsSaved > 0
        ? `Debt clears ${monthsSaved} month${monthsSaved > 1 ? "s" : ""} earlier; goals temporarily slow.`
        : "Minimal impact — debt service already near optimal.",
    tradeoffs: [
      `Extra ${fmt(extraDebtMonthly)}/mo toward debt for ${durationMonths} months`,
      `Total debt cleared in ~${monthsToClearAccel} months (baseline ${monthsToClearBase})`,
      `Goal allocation drops by ${fmt(extraDebtMonthly)}/mo during the sprint`,
      `After payoff, ${fmt(baseDebtService)}/mo of freed capacity returns to goals`,
    ],
  };
}

function computeMajorPurchase(
  params: ScenarioParameters,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  const downPayment = params.downPayment ?? 0;
  const targetMonths = Math.max(1, params.targetMonths ?? 12);
  const cf = snapshot.cashFlow;
  const bs = snapshot.balanceSheet;

  const requiredMonthly = downPayment / targetMonths;
  const currentCapacity = cf.allocatableSurplus;
  const shortfall = Math.max(0, requiredMonthly - currentCapacity);
  const feasibleMonths =
    currentCapacity > 0 ? Math.ceil(downPayment / currentCapacity) : 999;
  const gap = Math.max(0, downPayment - currentCapacity * targetMonths);

  const netWorthProjection12m = Math.max(
    MIN_NW_FLOOR,
    bs.netWorth + cf.allocatableSurplus * 12,
  );

  return {
    surplusImpact: 0,
    goalTimelineShift:
      shortfall > 0
        ? `Feasible in ~${feasibleMonths} months instead of ${targetMonths}`
        : `On track for ${targetMonths}-month target`,
    debtPressureChange: 0,
    netWorthProjection12m,
    headline:
      shortfall > 0
        ? `Gap of ${fmt(gap)} — requires ${fmt(requiredMonthly)}/mo but only ${fmt(currentCapacity)}/mo available.`
        : `Feasible at current capacity (${fmt(currentCapacity)}/mo).`,
    tradeoffs: [
      `Target: ${fmt(downPayment)} in ${targetMonths} months`,
      `Required monthly: ${fmt(requiredMonthly)}`,
      `Current allocatable surplus: ${fmt(currentCapacity)}/mo`,
      shortfall > 0
        ? `Extending to ~${feasibleMonths} months makes it feasible`
        : `Buffer of ${fmt(currentCapacity - requiredMonthly)}/mo remains for other goals`,
    ],
  };
}

function computeIncomeChange(
  params: ScenarioParameters,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  const incomeChange = params.incomeChange ?? 0;
  const cf = snapshot.cashFlow;
  const bs = snapshot.balanceSheet;

  const newInflow = cf.totalInflow + incomeChange;
  const newSurplus = cf.allocatableSurplus + incomeChange;
  const newDebtRatio =
    newInflow > 0 ? cf.totalDebtService / newInflow : 0;
  const oldDebtRatio =
    cf.totalInflow > 0 ? cf.totalDebtService / cf.totalInflow : 0;
  const debtPressureChange = newDebtRatio - oldDebtRatio;

  const goalMonthsShift =
    cf.allocatableSurplus > 0
      ? Math.round((-incomeChange / cf.allocatableSurplus) * 12)
      : 0;

  const netWorthProjection12m = Math.max(
    MIN_NW_FLOOR,
    bs.netWorth + newSurplus * 12,
  );

  const direction = incomeChange >= 0 ? "increase" : "drop";
  const magnitude = Math.abs(incomeChange);

  return {
    surplusImpact: incomeChange,
    goalTimelineShift:
      goalMonthsShift >= 0
        ? `+${goalMonthsShift} months on all goals`
        : `${goalMonthsShift} months on all goals`,
    debtPressureChange,
    netWorthProjection12m,
    headline:
      incomeChange >= 0
        ? `Extra ${fmt(magnitude)}/mo accelerates every goal proportionally.`
        : `Manageable stress — surplus drops to ${fmt(newSurplus)}/mo but stays positive.`,
    tradeoffs: [
      `Monthly inflow ${direction === "increase" ? "rises to" : "falls to"} ${fmt(newInflow)}`,
      `Allocatable surplus shifts from ${fmt(cf.allocatableSurplus)} to ${fmt(newSurplus)}`,
      `Debt service now ${(newDebtRatio * 100).toFixed(1)}% of inflow (was ${(oldDebtRatio * 100).toFixed(1)}%)`,
      incomeChange < 0
        ? "Emergency reserve becomes a higher priority"
        : "Extra capacity can accelerate the highest-priority goal",
    ],
  };
}

function computeExpenseReduction(
  params: ScenarioParameters,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  const reductionPercent = params.reductionPercent ?? 0;
  const categoryCode = params.category ?? 0; // 0 = variable, 1 = fixed
  const cf = snapshot.cashFlow;
  const bs = snapshot.balanceSheet;

  const categoryAmount =
    categoryCode === 1 ? cf.totalFixed : cf.totalVariable;
  const categoryLabel = categoryCode === 1 ? "fixed" : "variable";
  const freed = categoryAmount * (reductionPercent / 100);
  const newSurplus = cf.allocatableSurplus + freed;

  const goalMonthsGained =
    cf.allocatableSurplus > 0
      ? Math.round((freed / cf.allocatableSurplus) * 12)
      : 0;

  const newDebtRatio =
    cf.totalInflow > 0 ? cf.totalDebtService / cf.totalInflow : 0;
  // Debt ratio unchanged by expense cuts, but pressure feel changes
  const debtPressureChange =
    cf.totalInflow > 0 ? -freed / cf.totalInflow : 0;

  const netWorthProjection12m = Math.max(
    MIN_NW_FLOOR,
    bs.netWorth + newSurplus * 12,
  );

  return {
    surplusImpact: freed,
    goalTimelineShift:
      goalMonthsGained > 0
        ? `−${goalMonthsGained} months on goals`
        : "Minimal timeline shift",
    debtPressureChange,
    netWorthProjection12m,
    headline:
      freed > 0
        ? `Frees ${fmt(freed)}/mo — a ${reductionPercent}% cut to ${categoryLabel} spending.`
        : "No impact — check that the category has spending to reduce.",
    tradeoffs: [
      `Current ${categoryLabel} spending: ${fmt(categoryAmount)}/mo`,
      `New ${categoryLabel} spending: ${fmt(categoryAmount - freed)}/mo`,
      `Surplus rises from ${fmt(cf.allocatableSurplus)} to ${fmt(newSurplus)}/mo`,
      categoryCode === 0
        ? "Lifestyle impact: moderate (dining, discretionary, subscriptions)"
        : "Lifestyle impact: higher (requires restructuring fixed commitments)",
    ],
  };
}

function computeAggressiveSaving(
  params: ScenarioParameters,
  snapshot: MonthlySnapshot,
): ScenarioResult {
  const extraMonthly = params.extraMonthly ?? 0;
  const cf = snapshot.cashFlow;
  const bs = snapshot.balanceSheet;
  const goals = snapshot.goals;

  const primaryGoal = goals[0];
  if (!primaryGoal) {
    return {
      surplusImpact: extraMonthly,
      goalTimelineShift: "No primary goal to accelerate",
      debtPressureChange: 0,
      netWorthProjection12m: bs.netWorth + extraMonthly * 12,
      headline: "Add a goal to project acceleration impact.",
      tradeoffs: [],
    };
  }

  const gap = primaryGoal.targetAmount - primaryGoal.currentAmount;
  const currentPace = primaryGoal.monthlyRequired || cf.allocatableSurplus;
  const newPace = currentPace + extraMonthly;
  const oldMonths = currentPace > 0 ? Math.ceil(gap / currentPace) : 999;
  const newMonths = newPace > 0 ? Math.ceil(gap / newPace) : 999;
  const monthsGained = oldMonths - newMonths;

  const netWorthProjection12m = Math.max(
    MIN_NW_FLOOR,
    bs.netWorth + (cf.allocatableSurplus + extraMonthly) * 12,
  );

  return {
    surplusImpact: extraMonthly,
    goalTimelineShift: `−${monthsGained} months on ${primaryGoal.name}`,
    debtPressureChange: 0,
    netWorthProjection12m,
    headline:
      monthsGained > 0
        ? `${primaryGoal.name} reaches target in ${newMonths} months instead of ${oldMonths}.`
        : "Negligible acceleration at this extra pace.",
    tradeoffs: [
      `Primary goal: ${primaryGoal.name}`,
      `Current pace: ${fmt(currentPace)}/mo → ${fmt(newPace)}/mo`,
      `Timeline: ${oldMonths} months → ${newMonths} months`,
      `Requires sustaining an extra ${fmt(extraMonthly)}/mo for the full horizon`,
    ],
  };
}

// ── Formatting helper (plain, engine-side) ───────────────────────────

function fmt(n: number): string {
  const rounded = Math.round(n);
  if (Math.abs(rounded) >= 1_000_000) {
    return `${(rounded / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(rounded) >= 1_000) {
    return `${(rounded / 1_000).toFixed(0)}K`;
  }
  return `${rounded}`;
}
