import type { NextRequest } from "next/server";
import { getDatabase } from "@/server/db/client";

export const runtime = "nodejs";

const USER_ID = 1;

const STATUS_BY_PRIORITY: Record<number, "at_risk" | "tight" | "on_track"> = {
  1: "at_risk",
  2: "tight",
  3: "on_track",
};

function isMonth(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

interface GoalRow {
  id: string;
}

async function resolveId(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  return id;
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await resolveId(ctx);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "validation", message: "Body must be an object" }, { status: 400 });
  }
  const g = body as Record<string, unknown>;

  try {
    const db = getDatabase();
    const existing = db
      .prepare("SELECT id FROM goals WHERE id = ? AND user_id = ?")
      .get(id, USER_ID) as GoalRow | undefined;
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (g.name !== undefined) {
      if (typeof g.name !== "string" || g.name.trim().length === 0) {
        return Response.json({ error: "validation", message: "name must be a non-empty string" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(g.name.trim());
    }
    if (g.targetAmount !== undefined) {
      if (!isNonNegativeNumber(g.targetAmount)) {
        return Response.json({ error: "validation", message: "targetAmount must be non-negative number" }, { status: 400 });
      }
      updates.push("target_amount = ?");
      values.push(g.targetAmount);
    }
    if (g.currentAmount !== undefined) {
      if (!isNonNegativeNumber(g.currentAmount)) {
        return Response.json({ error: "validation", message: "currentAmount must be non-negative number" }, { status: 400 });
      }
      updates.push("current_amount = ?");
      values.push(g.currentAmount);
    }
    if (g.targetMonth !== undefined) {
      if (!isMonth(g.targetMonth)) {
        return Response.json({ error: "validation", message: "targetMonth must be YYYY-MM" }, { status: 400 });
      }
      updates.push("target_date = ?");
      values.push(g.targetMonth);
    }
    if (g.priority !== undefined) {
      const priority = Number(g.priority);
      if (![1, 2, 3].includes(priority)) {
        return Response.json({ error: "validation", message: "priority must be 1, 2, or 3" }, { status: 400 });
      }
      updates.push("priority = ?", "status_override = ?");
      values.push(priority, STATUS_BY_PRIORITY[priority] ?? "tight");
    }

    if (updates.length === 0) {
      return Response.json({ error: "validation", message: "No updatable fields provided" }, { status: 400 });
    }

    values.push(id, USER_ID);
    db.prepare(`UPDATE goals SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await resolveId(ctx);
  try {
    const db = getDatabase();
    const result = db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(id, USER_ID);
    if (result.changes === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
