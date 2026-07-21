// ⚠️ FROZEN MIRROR GUARD (2026-07-21): nolimit production moved to Postgres.
// This script talks DIRECTLY to Feishu — reads show pre-cutover data, writes
// go where production can never see them. Run only for historical inspection,
// with FEISHU_MIRROR_OK=yes.
if (process.env.FEISHU_MIRROR_OK !== "yes") {
  console.error("Refusing: Feishu is a frozen read-only mirror for nolimit since 2026-07-21 (prod is Postgres). Set FEISHU_MIRROR_OK=yes to override.");
  process.exit(1);
}
// Inspect recent Product Orders for the CART TEST clients. Server-only.
import fs from "node:fs";
function loadEnv(p){try{for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(!process.env[m[1]])process.env[m[1]]=v;}}catch{}}
loadEnv("/opt/nolimit-training/.env");loadEnv(".env");
const APP=process.env.FEISHU_BASE_APP_TOKEN;
const TABLE=process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID||"tbllinXYFDiUboKX";
async function tok(){const r=await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});const d=await r.json();return d.tenant_access_token;}
const t=await tok();const H={Authorization:`Bearer ${t}`};
const txt=(v)=>{if(v==null)return"";if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v))return v.map(x=>x?.text||x?.name||x).join(",");return v.text||v.name||"";};
let items=[],pt="";
do{const u=new URL(`https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}/records`);u.searchParams.set("page_size","200");if(pt)u.searchParams.set("page_token",pt);const r=await fetch(u,{headers:H});const d=await r.json();items=items.concat(d?.data?.items||[]);pt=d?.data?.has_more?d.data.page_token:"";}while(pt);
const test=items.filter(it=>/CART TEST/i.test(txt(it.fields?.["Client Name"])));
console.log(`Total orders in table: ${items.length}; CART TEST orders: ${test.length}\n`);
for(const it of test){const f=it.fields||{};console.log(JSON.stringify({order:txt(f["Order ID"]),client:txt(f["Client Name"]),product:txt(f["Product Name"]),amount:txt(f["Amount"]),pay:txt(f["Payment Status"]),fulfil:txt(f["Fulfillment Status"]||f["Onboarding Status"])}));}
