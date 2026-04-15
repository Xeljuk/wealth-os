import { MOCK_SNAPSHOT } from "@/lib/mock-data";
import type { PlanStance } from "@/lib/types";
import type { AlphaIntakePayload } from "@/lib/alpha-intake";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const VALID_STANCES: readonly PlanStance[] = ["safe", "balanced", "aggressive"];

function currentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parsePayload(body: unknown): { ok: true; value: AlphaIntakePayload } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const payload = body as Record<string, unknown>;
  if (payload.mode === "demo") {
    return { ok: true, value: { mode: "demo" } };
  }
  if (payload.mode !== "custom") {
    return { ok: false, message: "mode must be 'demo' or 'custom'" };
  }
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "custom mode requires data object" };
  }

  const me = data.monthlyEngine as Record<string, unknown> | undefined;
  const bs = data.balanceSheet as Record<string, unknown> | undefined;
  const li = data.liabilities as Record<string, unknown> | undefined;
  const goals = data.goals as unknown;

  if (!me || !bs || !li || !Array.isArray(goals)) {
    return { ok: false, message: "data must include monthlyEngine, balanceSheet, liabilities, goals[]" };
  }

  const numericChecks = [
    me.salary,
    me.otherRecurringIncome,
    me.fixedExpenses,
    me.variableExpenses,
    me.debtService,
    me.safetyBuffer,
    bs.cash,
    bs.investments,
    bs.property,
    bs.vehicle,
    li.installmentLiabilities,
    li.revolvingLiabilities,
  ];
  if (!numericChecks.every(isNonNegativeNumber)) {
    return { ok: false, message: "All numeric intake fields must be non-negative numbers" };
  }

  if (goals.length === 0 || goals.length > 10) {
    return { ok: false, message: "Provide 1 to 10 goals" };
  }

  const parsedGoals = goals.map((g, idx) => {
    if (!g || typeof g !== "object" || Array.isArray(g)) {
      throw new Error(`Goal ${idx + 1} is invalid`);
    }
    const goal = g as Record<string, unknown>;
    if (
      typeof goal.name !== "string" ||
      goal.name.trim().length === 0 ||
      !isNonNegativeNumber(goal.targetAmount) ||
      !isNonNegativeNumber(goal.currentAmount) ||
      !isMonth(goal.targetMonth) ||
      !isNonNegativeNumber(goal.priority)
    ) {
      throw new Error(`Goal ${idx + 1} must include valid name, targetAmount, currentAmount, targetMonth, priority`);
    }
    return {
      name: goal.name.trim(),
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetMonth: goal.targetMonth,
      priority: Number(goal.priority),
    };
  });

  return {
    ok: true,
    value: {
      mode: "custom",
      data: {
        monthlyEngine: {
          salary: me.salary as number,
          otherRecurringIncome: me.otherRecurringIncome as number,
          fixedExpenses: me.fixedExpenses as number,
          variableExpenses: me.variableExpenses as number,
          debtService: me.debtService as number,
          safetyBuffer: me.safetyBuffer as number,
        },
        balanceSheet: {
          cash: bs.cash as number,
          investments: bs.investments as number,
          property: bs.property as number,
          vehicle: bs.vehicle as number,
        },
        liabilities: {
          installmentLiabilities: li.installmentLiabilities as number,
          revolvingLiabilities: li.revolvingLiabilities as number,
        },
        goals: parsedGoals,
      },
    },
  };
}

