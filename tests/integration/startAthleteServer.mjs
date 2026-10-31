// Local-only integration fixture. Production handlers and compiled React UI;
// synthetic accounts, a separate database, and no external requests.
import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const database = "nolimit_athlete_sessions_e2e";
const source = new URL(process.env.DATABASE_URL || "invalid:");
if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(source.hostname)) throw new Error("Integration database must be local");
const adminUrl = new URL(source); adminUrl.pathname = "/postgres";
const admin = new pg.Client({ connectionString: adminUrl.toString() }); await admin.connect();
if (!(await admin.query("select 1 from pg_database where datname=$1", [database])).rowCount) await admin.query(`create database ${database}`);
await admin.end(); source.pathname = `/${database}`;
const pool = new pg.Pool({ connectionString: source.toString() });
await migrate(drizzle(pool), { migrationsFolder: "server/db/migrations" });
const tables = (await pool.query("select tablename from pg_tables where schemaname='public'")).rows.map(r => `"${r.tablename}"`);
if (tables.length) await pool.query(`truncate ${tables.join(",")} restart identity cascade`);
await pool.query(`insert into clients(client_id,full_name,phone,login_pin,client_type,package_type,subscription_status,language_preference)
  values('CL-9001','Session Athlete A','13800009001','123456','Online Coaching','Active','Active','English'),
        ('CL-9002','Session Athlete B','13800009002','654321','Online Coaching','Active','Active','English')`);
await pool.query("insert into programs(program_id,name) values('PR-SESSION','Session fixture')");
await pool.query(`insert into assigned_workouts(assigned_workout_id,client_id,program_id,is_draft)
  values('AW-SESSION-A','CL-9001','PR-SESSION',false),('AW-SESSION-B','CL-9002','PR-SESSION',false),('AW-SESSION-DRAFT','CL-9001','PR-SESSION',true)`);
await pool.end();
Object.assign(process.env, {
  DATABASE_URL: source.toString(), PORT: "5198", ATHLETE_SESSION_MODE: process.argv.includes("--compat") ? "compat" : "required", COACH_ACCESS_KEY: "local-e2e-coach",
  CHECKOUT_TOKEN_SECRET: "local-e2e-checkout", FEISHU_BOT_WEBHOOK_URL: "", AI_API_KEY: "", TENCENT_TMT_SECRET_ID: "", TENCENT_TMT_SECRET_KEY: "",
  WECHAT_OA_APPID: "", WECHAT_OA_SECRET: "", WECHAT_MINI_APPID: "", WECHAT_MINI_SECRET: "", WXPAY_MCHID: "", WXPAY_APIV3_KEY: "",
});
const nativeFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  const target = new URL(typeof url === "string" || url instanceof URL ? url : url.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) return Promise.reject(new Error("External calls disabled in integration fixture"));
  return nativeFetch(url, init);
};
await import("../../server/index.ts");
