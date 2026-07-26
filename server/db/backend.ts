// Which data backend the API reads/writes.
//
// Production has run Postgres since 2026-07-21 and the Feishu base is a FROZEN
// read-only mirror. An unset DATA_BACKEND used to mean "feishu", so any
// environment that lost the variable — a new pm2 app, a restored .env, the
// staging twin — would silently serve months-stale data and drop every write.
// Postgres is therefore the default; "feishu" must be asked for by name.
//
// The Feishu implementations are being retired (they are no longer reachable
// in production and their only remaining caller is the transitional test
// suite). When the last test is ported, this module and the whole
// server/db/feishu tree go with it.
export type DataBackend = "feishu" | "postgres";

export const DATA_BACKEND: DataBackend =
  String(process.env.DATA_BACKEND).toLowerCase() === "feishu" ? "feishu" : "postgres";
