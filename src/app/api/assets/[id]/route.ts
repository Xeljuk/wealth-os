import type { NextRequest } from "next/server";
import { getDatabase } from "@/server/db/client";
import type { AssetCategory, LiquidityTier } from "@/lib/types";

export const runtime = "nodejs";

const USER_ID = 1;

const VALID_CATEGORIES: AssetCategory[] = ["cash", "investment", "property", "vehicle", "other"];
const VALID_LIQUIDITY: LiquidityTier[] = ["immediate", "short_term", "long_term", "illiquid"];

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  const a = body as Record<string, unknown>;

  try {
    const db = getDatabase();
    const existing = db
      .prepare("SELECT id FROM assets WHERE id = ? AND user_id = ?")
      .get(id, USER_ID) as { id: string } | undefined;
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (a.name !== undefined) {
      if (typeof a.name !== "string" || a.name.trim().length === 0) {
        return Response.json({ error: "validation", message: "name must be non-empty" }, { status: 400 });
      }
      updates.push("name = ?");
      values.push(a.name.trim());
    }
    if (a.category !== undefined) {
      if (typeof a.category !== "string" || !VALID_CATEGORIES.includes(a.category as AssetCategory)) {
        return Response.json({ error: "validation", message: "invalid category" }, { status: 400 });
      }
      updates.push("category = ?");
      values.push(a.category);
    }
    if (a.value !== undefined) {
      if (!isNonNegativeNumber(a.value)) {
        return Response.json({ error: "validation", message: "value must be non-negative number" }, { status: 400 });
      }
      updates.push("value = ?");
      values.push(a.value);
    }
    if (a.asOfDate !== undefined) {
      if (!isIsoDate(a.asOfDate)) {
        return Response.json({ error: "validation", message: "asOfDate must be YYYY-MM-DD" }, { status: 400 });
      }
      updates.push("as_of_date = ?");
      values.push(a.asOfDate);
    }
    if (a.liquidityTier !== undefined) {
      if (typeof a.liquidityTier !== "string" || !VALID_LIQUIDITY.includes(a.liquidityTier as LiquidityTier)) {
        return Response.json({ error: "validation", message: "invalid liquidityTier" }, { status: 400 });
      }
      updates.push("liquidity_tier = ?");
      values.push(a.liquidityTier);
    }
    if (a.note !== undefined) {
      updates.push("note = ?");
      values.push(a.note === null || a.note === "" ? null : String(a.note).trim());
    }

    if (updates.length === 0) {
      return Response.json({ error: "validation", message: "No updatable fields provided" }, { status: 400 });
    }

    values.push(id, USER_ID);
    db.prepare(`UPDATE assets SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

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
    const result = db.prepare("DELETE FROM assets WHERE id = ? AND user_id = ?").run(id, USER_ID);
    if (result.changes === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
