import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit config — generates SQL migrations from server/db/schema.ts and
// applies them. Requires DATABASE_URL in .env, e.g.
//   DATABASE_URL=postgres://nolimit:nolimit_dev@localhost:5432/nolimit
export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
