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

interface CreateScenarioBody {
  name: string;
  description: string;
  type: ScenarioType;
  parameters: Record<string, number>;
}

function parse(body: unknown): { ok: true; value: CreateScenarioBody } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Body must be an object" };
  }
  const s = body as Record<string, unknown>;
  if (typeof s.name !== "string" || s.name.trim().length === 0) {
    return { ok: false, message: "name is required" };
  }
  if (typeof s.description !== "string") {
    return { ok: false, message: "description is required" };
  }
  if (typeof s.type !== "string" || !VALID_TYPES.includes(s.type as ScenarioType)) {
    return { ok: false, message: `type must be one of ${VALID_TYPES.join(", ")}` };
  }
  if (!s.parameters || typeof s.parameters !== "object" || Array.isArray(s.parameters)) {
    return { ok: false, message: "parameters must be an object" };
  }
  const params: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.parameters as Record<string, unknown>)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { ok: false, message: `parameter ${k} must be a finite number` };
    }
    params[k] = v;
  }
  return {
    ok: true,
    value: {
      name: s.name.trim(),
      description: (s.description as string).trim(),
      type: s.type as ScenarioType,
      parameters: params,
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

  const parsed = parse(body);
  if (!parsed.ok) {
    return Response.json({ error: "validation", message: parsed.message }, { status: 400 });
  }

  const input: ScenarioInput = { type: parsed.value.type, parameters: parsed.value.parameters };
  const engineCheck = validateScenarioInput(input);
  if (!engineCheck.ok) {
    return Response.json({ error: "validation", message: engineCheck.message }, { status: 400 });
  }

  try {
    const db = getDatabase();
    const snapshot = buildMonthlySnapshot(db, USER_ID);
    const result = computeScenarioResult(input, snapshot);
    const newId = `s${Date.now()}`;

    db.prepare(
      "INSERT INTO scenarios (id, user_id, name, description, scenario_type, parameters_json, result_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      newId,
      USER_ID,
      parsed.value.name,
      parsed.value.description,
      parsed.value.type,
      JSON.stringify(parsed.value.parameters),
      JSON.stringify(result),
    );

    return Response.json({ ok: true, id: newId, result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "db_error", message }, { status: 500 });
  }
}
