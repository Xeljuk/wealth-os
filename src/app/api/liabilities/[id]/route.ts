import type { NextRequest } from "next/server";
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

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "validation", message: "Body must be an object" }, { status: 400 });
  }
  const l = body as Record<string, unknown>;

  try {
    const db = getDatabase();
    const existing = db
      .prepare("SELECT id FROM liabilities WHERE id = ? AND user_id = ?")
      .get(id, USER_ID) as { id: string } | undefined;
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (l.name !== undefined) {
      if (typeof l.name !== "string" || l.name.trim().length === 0) {
        return Response.json({ error: "validation", message: "name must be non-empty" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(l.name.trim());
    }
    if (l.category !== undefined) {
      if (typeof l.category !== "string" || !VALID_CATEGORIES.includes(l.category as LiabilityCategory)) {
        return Response.json({ error: "validation", message: "invalid category" }, { status: 400 });
      }
      updates.push("category = ?");
      values.push(l.category);
    }
    if (l.balance !== undefined) {
      if (!isNonNegativeNumber(l.balance)) {
        return Response.json({ error: "validation", message: "balance must be non-negative" }, { status: 400 });
      }
      updates.push("balance = ?");
      values.push(l.balance);
    }
    if (l.monthlyPayment !== undefined) {
      if (!isNonNegativeNumber(l.monthlyPayment)) {
        return Response.json({ error: "validation", message: "monthlyPayment must be non-negative" }, { status: 400 });
      }
      updates.push("monthly_payment = ?");
      values.push(l.monthlyPayment);
    }
    if (l.apr !== undefined) {
      if (l.apr !== null && !isNonNegativeNumber(l.apr)) {
        return Response.json({ error: "validation", message: "apr must be non-negative or null" }, { status: 400 });
      }
      updates.push("apr = ?");
      values.push(l.apr as number | null);
    }
    if (l.remainingPayments !== undefined) {
      if (l.remainingPayments !== null && !isNonNegativeNumber(l.remainingPayments)) {
        return Response.json(
          { error: "validation", message: "remainingPayments must be non-negative or null" },
          { status: 400 },
        );
      }
      updates.push("remaining_payments = ?");
      values.push(l.remainingPayments as number | null);
    }

    if (updates.length === 0) {
      return Response.json({ error: "validation", message: "No updatable fields provided" }, { status: 400 });
    }

    values.push(id, USER_ID);
    db.prepare(`UPDATE liabilities SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const db = getDatabase();
    const result = db
      .prepare("DELETE FROM liabilities WHERE id = ? AND user_id = ?")
      .run(id, USER_ID);
    if (result.changes === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
