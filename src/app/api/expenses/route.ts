import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;
const VALID_TYPES = ["fixed", "variable", "debt_service"] as const;
type ExpenseType = (typeof VALID_TYPES)[number];

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

interface CreateExpenseBody {
  name: string;
  amount: number;
  type: ExpenseType;
  recurring: boolean;
}

function validate(body: unknown): { ok: true; value: CreateExpenseBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const e = body as Record<string, unknown>;
  if (typeof e.name !== "string" || e.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (!isNonNegativeNumber(e.amount)) {
    return { ok: false, message: "amount must be a non-negative number" };
  }
  if (typeof e.type !== "string" || !VALID_TYPES.includes(e.type as ExpenseType)) {
    return { ok: false, message: `type must be one of ${VALID_TYPES.join(", ")}` };
  }
  return {
    ok: true,
    value: {
      name: e.name.trim(),
      amount: e.amount,
      type: e.type as ExpenseType,
      recurring: e.recurring !== false,
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
    const newId = `e${Date.now()}`;

    db.prepare(
      "INSERT INTO expense_lines (id, user_id, name, amount, expense_type, recurring) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      newId,
      USER_ID,
      parsed.value.name,
      parsed.value.amount,
      parsed.value.type,
      parsed.value.recurring ? 1 : 0,
    );

    return Response.json({ ok: true, id: newId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
