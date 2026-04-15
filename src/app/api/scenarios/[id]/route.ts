import type { NextRequest } from "next/server";
import { getDatabase } from "@/server/db/client";
import { buildMonthlySnapshot } from "@/server/services/snapshot-builder";
import {
  computeScenarioResult,
  validateScenarioInput,
  type ScenarioInput,
} from "@/server/services/scenario-engine";
import type { ScenarioType } from "@/lib/types";

export const runtime = "nodejs";

const USER_ID = 1;
const VALID_TYPES: ScenarioType[] = [
  "debt_vs_invest",
  "major_purchase",
  "income_change",
  "expense_reduction",
  "aggressive_saving",
];

interface ScenarioRow {
  id: string;
  name: string;
  description: string;
  scenario_type: string;
  parameters_json: string;
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
  const s = body as Record<string, unknown>;

  try {
    const db = getDatabase();
    const existing = db
      .prepare("SELECT id, name, description, scenario_type, parameters_json FROM scenarios WHERE id = ? AND user_id = ?")
      .get(id, USER_ID) as ScenarioRow | undefined;
    if (!existing) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    // Merge incoming fields over existing
    const nextName =
      typeof s.name === "string" && s.name.trim().length > 0 ? s.name.trim() : existing.name;
    const nextDescription =
      typeof s.description === "string" ? s.description.trim() : existing.description;

    let nextType = existing.scenario_type as ScenarioType;
    if (s.type !== undefined) {
      if (typeof s.type !== "string" || !VALID_TYPES.includes(s.type as ScenarioType)) {
        return Response.json(
          { error: "validation", message: `type must be one of ${VALID_TYPES.join(", ")}` },
          { status: 400 },
        );
      }
      nextType = s.type as ScenarioType;
    }

    let nextParameters: Record<string, number>;
    if (s.parameters !== undefined) {
      if (!s.parameters || typeof s.parameters !== "object" || Array.isArray(s.parameters)) {
        return Response.json({ error: "validation", message: "parameters must be an object" }, { status: 400 });
      }
      nextParameters = {};
      for (const [k, v] of Object.entries(s.parameters as Record<string, unknown>)) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          return Response.json(
            { error: "validation", message: `parameter ${k} must be a finite number` },
            { status: 400 },
          );
        }
        nextParameters[k] = v;
      }
    } else {
      nextParameters = JSON.parse(existing.parameters_json) as Record<string, number>;
    }

    const input: ScenarioInput = { type: nextType, parameters: nextParameters };
    const engineCheck = validateScenarioInput(input);
    if (!engineCheck.ok) {
      return Response.json({ error: "validation", message: engineCheck.message }, { status: 400 });
    }

    const snapshot = buildMonthlySnapshot(db, USER_ID);
    const result = computeScenarioResult(input, snapshot);

    db.prepare(
      "UPDATE scenarios SET name = ?, description = ?, scenario_type = ?, parameters_json = ?, result_json = ? WHERE id = ? AND user_id = ?",
    ).run(
      nextName,
      nextDescription,
      nextType,
      JSON.stringify(nextParameters),
      JSON.stringify(result),
      id,
      USER_ID,
    );

    return Response.json({ ok: true, result });
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
      .prepare("DELETE FROM scenarios WHERE id = ? AND user_id = ?")
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
