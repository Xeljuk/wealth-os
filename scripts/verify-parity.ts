/**
 * Compares buildMonthlySnapshot() output to MOCK_SNAPSHOT (deep equality).
 * Run: npm run verify-parity (requires data/wealth-os.db from schema + seed).
 */
import assert from "node:assert/strict";
import path from "path";
import Database from "better-sqlite3";
import { MOCK_SNAPSHOT } from "../src/lib/mock-data";
import { buildMonthlySnapshot } from "../src/server/services/snapshot-builder";

const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "data", "wealth-os.db");

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const built = buildMonthlySnapshot(db, 1);
db.close();

try {
  assert.deepEqual(built, MOCK_SNAPSHOT);
  console.log("Parity OK: snapshot matches MOCK_SNAPSHOT.");
  process.exit(0);
} catch (e) {
  console.error("Parity mismatch:", e);
  process.exit(1);
}
