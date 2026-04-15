import path from "path";
import Database from "better-sqlite3";

declare global {
  // eslint-disable-next-line no-var -- singleton for dev hot reload
  var __wealthSqliteDb: Database.Database | undefined;
}

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }
  return path.join(process.cwd(), "data", "wealth-os.db");
}

/**
 * Single shared SQLite connection (Node runtime only).
 * Reused across API route invocations in dev to avoid handle leaks.
 */
export function getDatabase(): Database.Database {
  if (globalThis.__wealthSqliteDb) {
    return globalThis.__wealthSqliteDb;
  }
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  globalThis.__wealthSqliteDb = db;
  return db;
}
