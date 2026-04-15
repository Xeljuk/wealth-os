import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;
const MAX_GOALS = 10;

function statusForPriority(priority: number): "at_risk" | "tight" | "on_track" {
  if (priority === 1) return "at_risk";
  if (priority === 2) return "tight";
  return "on_track";
}

function nextGoalId(existing: Set<string>): string {
  for (let i = 1; i <= MAX_GOALS * 2; i++) {
    const candidate = `g${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `g_${Date.now().toString(36)}`;
}

function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

interface CreateGoalBody {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetMonth: string;
  priority: number;
}

function validate(body: unknown): { ok: true; value: CreateGoalBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const g = body as Record<string, unknown>;
  if (typeof g.name !== "string" || g.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (!isNonNegativeNumber(g.targetAmount)) {
    return { ok: false, message: "targetAmount must be a non-negative number" };
  }
  if (!isNonNegativeNumber(g.currentAmount)) {
    return { ok: false, message: "currentAmount must be a non-negative number" };
  }
  if (!isMonth(g.targetMonth)) {
    return { ok: false, message: "targetMonth must be YYYY-MM" };
  }
  const priority = Number(g.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > MAX_GOALS) {
    return { ok: false, message: `priority must be an integer between 1 and ${MAX_GOALS}` };
  }
  return {
    ok: true,
    value: {
      name: g.name.trim(),
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetMonth: g.targetMonth,
      priority,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return Response.json({ error: "validation", message: parsed.message }, { status: 400 });
  }

  try {
    const db = getDatabase();

    const existing = db
      .prepare("SELECT id FROM goals WHERE user_id = ? ORDER BY id")
      .all(USER_ID) as { id: string }[];

    if (existing.length >= MAX_GOALS) {
      return Response.json(
        { error: "max_goals", message: `Maximum of ${MAX_GOALS} goals reached` },
        { status: 400 },
      );
    }

    const usedIds = new Set(existing.map((r) => r.id));
    const newId = nextGoalId(usedIds);

    const status = statusForPriority(parsed.value.priority);

    db.prepare(
      "INSERT INTO goals (id, user_id, name, goal_type, target_amount, current_amount, target_date, priority, status_override) VALUES (?, ?, ?, 'custom', ?, ?, ?, ?, ?)",
    ).run(
      newId,
      USER_ID,
      parsed.value.name,
      parsed.value.targetAmount,
      parsed.value.currentAmount,
      parsed.value.targetMonth,
      parsed.value.priority,
      status,
    );

    return Response.json({ ok: true, id: newId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
