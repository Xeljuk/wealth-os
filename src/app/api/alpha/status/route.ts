import { MOCK_SNAPSHOT } from "@/lib/mock-data";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDatabase();

    const income = db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM income_sources WHERE user_id = 1"
      )
      .get() as { total: number; count: number };
    const assets = db
      .prepare(
        "SELECT COALESCE(SUM(value),0) AS total, COUNT(*) AS count FROM assets WHERE user_id = 1"
      )
      .get() as { total: number; count: number };
    const liabilities = db
      .prepare(
        "SELECT COALESCE(SUM(balance),0) AS total, COUNT(*) AS count FROM liabilities WHERE user_id = 1"
      )
      .get() as { total: number; count: number };
    const goals = db
      .prepare("SELECT COUNT(*) AS count FROM goals WHERE user_id = 1")
      .get() as { count: number };
    const user = db
      .prepare("SELECT snapshot_period FROM users WHERE id = 1")
      .get() as { snapshot_period: string } | undefined;

    const hasIncome = income.total > 0 && income.count > 0;
    const hasAssets = assets.total > 0 && assets.count > 0;
    const hasLiabilities = liabilities.count > 0;
    const hasGoals = goals.count > 0;

    const isDemoMode =
      user?.snapshot_period === MOCK_SNAPSHOT.period &&
      income.total === MOCK_SNAPSHOT.cashFlow.totalInflow &&
      assets.total ===
        MOCK_SNAPSHOT.balanceSheet.assets.reduce((s, a) => s + a.value, 0);

    const hasCustomData = hasIncome && hasAssets && hasGoals && !isDemoMode;

    const missing: string[] = [];
    if (!hasIncome) missing.push("monthly engine");
    if (!hasAssets) missing.push("assets");
    if (!hasLiabilities) missing.push("liabilities");
    if (!hasGoals) missing.push("goals");

    return Response.json({
      hasIncome,
      hasAssets,
      hasLiabilities,
      hasGoals,
      hasCustomData,
      isDemoMode,
      missing,
    });
  } catch (e) {
    return Response.json(
      {
        error: "status_unavailable",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
