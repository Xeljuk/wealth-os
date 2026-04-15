import { getDatabase } from "@/server/db/client";
import { listSnapshotLog } from "@/server/services/snapshot-log";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDatabase();
    const rows = listSnapshotLog(db, 1);
    return Response.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "history_unavailable", message },
      { status: 500 },
    );
  }
}
