// One-off setup, run ON THE SERVER (nolimit Feishu creds live only there):
//   node scripts/setup-store-fields.mjs          (dry: prints plan, no writes)
//   node scripts/setup-store-fields.mjs --apply   (performs writes)
//
// 1. Adds a "Compare At Price" (Number) column to Programs if missing — an
//    optional struck-through "was" price so store items can show a discount
//    while Price stays the real charge.
// 2. Recategorises Elite Climbing 1 (PR-4545) from keyword-guessed "joint-addons"
//    to an explicit Rock Climbing store category.
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");

function loadEnv(path) {
  try {
    for (const line of fs.readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv("/opt/nolimit-training/.env");
loadEnv(".env");

const APP = process.env.FEISHU_BASE_APP_TOKEN;
const TABLE = process.env.FEISHU_PROGRAMS_TABLE_ID;
const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}`;

async function token() {
  const r = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const d = await r.json();
  if (!d.tenant_access_token) throw new Error("no token: " + JSON.stringify(d));
  return d.tenant_access_token;
}

const t = await token();
const H = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };

// --- 1. Compare At Price column ---
const fr = await fetch(`${base}/fields?page_size=200`, { headers: H });
const fd = await fr.json();
const names = (fd?.data?.items || []).map((f) => f.field_name);
const hasCompare = names.includes("Compare At Price");
console.log(`Compare At Price column exists: ${hasCompare}`);
if (!hasCompare) {
  if (APPLY) {
    const cr = await fetch(`${base}/fields`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        field_name: "Compare At Price",
        type: 2, // Number
        property: { formatter: "0" },
      }),
    });
    const cd = await cr.json();
    console.log(`  -> create Compare At Price: code=${cd.code} ${cd.msg || ""}`);
  } else {
    console.log("  -> [dry] would create Compare At Price (Number)");
  }
}

// --- 2. Recategorise Elite Climbing 1 ---
const ELITE_REC = "recvmd2DXTnXM8"; // PR-4545 Elite Climbing 1
const catFields = {
  "Store Category": "Rock Climbing",
  "Store Category CN": "攀岩",
  "Store Listing Type": "Main",
  Sport: "Rock Climbing",
};
console.log(`\nRecategorise Elite Climbing 1 -> ${JSON.stringify(catFields)}`);
if (APPLY) {
  const ur = await fetch(`${base}/records/${ELITE_REC}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({ fields: catFields }),
  });
  const ud = await ur.json();
  console.log(`  -> update: code=${ud.code} ${ud.msg || ""}`);
} else {
  console.log("  -> [dry] would update Elite Climbing 1 category");
}

console.log(APPLY ? "\nAPPLIED." : "\nDRY RUN — re-run with --apply to write.");
