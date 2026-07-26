// Helpers for handler tests that run against a real local Postgres.
//
// These replace the Feishu-stubbed tests: instead of asserting that a handler
// sent the right HTTP request to Feishu, they assert what actually landed in
// the database. That is the layer where the expensive bugs have lived — a
// column that doesn't exist, a name written into a foreign key, a payment
// status that unlocks when it shouldn't — none of which a stubbed fetch can
// see.
import { pool } from "../../../server/db/client.ts";
import { invalidateCache } from "../../../api/_cache.ts";

export { makeReq, makeRes } from "../helpers.ts";

// Read the table list from the database rather than hardcoding it, so a new
// migration can never leave a table un-truncated (and a renamed one can never
// break every test with "relation does not exist").
let tableCache: string[] | null = null;

async function allTables(): Promise<string[]> {
  if (tableCache) return tableCache;
  const result = await pool.query(
    `select table_name from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name not like '\\_\\_%'`
  );
  tableCache = result.rows.map((r) => r.table_name as string);
  return tableCache;
}

/**
 * Empty every table and drop the in-process read cache.
 *
 * The cache matters as much as the truncation: api/_cache.ts holds reads for
 * 5-10 minutes, so without this a later test would be served a previous
 * test's rows and pass for the wrong reason.
 */
export async function resetDb() {
  const tables = await allTables();
  await pool.query(
    `truncate table ${tables.map((t) => `"${t}"`).join(", ")} restart identity cascade`
  );
  invalidateCache(""); // every key starts with "" — clears the lot
}

export async function closeDb() {
  await pool.end();
}

/** Raw row access for assertions — deliberately not going through the repos. */
export async function rows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function seedClient(
  overrides: Record<string, any> = {}
): Promise<Record<string, any>> {
  const values = {
    client_id: "CL-9001",
    full_name: "Test Athlete",
    phone: "13800000000",
    ...overrides,
  };
  const keys = Object.keys(values);
  const result = await pool.query(
    `insert into clients (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})
     returning *`,
    Object.values(values)
  );
  return result.rows[0];
}

export async function seedProgram(
  overrides: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Column is `name`, not `program_name` — verified against the live schema.
  const values = {
    program_id: "PR-1001",
    name: "Test Program",
    ...overrides,
  };
  const keys = Object.keys(values);
  const result = await pool.query(
    `insert into programs (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})
     returning *`,
    Object.values(values)
  );
  return result.rows[0];
}
