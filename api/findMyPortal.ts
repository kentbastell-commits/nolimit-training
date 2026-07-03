import type { VercelRequest, VercelResponse } from "@vercel/node";

// Portal recovery for digital clients who lost their login code: exact match
// on the Phone/WeChat they registered with, plus a fuzzy name check so a
// phone number alone can't be used to enumerate portals.

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    if (item?.name) return item.name;
    return "";
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

function normText(v?: string) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/gi, " ")
    .trim();
}

function textMatches(a?: string, b?: string) {
  const na = normText(a);
  const nb = normText(b);
  return Boolean(na && nb && (na === nb || na.includes(nb) || nb.includes(na)));
}

async function getToken() {
  const res = await fetch(
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
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error("Could not get Feishu token");
  return data.tenant_access_token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { phone, name } = req.body || {};
  if (!phone || !name)
    return res.status(400).json({ error: "phone and name required" });

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  if (!appToken || !clientsTableId)
    return res.status(500).json({ error: "Server not configured" });

  try {
    const token = await getToken();
    const searchRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${clientsTableId}/records?page_size=10&filter=CurrentValue.[Phone/WeChat]="${encodeURIComponent(
        String(phone).trim()
      )}"`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    const items = (searchData?.data?.items || []) as any[];

    const match = items.find((item) => {
      const fullName =
        fieldToText(item.fields?.["Full Name"]) ||
        fieldToText(item.fields?.["Full Name CN"]);
      const fullNameCn = fieldToText(item.fields?.["Full Name CN"]);
      return (
        textMatches(fullName, String(name)) ||
        textMatches(fullNameCn, String(name))
      );
    });

    const clientCode = match ? fieldToText(match.fields?.["Client ID"]) : "";

    if (!clientCode) {
      // Deliberately generic — do not reveal whether the phone exists.
      return res
        .status(404)
        .json({ error: "No portal found for that phone and name" });
    }

    return res.status(200).json({ success: true, clientCode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "Lookup failed", message });
  }
}
