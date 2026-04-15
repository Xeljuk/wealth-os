import { getDatabase } from "@/server/db/client";
import { buildMonthlySnapshot } from "@/server/services/snapshot-builder";
import { recordMonthClose } from "@/server/services/snapshot-log";

export const runtime = "nodejs";

function nextPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  const ny = d.getUTCFullYear();
  const nm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

export async function POST(req: Request) {
  try {
    const db = getDatabase();
    const body = (await req.json().catch(() => ({}))) as { advance?: boolean };
    const snapshot = buildMonthlySnapshot(db, 1);
    const row = recordMonthClose(db, snapshot, 1);

    let advancedTo: string | null = null;
    if (body.advance) {
      advancedTo = nextPeriod(snapshot.period);
      db.prepare("UPDATE users SET snapshot_period = ? WHERE id = 1").run(
        advancedTo,
      );
    }

    return Response.json({ ok: true, row, advancedTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "close_failed", message },
      { status: 500 },
    );
  }
}
