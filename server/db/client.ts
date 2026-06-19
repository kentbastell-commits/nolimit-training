import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

// Single shared connection pool for the whole API process. A pool (not a raw
// client) is essential under heavy traffic — it caps concurrent connections so
// Postgres isn't overwhelmed, and works behind PgBouncer in production.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;
