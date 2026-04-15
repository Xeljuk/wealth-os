import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Updates the single prototype user's profile (display name, currency, safety buffer).
 * Operating stance has its own endpoint at /api/profile/stance.
 */
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "validation", message: "Body must be an object" }, { status: 400 });
  }
  const p = body as Record<string, unknown>;

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (p.displayName !== undefined) {
    if (typeof p.displayName !== "string" || p.displayName.trim().length === 0) {
      return Response.json(
        { error: "validation", message: "displayName must be a non-empty string" },
        { status: 400 },
      );
    }
    updates.push("display_name = ?");
    values.push(p.displayName.trim());
  }
  if (p.currency !== undefined) {
    if (typeof p.currency !== "string" || p.currency.trim().length === 0) {
      return Response.json(
        { error: "validation", message: "currency must be a non-empty string (e.g. TRY, USD)" },
        { status: 400 },
      );
    }
    updates.push("currency = ?");
    values.push(p.currency.trim().toUpperCase());
  }
  if (p.currencySymbol !== undefined) {
    if (typeof p.currencySymbol !== "string" || p.currencySymbol.trim().length === 0) {
      return Response.json(
        { error: "validation", message: "currencySymbol must be a non-empty string" },
        { status: 400 },
      );
    }
    updates.push("currency_symbol = ?");
    values.push(p.currencySymbol.trim());
  }
  if (p.safetyBuffer !== undefined) {
    if (!isNonNegativeNumber(p.safetyBuffer)) {
      return Response.json(
        { error: "validation", message: "safetyBuffer must be a non-negative number" },
        { status: 400 },
      );
    }
    updates.push("safety_buffer = ?");
    values.push(p.safetyBuffer);
  }

  if (updates.length === 0) {
    return Response.json(
      { error: "validation", message: "No updatable fields provided" },
      { status: 400 },
    );
  }

  try {
    const db = getDatabase();
    values.push(USER_ID);
    const info = db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    if (info.changes === 0) {
      return Response.json(
        { error: "user_not_found", message: "User row missing (run db seed)" },
        { status: 500 },
      );
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
