/**
 * Seed strategy — Phase 1 (parity with MOCK_SNAPSHOT)
 *
 * Source of truth for manual bootstrap:
 * - `schema.sql` — DDL (SQLite)
 * - `seed.sql` — INSERTs mirroring `src/lib/mock-data.ts`
 *
 * How to apply (local dev, no app dependency):
 *   sqlite3 wealth-os.db < src/lib/db/schema.sql
 *   sqlite3 wealth-os.db < src/lib/db/seed.sql
 *
 * Principles:
 * - Single user row: `users.id = 1` (enforced by CHECK)
 * - Monetary amounts stored as INTEGER minor units are NOT used — whole currency units (TRY) as in mock
 * - `goals`: `monthly_required` is derived (floor(remaining/months)); `status_override`
 *   matches MOCK_SNAPSHOT labels until a pure derivation rule replaces it
 * - `plan_variants` are global templates (no user_id)
 * - Scenarios store nested `parameters` and `result` as JSON strings for SQLite simplicity
 *
 * Next phase: wire `better-sqlite3` (or similar) + run migrations/seed from npm script.
 */

export {};