function applyDemo(db: ReturnType<typeof getDatabase>) {
  const period = MOCK_SNAPSHOT.period;
  const stance = MOCK_SNAPSHOT.profile.operatingStance;

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE users SET display_name = ?, currency = ?, currency_symbol = ?, safety_buffer = ?, operating_stance = ?, snapshot_period = ? WHERE id = 1"
    ).run(
      MOCK_SNAPSHOT.profile.name,
      MOCK_SNAPSHOT.profile.currency,
      MOCK_SNAPSHOT.profile.currencySymbol,
      MOCK_SNAPSHOT.profile.safetyBuffer,
      stance,
      period
    );

    db.prepare("DELETE FROM assets WHERE user_id = 1").run();
    db.prepare("DELETE FROM liabilities WHERE user_id = 1").run();
    db.prepare("DELETE FROM income_sources WHERE user_id = 1").run();
    db.prepare("DELETE FROM expense_lines WHERE user_id = 1").run();
    db.prepare("DELETE FROM goals WHERE user_id = 1").run();
    db.prepare("DELETE FROM net_worth_history WHERE user_id = 1").run();

    for (const a of MOCK_SNAPSHOT.balanceSheet.assets) {
      db.prepare(
        "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES (?, 1, ?, ?, ?, ?, ?, ?)"
      ).run(a.id, a.name, a.category, a.value, a.asOfDate, a.liquidityTier, a.note ?? null);
    }

    for (const l of MOCK_SNAPSHOT.balanceSheet.liabilities) {
      db.prepare(
        "INSERT INTO liabilities (id, user_id, name, category, balance, monthly_payment, apr, linked_asset_id, remaining_payments) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        l.id,
        l.name,
        l.category,
        l.balance,
        l.monthlyPayment,
        l.apr ?? null,
        l.linkedAssetId ?? null,
        l.remainingPayments ?? null
      );
    }

    for (const i of MOCK_SNAPSHOT.cashFlow.incomes) {
      db.prepare(
        "INSERT INTO income_sources (id, user_id, name, amount, recurring) VALUES (?, 1, ?, ?, ?)"
      ).run(i.id, i.name, i.amount, i.recurring ? 1 : 0);
    }

    for (const e of MOCK_SNAPSHOT.cashFlow.expenses) {
      db.prepare(
        "INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES (?, 1, ?, ?, ?, ?)"
      ).run(e.id, e.name, e.amount, e.type, e.recurring ? 1 : 0);
    }

    for (const g of MOCK_SNAPSHOT.goals) {
      db.prepare(
        "INSERT INTO goals (id, user_id, name, goal_type, target_amount, current_amount, target_date, priority, status_override) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)"
      ).run(g.id, g.name, g.type, g.targetAmount, g.currentAmount, g.targetDate, g.priority, g.status);
    }

    for (const p of MOCK_SNAPSHOT.netWorthHistory) {
      db.prepare(
        "INSERT INTO net_worth_history (user_id, period, value) VALUES (1, ?, ?)"
      ).run(p.period, p.value);
    }
  });

  tx();
}

