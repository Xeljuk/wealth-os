import { getDatabase } from "@/server/db/client";
import { buildMonthlySnapshot } from "@/server/services/snapshot-builder";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDatabase();
    const snapshot = buildMonthlySnapshot(db, 1);
    return Response.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "snapshot_unavailable", message },
      { status: 500 }
    );
  }
}
