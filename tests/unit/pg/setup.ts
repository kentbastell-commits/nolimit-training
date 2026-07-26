// Redirects the connection pool at the LOCAL test database before any module
// under test imports server/db/client.ts (which builds its pool eagerly at
// import time). Vitest runs setupFiles first, and dotenv never overrides a
// variable that is already set, so writing process.env here wins.
//
// Create the database with:  node --env-file=.env scripts/setupTestDb.mjs
import "dotenv/config";

const TEST_DB = "nolimit_test";

const source = process.env.DATABASE_URL;
if (!source) {
  throw new Error(
    "DATABASE_URL is not set. Postgres handler tests need a local database — " +
      "see scripts/setupTestDb.mjs."
  );
}

const url = new URL(source);

// Hard stop: these tests truncate every table between cases. They must never
// be able to reach a remote database, whatever .env happens to contain.
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  throw new Error(
    `Refusing to run Postgres tests against ${url.hostname}. ` +
      "They truncate tables and are local-only by design."
  );
}
if (url.pathname === `/${TEST_DB}`) {
  // already pointed at the test database
} else {
  url.pathname = `/${TEST_DB}`;
  process.env.DATABASE_URL = url.toString();
}

// These tests exercise the path production actually runs.
process.env.DATA_BACKEND = "postgres";
