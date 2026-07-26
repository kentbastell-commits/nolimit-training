// Creates/refreshes the LOCAL test database used by the Postgres handler
// tests. Never touches the dev database (nolimit) or anything remote: it
// derives its target by swapping the database name on DATABASE_URL for
// nolimit_test, and refuses to run against a non-local host.
//
//   node --env-file=.env scripts/setupTestDb.mjs [--drop]
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const TEST_DB = "nolimit_test";
const MIGRATIONS = "server/db/migrations";

const source = process.env.DATABASE_URL;
if (!source) {
  console.error("DATABASE_URL is not set — run with `node --env-file=.env`.");
  process.exit(1);
}

const url = new URL(source);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  console.error(
    `Refusing to run: DATABASE_URL points at ${url.hostname}, not localhost. ` +
      "The test database is local-only by design."
  );
  process.exit(1);
}

const adminUrl = new URL(url);
adminUrl.pathname = "/postgres";
const testUrl = new URL(url);
testUrl.pathname = `/${TEST_DB}`;

const drop = process.argv.includes("--drop");

async function main() {
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  const existing = await admin.query("select 1 from pg_database where datname = $1", [TEST_DB]);
  if (existing.rowCount && drop) {
    await admin.query(`drop database ${TEST_DB}`);
    console.log(`dropped ${TEST_DB}`);
  }
  if (!existing.rowCount || drop) {
    await admin.query(`create database ${TEST_DB}`);
    console.log(`created ${TEST_DB}`);
  } else {
    console.log(`${TEST_DB} already exists — reapplying migrations`);
  }
  await admin.end();

  const client = new pg.Client({ connectionString: testUrl.toString() });
  await client.connect();

  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8");
    // Drizzle separates statements with this marker.
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    let applied = 0;
    for (const statement of statements) {
      try {
        await client.query(statement);
        applied++;
      } catch (error) {
        // Re-running against an existing database is expected to hit
        // "already exists"; anything else is a real problem.
        if (!/already exists|duplicate/i.test(error.message)) {
          console.error(`\n${file} failed:\n${statement.slice(0, 200)}\n${error.message}`);
          process.exit(1);
        }
      }
    }
    console.log(`  ${file}: ${applied}/${statements.length} statements`);
  }

  const tables = await client.query(
    "select count(*)::int n from information_schema.tables where table_schema='public'"
  );
  console.log(`\n${TEST_DB} ready — ${tables.rows[0].n} tables`);
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