function applyCustom(db: ReturnType<typeof getDatabase>, payload: Extract<AlphaIntakePayload, { mode: "custom" }>) {
  const period = currentPeriod();
  const { data } = payload;
  const totalAssets =
    data.balanceSheet.cash +
    data.balanceSheet.investments +
    data.balanceSheet.property +
    data.balanceSheet.vehicle;
  const totalLiabilities =
    data.liabilities.installmentLiabilities +
    data.liabilities.revolvingLiabilities;
  const netWorth = totalAssets - totalLiabilities;
  const step = Math.max(Math.round(Math.abs(netWorth) * 0.004), 1000);

  const tx = db.transaction(() => {
    const existingStance = db
      .prepare("SELECT operating_stance FROM users WHERE id = 1")
      .get() as { operating_stance: PlanStance } | undefined;
    const stance = existingStance?.operating_stance ?? "balanced";
    if (!VALID_STANCES.includes(stance)) {
      throw new Error("Invalid operating stance in users row");
    }

    db.prepare(
      "UPDATE users SET safety_buffer = ?, snapshot_period = ? WHERE id = 1"
    ).run(data.monthlyEngine.safetyBuffer, period);

    db.prepare("DELETE FROM assets WHERE user_id = 1").run();
    db.prepare("DELETE FROM liabilities WHERE user_id = 1").run();
    db.prepare("DELETE FROM income_sources WHERE user_id = 1").run();
    db.prepare("DELETE FROM expense_lines WHERE user_id = 1").run();
    db.prepare("DELETE FROM goals WHERE user_id = 1").run();
    db.prepare("DELETE FROM net_worth_history WHERE user_id = 1").run();

    const asOfDate = `${period}-01`;
    db.prepare(
      "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES ('a1',1,'Cash Reserves','cash',?,?,?,NULL)"
    ).run(data.balanceSheet.cash, asOfDate, "immediate");
    db.prepare(
      "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES ('a2',1,'Investments','investment',?,?,?,NULL)"
    ).run(data.balanceSheet.investments, asOfDate, "short_term");
    db.prepare(
      "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES ('a3',1,'Property','property',?,?,?,NULL)"
    ).run(data.balanceSheet.property, asOfDate, "illiquid");
    db.prepare(
      "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES ('a4',1,'Vehicle','vehicle',?,?,?,NULL)"
    ).run(data.balanceSheet.vehicle, asOfDate, "illiquid");

    const debtService = data.monthlyEngine.debtService;
    const installmentShare =
      totalLiabilities > 0 ? data.liabilities.installmentLiabilities / totalLiabilities : 1;
    const installmentMonthly = Math.round(debtService * installmentShare);
    const revolvingMonthly = Math.max(0, debtService - installmentMonthly);

    if (data.liabilities.installmentLiabilities > 0 || installmentMonthly > 0) {
      db.prepare(
        "INSERT INTO liabilities (id, user_id, name, category, balance, monthly_payment, apr, linked_asset_id, remaining_payments) VALUES ('l1',1,'Installment Liabilities','installment',?,?,?,?,NULL)"
      ).run(data.liabilities.installmentLiabilities, installmentMonthly, null, null);
    }
    if (data.liabilities.revolvingLiabilities > 0 || revolvingMonthly > 0) {
      db.prepare(
        "INSERT INTO liabilities (id, user_id, name, category, balance, monthly_payment, apr, linked_asset_id, remaining_payments) VALUES ('l2',1,'Revolving Liabilities','credit_card',?,?,?,?,NULL)"
      ).run(data.liabilities.revolvingLiabilities, revolvingMonthly, null, null);
    }

    db.prepare(
      "INSERT INTO income_sources (id, user_id, name, amount, recurring) VALUES ('i1',1,'Salary',?,1)"
    ).run(data.monthlyEngine.salary);
    db.prepare(
      "INSERT INTO income_sources (id, user_id, name, amount, recurring) VALUES ('i2',1,'Other Recurring Income',?,1)"
    ).run(data.monthlyEngine.otherRecurringIncome);

    db.prepare(
      "INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES ('e1',1,'Fixed Expenses',?,'fixed',1)"
    ).run(data.monthlyEngine.fixedExpenses);
    db.prepare(
      "INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES ('e2',1,'Variable Expenses',?,'variable',1)"
    ).run(data.monthlyEngine.variableExpenses);
    db.prepare(
      "INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES ('e3',1,'Debt Service',?,'debt_service',1)"
    ).run(debtService);

    const statusByPriority: Record<number, "at_risk" | "tight" | "on_track"> = {
      1: "at_risk",
      2: "tight",
      3: "on_track",
    };
    for (let i = 0; i < data.goals.length; i++) {
      const g = data.goals[i]!;
      db.prepare(
        "INSERT INTO goals (id, user_id, name, goal_type, target_amount, current_amount, target_date, priority, status_override) VALUES (?,1,?,'custom',?,?,?,?,?)"
      ).run(
        `g${i + 1}`,
        g.name,
        g.targetAmount,
        g.currentAmount,
        g.targetMonth,
        g.priority,
        statusByPriority[g.priority] ?? "tight"
      );
    }

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const p = `${y}-${m}`;
      const value = netWorth - step * i;
      db.prepare(
        "INSERT INTO net_worth_history (user_id, period, value) VALUES (1, ?, ?)"
      ).run(p, value);
    }
  });

  tx();
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Request body must be JSON" },
      { status: 400 }
    );
  }

  let parsed: ReturnType<typeof parsePayload>;
  try {
    parsed = parsePayload(body);
  } catch (e) {
    return Response.json(
      { error: "invalid_goal", message: e instanceof Error ? e.message : "Invalid goal input" },
      { status: 400 }
    );
  }

  if (!parsed.ok) {
    return Response.json(
      { error: "invalid_payload", message: parsed.message },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    if (parsed.value.mode === "demo") {
      applyDemo(db);
      return Response.json({ ok: true, mode: "demo" });
    }
    applyCustom(db, parsed.value);
    return Response.json({ ok: true, mode: "custom" });
  } catch (e) {
    return Response.json(
      {
        error: "persistence_failed",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
