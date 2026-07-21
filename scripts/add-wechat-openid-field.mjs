// ⚠️ FROZEN MIRROR GUARD (2026-07-21): nolimit production moved to Postgres.
// This script talks DIRECTLY to Feishu — reads show pre-cutover data, writes
// go where production can never see them. Run only for historical inspection,
// with FEISHU_MIRROR_OK=yes.
if (process.env.FEISHU_MIRROR_OK !== "yes") {
  console.error("Refusing: Feishu is a frozen read-only mirror for nolimit since 2026-07-21 (prod is Postgres). Set FEISHU_MIRROR_OK=yes to override.");
  process.exit(1);
}
// Add a "WeChat OpenID" (Text) column to Clients if missing. Server-only.
//   node scripts/add-wechat-openid-field.mjs --apply
import fs from "node:fs";
function loadEnv(p){try{for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}catch{}}
loadEnv("/opt/nolimit-training/.env");loadEnv(".env");
const APPLY=process.argv.includes("--apply");
const APP=process.env.FEISHU_BASE_APP_TOKEN,TABLE=process.env.FEISHU_CLIENTS_TABLE_ID;
const base=`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}`;
async function tok(){const r=await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});return (await r.json()).tenant_access_token;}
const t=await tok();const H={Authorization:`Bearer ${t}`,"Content-Type":"application/json"};
const fd=await(await fetch(`${base}/fields?page_size=200`,{headers:H})).json();
const has=(fd?.data?.items||[]).some(f=>f.field_name==="WeChat OpenID");
console.log(`WeChat OpenID column exists: ${has}`);
if(!has){
  if(APPLY){const r=await fetch(`${base}/fields`,{method:"POST",headers:H,body:JSON.stringify({field_name:"WeChat OpenID",type:1})});const d=await r.json();console.log(`  create WeChat OpenID: code=${d.code} ${d.msg||""}`);}
  else console.log("  [dry] would create WeChat OpenID (Text)");
}
console.log(APPLY?"APPLIED":"DRY");
