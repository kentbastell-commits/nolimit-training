// ETL — extract layer. Reads Feishu Bitable records and parses field values.
// No database dependencies, so this (and the dry-run) runs anywhere with the
// Feishu credentials, before Postgres exists.

const FEISHU = "https://open.feishu.cn/open-apis";

let cachedToken = "";
let tokenExpiresAt = 0;

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;
  const res = await fetch(`${FEISHU}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.tenant_access_token) {
    throw new Error(`Could not get Feishu token: ${JSON.stringify(data)}`);
  }
  cachedToken = data.tenant_access_token;
  tokenExpiresAt = now + ((data.expire ? data.expire - 300 : 5400) * 1000);
  return cachedToken;
}

export type FeishuRecord = { record_id: string; fields: Record<string, any> };

export async function listAll(tableId: string): Promise<FeishuRecord[]> {
  const token = await getToken();
  const app = process.env.FEISHU_BASE_APP_TOKEN as string;
  const out: FeishuRecord[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${FEISHU}/bitable/v1/apps/${app}/tables/${tableId}/records`);
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data?.data?.items) break;
    out.push(...data.data.items);
    pageToken = data.data.has_more ? data.data.page_token : "";
  } while (pageToken);
  return out;
}

/* ----------------------------- field parsers ----------------------------- */

function itemText(it: any): string {
  if (it == null) return "";
  if (typeof it === "string") return it;
  if (typeof it === "number") return String(it);
  if (it.text) return String(it.text);
  if (Array.isArray(it.text_arr) && it.text_arr.length) {
    return it.text_arr.filter(Boolean).join(", ");
  }
  if (it.name) return String(it.name);
  return "";
}

// Plain text. Link fields return "" here (use linkRecordIds for those) — this
// is the fix that prevents raw Feishu link blobs leaking into data.
export function fieldText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.map(itemText).filter(Boolean).join(", ");
  return itemText(v);
}

export function textOrNull(v: any): string | null {
  const t = fieldText(v).trim();
  return t === "" ? null : t;
}

export function fieldNum(v: any): number | null {
  if (typeof v === "number") return v;
  const t = fieldText(v).trim();
  if (t === "") return null;
  const n = Number(t.replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function fieldBool(v: any): boolean | null {
  if (typeof v === "boolean") return v;
  const t = fieldText(v).toLowerCase().trim();
  if (t === "") return null;
  return ["true", "yes", "1", "checked", "y"].includes(t);
}

export function fieldDateMs(v: any): number | null {
  if (typeof v === "number") return v;
  const t = fieldText(v).trim();
  if (t === "") return null;
  if (/^\d+$/.test(t)) return Number(t);
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

// Multi-select (e.g. Equipment) → string[].
export function fieldArr(v: any): string[] | null {
  if (Array.isArray(v)) {
    const arr = v
      .map((x) => (typeof x === "string" ? x : x?.text || x?.name || ""))
      .filter(Boolean);
    return arr.length ? arr : null;
  }
  const t = fieldText(v).trim();
  if (t === "") return null;
  const arr = t.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

// JSON stored in a text field (tags/categories) → string[].
export function fieldJsonArr(v: any): string[] | null {
  const t = fieldText(v).trim();
  if (t === "") return null;
  try {
    const p = JSON.parse(t);
    if (Array.isArray(p)) return p.map(String).filter(Boolean);
  } catch {
    const arr = t.split(",").map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  return null;
}

// JSON blob (options / answers / positions / groups) → object/array.
export function fieldJson(v: any): unknown {
  if (v == null) return null;
  const t = fieldText(v).trim();
  if (t === "") return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

// Link field → the referenced Feishu record_ids.
export function linkRecordIds(v: any): string[] {
  if (!v) return [];
  const ids: string[] = [];
  const collect = (x: any) => {
    if (!x) return;
    if (Array.isArray(x.record_ids)) ids.push(...x.record_ids.filter(Boolean));
    if (Array.isArray(x.link_record_ids)) ids.push(...x.link_record_ids.filter(Boolean));
  };
  if (Array.isArray(v)) v.forEach(collect);
  else collect(v);
  return Array.from(new Set(ids));
}
