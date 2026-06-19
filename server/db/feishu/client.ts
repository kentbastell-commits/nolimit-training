// Shared Feishu (Lark) Bitable access for the repository layer. Unlike the
// per-handler code it replaces, the tenant token is cached across calls — fewer
// auth round-trips under load.
const FEISHU = "https://open.feishu.cn/open-apis";

let cachedToken = "";
let tokenExpiresAt = 0;

export async function getTenantToken(): Promise<string> {
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
    if (!res.ok || data.code !== 0 || !data?.data?.items) {
      throw new Error(`Lark did not return records: ${JSON.stringify(data)}`);
    }
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
