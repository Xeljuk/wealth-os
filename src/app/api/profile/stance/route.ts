import { getDatabase } from "@/server/db/client";
import type { PlanStance } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STANCES: readonly PlanStance[] = [
  "safe",
  "balanced",
  "aggressive",
];

function isValidStance(value: unknown): value is PlanStance {
  return (
    typeof value === "string" &&
    (VALID_STANCES as readonly string[]).includes(value)
  );
}

/**
 * Persists operating stance for the single prototype user (id = 1).
 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Request body must be JSON" },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "invalid_body", message: "Body must be an object" },
      { status: 400 }
    );
  }

  const stance = (body as Record<string, unknown>).stance;
  if (!isValidStance(stance)) {
    return Response.json(
      {
        error: "invalid_stance",
        message: `stance must be one of: ${VALID_STANCES.join(", ")}`,
        allowed: [...VALID_STANCES],
      },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const info = db
      .prepare("UPDATE users SET operating_stance = ? WHERE id = 1")
      .run(stance);

    if (info.changes === 0) {
      return Response.json(
        { error: "user_not_found", message: "User row missing (run db seed)" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, stance });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "database_error", message },
      { status: 500 }
    );
  }
}
