// Add a "Season" (Number) column to Programs if missing. Server-only.
//   node scripts/add-season-field.mjs --apply
import fs from "node:fs";
function loadEnv(p){try{for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}catch{}}
loadEnv("/opt/nolimit-training/.env");loadEnv(".env");
const APPLY=process.argv.includes("--apply");
const APP=process.env.FEISHU_BASE_APP_TOKEN,TABLE=process.env.FEISHU_PROGRAMS_TABLE_ID;
const base=`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}`;
async function tok(){const r=await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});return (await r.json()).tenant_access_token;}
const t=await tok();const H={Authorization:`Bearer ${t}`,"Content-Type":"application/json"};
const fd=await(await fetch(`${base}/fields?page_size=200`,{headers:H})).json();
const has=(fd?.data?.items||[]).some(f=>f.field_name==="Season");
console.log(`Season column exists: ${has}`);
if(!has){
  if(APPLY){const r=await fetch(`${base}/fields`,{method:"POST",headers:H,body:JSON.stringify({field_name:"Season",type:2,property:{formatter:"0"}})});const d=await r.json();console.log(`  create Season: code=${d.code} ${d.msg||""}`);}
  else console.log("  [dry] would create Season (Number)");
}
console.log(APPLY?"APPLIED":"DRY");
