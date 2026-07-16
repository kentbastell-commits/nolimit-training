// Shared Feishu (Lark) Bitable access for the repository layer. The tenant
// token comes from the app-wide cache in api/_token.ts so the whole process
// (old-style handlers and the repository layer alike) shares ONE ~2h token
// instead of each layer fetching its own.
import { getTenantToken } from "../../../api/_token.ts";

const FEISHU = "https://open.feishu.cn/open-apis";

export { getTenantToken };

export function appToken(): string {
  return process.env.FEISHU_BASE_APP_TOKEN as string;
}

export async function listRecords(tableId: string): Promise<any[]> {
  const token = await getTenantToken();
  const records: any[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (pageToken) params.set("page_token", pageToken);
    const res = await fetch(
      `${FEISHU}/bitable/v1/apps/${appToken()}/tables/${tableId}/records?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    // A Feishu error payload (throttling 1254607, auth failure, bad table id)
    // must THROW — treating it as end-of-data would let callers cache an empty
    // list as if it were real. Same message format as api/_pagination.ts;
    // larkResponse lets handlers echo the raw payload in their error body.
    if (!res.ok || data?.code !== 0) {
      const error: any = new Error(
        `Feishu records scan failed for table ${tableId}: code ${data?.code} ${
          data?.msg || ""
        }`.trim()
      );
      error.larkResponse = data;
      throw error;
    }
    if (!data?.data?.items) break; // empty table — end of scan, not an error
    records.push(...data.data.items);
    pageToken = data.data.page_token || "";
    if (!data.data.has_more) break;
  } while (pageToken);
  return records;
}

export async function getFieldNames(tableId: string): Promise<string[]> {
  const token = await getTenantToken();
  const res = await fetch(
    `${FEISHU}/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json().catch(() => ({ code: -1 }));
  if (!res.ok || data.code !== 0) return [];
  return (data?.data?.items || [])
    .map((f: any) => f.field_name || f.name)
    .filter(Boolean);
}

/* ------------------------------- writes ---------------------------------- */

export async function createRecord(tableId: string, fields: Record<string, any>) {
  const token = await getTenantToken();
  const res = await fetch(
    `${FEISHU}/bitable/v1/apps/${appToken()}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  return res.json();
}

export async function updateRecord(tableId: string, recordId: string, fields: Record<string, any>) {
  const token = await getTenantToken();
  const res = await fetch(
    `${FEISHU}/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  return res.json();
}

export async function deleteRecord(tableId: string, recordId: string) {
  const token = await getTenantToken();
  const res = await fetch(
    `${FEISHU}/bitable/v1/apps/${appToken()}/tables/${tableId}/records/${recordId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}

/* --------- shared field parsing (text-first; matches the old handlers) ----- */

export function fieldText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (item.text) return item.text;
        if (item.name) return item.name;
        if (item.link) return item.link;
        if (item.url) return item.url;
        if (item.record_ids) return item.record_ids.join(", ");
        if (item.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value.text) return value.text;
  if (value.name) return value.name;
  if (value.link) return value.link;
  if (value.url) return value.url;
  if (value.record_ids) return value.record_ids.join(", ");
  if (value.link_record_ids) return value.link_record_ids.join(", ");
  return "";
}

export function formatDate(value: any, empty = ""): string {
  const text = fieldText(value);
  if (!text) return empty;
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

export function parseJsonList(raw: string): string[] {
  const clean = String(raw || "").trim();
  if (!clean) return [];
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return clean.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export function pickField(fields: Record<string, any>, candidates: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const byNorm = new Map(Object.keys(fields || {}).map((k) => [norm(k), k]));
  for (const c of candidates) {
    const hit = byNorm.get(norm(c));
    if (hit) return fieldText(fields[hit]);
  }
  return "";
}

export function linkRecordIds(value: any): string[] {
  if (!value) return [];
  const ids: string[] = [];
  const collect = (v: any) => {
    if (!v) return;
    if (Array.isArray(v.record_ids)) ids.push(...v.record_ids.filter(Boolean));
    if (Array.isArray(v.link_record_ids)) ids.push(...v.link_record_ids.filter(Boolean));
  };
  if (Array.isArray(value)) value.forEach(collect);
  else collect(value);
  return Array.from(new Set(ids));
}
