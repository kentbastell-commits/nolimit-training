// ⚠️ FROZEN MIRROR GUARD (2026-07-21): nolimit production moved to Postgres.
// This script talks DIRECTLY to Feishu — reads show pre-cutover data, writes
// go where production can never see them. Run only for historical inspection,
// with FEISHU_MIRROR_OK=yes.
if (process.env.FEISHU_MIRROR_OK !== "yes") {
  console.error("Refusing: Feishu is a frozen read-only mirror for nolimit since 2026-07-21 (prod is Postgres). Set FEISHU_MIRROR_OK=yes to override.");
  process.exit(1);
}
// Two production data repairs, server-run:
//   1. Backfill "Assigned Forms ID" codes (AF-<ms>-<n>) on assigned-form rows
//      that were created without one (writer alias miss, fixed in code).
//   2. Clear AI-translation placeholder junk ("请提供需要翻译…", "Please provide
//      the text…") from Form Templates / Form Questions CN columns — athletes
//      see these strings in the intake form today.
//   node scripts/fix-assignment-codes-and-junk.mjs          (dry run)
//   node scripts/fix-assignment-codes-and-junk.mjs --apply
import fs from "node:fs";
function loadEnv(p){try{for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}catch{}}
loadEnv("/opt/nolimit-training/.env");loadEnv(".env");
const APPLY = process.argv.includes("--apply");
const APP = process.env.FEISHU_BASE_APP_TOKEN;

const JUNK = [
  /^请提供需要翻译/,
  /^please provide .*(translat|text that needs|content)/i,
  /text is already in english.*no translation/i,
  /no translation (is )?needed/i,
];

async function tok(){const r=await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});return (await r.json()).tenant_access_token;}
const t = await tok();
const H = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };

const text = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => x?.text || (typeof x === "string" ? x : "")).join("");
  return v?.text || "";
};
const isJunk = (s) => JUNK.some((re) => re.test(s.trim()));

async function listAll(tableId) {
  const out = [];
  let pageToken = "";
  do {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${tableId}/records?page_size=200${pageToken ? `&page_token=${pageToken}` : ""}`;
    const d = await (await fetch(url, { headers: H })).json();
    out.push(...(d?.data?.items || []));
    pageToken = d?.data?.has_more ? d?.data?.page_token : "";
  } while (pageToken);
  return out;
}

async function update(tableId, recordId, fields, label) {
  if (!APPLY) { console.log(`  [dry] ${label}:`, JSON.stringify(fields)); return; }
  const r = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${tableId}/records/${recordId}`,
    { method: "PUT", headers: H, body: JSON.stringify({ fields }) }
  );
  const d = await r.json();
  console.log(`  ${label}: code=${d.code} ${d.code === 0 ? "ok" : JSON.stringify(d).slice(0, 150)}`);
}

/* 1 — backfill assigned-form codes */
const AF_TABLE = process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID;
const afRows = await listAll(AF_TABLE);
const missing = afRows.filter((r) => !text(r.fields?.["Assigned Forms ID"]).trim());
console.log(`assigned_forms: ${afRows.length} rows, ${missing.length} missing a code`);
let n = 0;
for (const r of missing) {
  n += 1;
  await update(AF_TABLE, r.record_id, { "Assigned Forms ID": `AF-${Date.now()}-${n}` }, `backfill ${r.record_id}`);
}

/* 2 — scrub translation junk in form templates + questions CN columns */
for (const [envVar, cols] of [
  ["FEISHU_FORM_TEMPLATES_TABLE_ID", ["Description CN", "Name CN"]],
  ["FEISHU_FORM_QUESTIONS_TABLE_ID", ["Help Text CN", "Label CN", "Question CN", "Options CN"]],
]) {
  const tableId = process.env[envVar];
  if (!tableId) continue;
  const rows = await listAll(tableId);
  let cleaned = 0;
  for (const r of rows) {
    const fields = {};
    for (const col of cols) {
      const v = text(r.fields?.[col]);
      if (v && isJunk(v)) fields[col] = "";
    }
    if (Object.keys(fields).length) {
      cleaned += 1;
      await update(tableId, r.record_id, fields, `scrub ${envVar} ${r.record_id}`);
    }
  }
  console.log(`${envVar}: ${rows.length} rows, ${cleaned} scrubbed`);
}
console.log(APPLY ? "APPLIED" : "DRY RUN — re-run with --apply");
