import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

async function getTenantToken() {
  const response = await fetch(
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
  const data = await response.json();
  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const tableId = process.env.FEISHU_ENQUIRIES_TABLE_ID;
  if (!tableId) {
    return res.status(500).json({ error: "Missing FEISHU_ENQUIRIES_TABLE_ID" });
  }

  try {
    const {
      contactPerson,
      contact,
      organization,
      athletes,
      duration,
      notes,
      privacyAccepted,
      crossBorderAccepted,
    } = req.body || {};

    if (!contactPerson || !contact) {
      return res
        .status(400)
        .json({ error: "Please add a contact person and a way to reach you." });
    }
    if (privacyAccepted !== true || crossBorderAccepted !== true) {
      return res.status(400).json({ error: "Privacy and cross-border consent required" });
    }

    const fields: Record<string, any> = {
      "Enquiry ID": `ENQ-${Date.now()}`,
      "Contact Person": String(contactPerson || ""),
      Contact: String(contact || ""),
      Organization: String(organization || ""),
      Athletes: String(athletes || ""),
      Duration: String(duration || ""),
      Notes: String(notes || ""),
      "Submitted Date": new Date().toISOString().split("T")[0],
      Status: "New",
    };

    const token = await getTenantToken();
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
    const data = await response.json();

    if (!response.ok || data.code !== 0) {
      return res.status(500).json({
        error: "Could not save enquiry",
        larkResponse: data,
        fieldsSent: fields,
      });
    }

    invalidateCache("enquiries");

    return res.status(200).json({
      success: true,
      recordId: data?.data?.record?.record_id,
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
