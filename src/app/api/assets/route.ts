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

interface CreateAssetBody {
  name: string;
  category: AssetCategory;
  value: number;
  asOfDate: string;
  liquidityTier: LiquidityTier;
  note: string | null;
}

function validate(body: unknown): { ok: true; value: CreateAssetBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const a = body as Record<string, unknown>;
  if (typeof a.name !== "string" || a.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (typeof a.category !== "string" || !VALID_CATEGORIES.includes(a.category as AssetCategory)) {
    return { ok: false, message: `category must be one of ${VALID_CATEGORIES.join(", ")}` };
  }
  if (!isNonNegativeNumber(a.value)) {
    return { ok: false, message: "value must be a non-negative number" };
  }
  if (!isIsoDate(a.asOfDate)) {
    return { ok: false, message: "asOfDate must be YYYY-MM-DD" };
  }
  if (typeof a.liquidityTier !== "string" || !VALID_LIQUIDITY.includes(a.liquidityTier as LiquidityTier)) {
    return { ok: false, message: `liquidityTier must be one of ${VALID_LIQUIDITY.join(", ")}` };
  }
  const note = a.note === undefined || a.note === null || a.note === "" ? null : String(a.note).trim();

  return {
    ok: true,
    value: {
      name: a.name.trim(),
      category: a.category as AssetCategory,
      value: a.value,
      asOfDate: a.asOfDate,
      liquidityTier: a.liquidityTier as LiquidityTier,
      note,
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
    const newId = `a${Date.now()}`;

    db.prepare(
      "INSERT INTO assets (id, user_id, name, category, value, as_of_date, liquidity_tier, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      newId,
      USER_ID,
      parsed.value.name,
      parsed.value.category,
      parsed.value.value,
      parsed.value.asOfDate,
      parsed.value.liquidityTier,
      parsed.value.note,
    );

    return Response.json({ ok: true, id: newId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
