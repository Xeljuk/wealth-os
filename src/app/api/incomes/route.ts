import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

interface CreateIncomeBody {
  name: string;
  amount: number;
  recurring: boolean;
}

function validate(body: unknown): { ok: true; value: CreateIncomeBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const i = body as Record<string, unknown>;
  if (typeof i.name !== "string" || i.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (!isNonNegativeNumber(i.amount)) {
    return { ok: false, message: "amount must be a non-negative number" };
  }
  return {
    ok: true,
    value: {
      name: i.name.trim(),
      amount: i.amount,
      recurring: i.recurring !== false,
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
    const newId = `i${Date.now()}`;

    db.prepare(
      "INSERT INTO income_sources (id, user_id, name, amount, recurring) VALUES (?, ?, ?, ?, ?)",
    ).run(newId, USER_ID, parsed.value.name, parsed.value.amount, parsed.value.recurring ? 1 : 0);

    return Response.json({ ok: true, id: newId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
