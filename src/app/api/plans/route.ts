import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const STANCES = ["safe", "balanced", "aggressive"] as const;
type Stance = (typeof STANCES)[number];

interface PlanRow {
  stance: Stance;
  debt_extra: number;
  goal_funding: number;
  investment_contribution: number;
  liquidity_reserve: number;
  headline: string;
  description: string;
}

export async function GET() {
  try {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM plan_variants")
      .all() as PlanRow[];
    return Response.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "plans_unavailable", message },
      { status: 500 },
    );
  }
}

interface PatchBody {
  stance?: unknown;
  debtExtra?: unknown;
  goalFunding?: unknown;
  investmentContribution?: unknown;
  liquidityReserve?: unknown;
  headline?: unknown;
  description?: unknown;
}

function isStance(v: unknown): v is Stance {
  return typeof v === "string" && (STANCES as readonly string[]).includes(v);
}

function num(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(`Field ${field} must be a non-negative number`);
  }
  return Math.round(v);
}

function str(v: unknown, field: string, max = 500): string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new Error(`Field ${field} must be a non-empty string`);
  }
  if (v.length > max) {
    throw new Error(`Field ${field} is too long`);
  }
  return v.trim();
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchBody;
    if (!isStance(body.stance)) {
      return Response.json(
        { error: "invalid_stance", message: "stance must be safe/balanced/aggressive" },
        { status: 400 },
      );
    }

    const update = {
      stance: body.stance,
      debt_extra: num(body.debtExtra, "debtExtra"),
      goal_funding: num(body.goalFunding, "goalFunding"),
      investment_contribution: num(body.investmentContribution, "investmentContribution"),
      liquidity_reserve: num(body.liquidityReserve, "liquidityReserve"),
      headline: str(body.headline, "headline", 200),
      description: str(body.description, "description", 1000),
    };

    const db = getDatabase();
    db.prepare(
      `UPDATE plan_variants SET
         debt_extra = @debt_extra,
         goal_funding = @goal_funding,
         investment_contribution = @investment_contribution,
         liquidity_reserve = @liquidity_reserve,
         headline = @headline,
         description = @description
       WHERE stance = @stance`,
    ).run(update);

    const row = db
      .prepare("SELECT * FROM plan_variants WHERE stance = ?")
      .get(body.stance) as PlanRow;
    return Response.json({ ok: true, row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "patch_failed", message },
      { status: 400 },
    );
  }
}
