import type { NextRequest } from "next/server";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;

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
  const i = body as Record<string, unknown>;

  try {
    const db = getDatabase();
    const existing = db
      .prepare("SELECT id FROM income_sources WHERE id = ? AND user_id = ?")
      .get(id, USER_ID) as { id: string } | undefined;
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (i.name !== undefined) {
      if (typeof i.name !== "string" || i.name.trim().length === 0) {
        return Response.json({ error: "validation", message: "name must be non-empty" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(i.name.trim());
    }
    if (i.amount !== undefined) {
      if (!isNonNegativeNumber(i.amount)) {
        return Response.json({ error: "validation", message: "amount must be non-negative" }, { status: 400 });
      }
      updates.push("amount = ?");
      values.push(i.amount);
    }
    if (i.recurring !== undefined) {
      updates.push("recurring = ?");
      values.push(i.recurring ? 1 : 0);
    }

    if (updates.length === 0) {
      return Response.json({ error: "validation", message: "No updatable fields provided" }, { status: 400 });
    }

    values.push(id, USER_ID);
    db.prepare(`UPDATE income_sources SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

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
      .prepare("DELETE FROM income_sources WHERE id = ? AND user_id = ?")
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
