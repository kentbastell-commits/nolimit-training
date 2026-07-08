// One-off: inspect the Programs table schema + current records.
// Run ON THE SERVER (nolimit Feishu creds live only in /opt/nolimit-training/.env).
//   node scripts/inspect-programs.mjs
import fs from "node:fs";

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

const TYPE = {
  1: "Text",
  2: "Number",
  3: "SingleSelect",
  4: "MultiSelect",
  5: "DateTime",
  7: "Checkbox",
  11: "User",
  13: "Phone",
  15: "URL",
  17: "Attachment",
  18: "Link",
  19: "Lookup",
  20: "Formula",
  21: "DuplexLink",
  22: "Location",
  23: "GroupChat",
  1001: "CreatedTime",
  1002: "ModifiedTime",
  1003: "CreatedUser",
  1004: "ModifiedUser",
  1005: "AutoNumber",
};

const t = await token();

// --- fields ---
const fr = await fetch(
  `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}/fields?page_size=200`,
  { headers: { Authorization: `Bearer ${t}` } }
);
const fd = await fr.json();
console.log("=== FIELDS ===");
for (const f of fd?.data?.items || []) {
  console.log(`  ${f.field_name}  [${TYPE[f.type] || f.type}]`);
}

// --- records ---
let items = [];
let pageToken = "";
do {
  const url = new URL(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}/records`
  );
  url.searchParams.set("page_size", "200");
  if (pageToken) url.searchParams.set("page_token", pageToken);
  const rr = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  const rd = await rr.json();
  items = items.concat(rd?.data?.items || []);
  pageToken = rd?.data?.has_more ? rd.data.page_token : "";
} while (pageToken);

const txt = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v))
    return v.map((x) => x?.text || x?.name || x?.link || x).join(",");
  return v.text || v.name || JSON.stringify(v);
};

console.log(`\n=== ${items.length} PROGRAM RECORDS ===`);
for (const it of items) {
  const f = it.fields || {};
  console.log(
    JSON.stringify({
      recordId: it.record_id,
      programId: txt(f["Program ID"]),
      name: txt(f["Program Name"]),
      productType: txt(f["Product Type"]),
      price: txt(f["Price"]),
      storeVisible: Boolean(f["Public Store Visible"]),
      storeCategory: txt(f["Store Category"]),
      storeListingType: txt(f["Store Listing Type"]),
      bundleIds: txt(f["Bundle Program IDs"]),
      sport: txt(f["Sport"]),
    })
  );
}
