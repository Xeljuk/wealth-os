import { getDatabase } from "@/server/db/client";
import type { LiabilityCategory } from "@/lib/types";

export const runtime = "nodejs";

const USER_ID = 1;
const VALID_CATEGORIES: LiabilityCategory[] = [
  "loan",
  "credit_card",
  "mortgage",
  "installment",
  "other",
];

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isOptionalNonNegativeNumber(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || isNonNegativeNumber(value);
}

interface CreateLiabilityBody {
  name: string;
  category: LiabilityCategory;
  balance: number;
  monthlyPayment: number;
  apr: number | null;
  remainingPayments: number | null;
}

function validate(body: unknown): { ok: true; value: CreateLiabilityBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const l = body as Record<string, unknown>;
  if (typeof l.name !== "string" || l.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (typeof l.category !== "string" || !VALID_CATEGORIES.includes(l.category as LiabilityCategory)) {
    return { ok: false, message: `category must be one of ${VALID_CATEGORIES.join(", ")}` };
  }
  if (!isNonNegativeNumber(l.balance)) {
    return { ok: false, message: "balance must be a non-negative number" };
  }
  if (!isNonNegativeNumber(l.monthlyPayment)) {
    return { ok: false, message: "monthlyPayment must be a non-negative number" };
  }
  if (!isOptionalNonNegativeNumber(l.apr)) {
    return { ok: false, message: "apr must be a non-negative number or null" };
  }
  if (!isOptionalNonNegativeNumber(l.remainingPayments)) {
    return { ok: false, message: "remainingPayments must be a non-negative number or null" };
  }

  return {
    ok: true,
    value: {
      name: l.name.trim(),
      category: l.category as LiabilityCategory,
      balance: l.balance,
      monthlyPayment: l.monthlyPayment,
      apr: l.apr === undefined || l.apr === null ? null : (l.apr as number),
      remainingPayments:
        l.remainingPayments === undefined || l.remainingPayments === null
          ? null
          : (l.remainingPayments as number),
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
    const newId = `l${Date.now()}`;

    db.prepare(
      "INSERT INTO liabilities (id, user_id, name, category, balance, monthly_payment, apr, linked_asset_id, remaining_payments) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)",
    ).run(
      newId,
      USER_ID,
      parsed.value.name,
      parsed.value.category,
      parsed.value.balance,
      parsed.value.monthlyPayment,
      parsed.value.apr,
      parsed.value.remainingPayments,
    );

    return Response.json({ ok: true, id: newId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
