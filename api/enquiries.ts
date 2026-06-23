import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : item?.text || item?.name || ""
      )
      .join(", ");
  }
  return value?.text || value?.name || "";
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const tableId = process.env.FEISHU_ENQUIRIES_TABLE_ID;
  if (!tableId) return res.status(200).json({ enquiries: [] });

  try {
    const cached = getCached("enquiries");
    if (cached) return res.status(200).json({ enquiries: cached });

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

    const items = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      tableId,
      tokenData.tenant_access_token
    );

    const enquiries = items
      .map((item: any) => {
        const f = item.fields || {};
        return {
          recordId: item.record_id,
          enquiryId: fieldToText(f["Enquiry ID"]),
          contactPerson: fieldToText(f["Contact Person"]),
          contact: fieldToText(f["Contact"]),
          organization: fieldToText(f["Organization"]),
          athletes: fieldToText(f["Athletes"]),
          duration: fieldToText(f["Duration"]),
          notes: fieldToText(f["Notes"]),
          submittedDate: fieldToText(f["Submitted Date"]),
          status: fieldToText(f["Status"]),
        };
      })
      .sort((a: any, b: any) => b.submittedDate.localeCompare(a.submittedDate));

    setCached("enquiries", enquiries, 5 * 60 * 1000);
    return res.status(200).json({ enquiries });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
