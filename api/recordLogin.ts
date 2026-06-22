import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { fetchAllBitableRecords } from "./_pagination.ts";

function fieldToText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((i) =>
        typeof i === "string" ? i : i?.text || (i?.name ?? "")
      )
      .filter(Boolean)
      .join(", ");
  }
  return value?.text || value?.name || "";
}

// Stamp a client's "Last Login" with the current time. Called when an athlete
// opens their portal. Resolves the row by record_id or by Client ID code.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { clientRecordId, clientCode } = req.body || {};
    if (!clientRecordId && !clientCode) {
      return res.status(400).json({ error: "Missing clientRecordId or clientCode" });
    }

    const tokenResponse = await fetch(
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
    const tokenData = await tokenResponse.json();
    const token = tokenData.tenant_access_token;
    if (!token) {
      return res.status(500).json({ error: "Could not get Lark token" });
    }

    let recordId = clientRecordId as string | undefined;
    if (!recordId) {
      const items = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_CLIENTS_TABLE_ID as string,
        token
      );
      const match = items.find(
        (it: any) => fieldToText(it.fields?.["Client ID"]) === String(clientCode)
      );
      recordId = match?.record_id;
    }
    if (!recordId) {
      return res.status(404).json({ error: "Client not found" });
    }

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CLIENTS_TABLE_ID}/records/${recordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: { "Last Login": Date.now() } }),
      }
    );
    const data = await response.json();
    if (!response.ok || data.code !== 0) {
      // Soft-fail: a missing column or transient error shouldn't break the portal.
      return res.status(200).json({ success: false, larkResponse: data });
    }
    invalidateCache("clients");
    return res.status(200).json({ success: true, recordId });
  } catch (error: any) {
    return res.status(200).json({ success: false, message: error.message });
  }
}
