// Dump the ENTIRE Feishu base schema: every table, every field (name, type,
// options), plus which env var (if any) points at each table. Read-only.
// Run ON THE SERVER (nolimit Feishu creds live only in /opt/nolimit-training/.env):
//   node scripts/introspect-schema.mjs > /tmp/feishu-schema.json
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
const FEISHU = "https://open.feishu.cn/open-apis";

async function token() {
  const r = await fetch(`${FEISHU}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const d = await r.json();
  if (!d.tenant_access_token) throw new Error(`token failed: ${JSON.stringify(d)}`);
  return d.tenant_access_token;
}

async function paged(tok, url, key = "items") {
  const out = [];
  let pageToken = "";
  for (;;) {
    const u = new URL(url);
    u.searchParams.set("page_size", "100");
    if (pageToken) u.searchParams.set("page_token", pageToken);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${tok}` } });
    const d = await r.json();
    if (d.code !== 0) throw new Error(`${url} failed: ${JSON.stringify(d)}`);
    out.push(...(d.data?.[key] || []));
    if (!d.data?.has_more) return out;
    pageToken = d.data.page_token;
  }
}

// Which env var names each table id (so the dump self-documents).
const envByTableId = {};
for (const [k, v] of Object.entries(process.env)) {
  if (/^(FEISHU_|)[A-Z0-9_]*TABLE_ID$/.test(k) && String(v).startsWith("tbl")) {
    envByTableId[v] = k;
  }
}

const tok = await token();
const tables = await paged(tok, `${FEISHU}/bitable/v1/apps/${APP}/tables`);
const result = [];
for (const t of tables) {
  const fields = await paged(
    tok,
    `${FEISHU}/bitable/v1/apps/${APP}/tables/${t.table_id}/fields`
  );
  result.push({
    tableId: t.table_id,
    name: t.name,
    envVar: envByTableId[t.table_id] || null,
    fields: fields.map((f) => ({
      name: f.field_name,
      type: f.type, // Feishu numeric type; ui_type is the readable one
      uiType: f.ui_type,
      options: f.property?.options?.map((o) => o.name) || undefined,
    })),
  });
  await new Promise((r) => setTimeout(r, 150)); // gentle on rate limits
}
console.log(JSON.stringify({ dumpedAt: new Date().toISOString(), app: APP, tables: result }, null, 2));
