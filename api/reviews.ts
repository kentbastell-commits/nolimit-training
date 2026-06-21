import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

function toBool(value: any): boolean {
  return value === true || fieldToText(value).toLowerCase() === "true";
}

function normalizeDate(value: any) {
  const text = fieldToText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T12:00:00Z`).getTime();
}

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

async function getTableFieldNames(token: string): Promise<Set<string> | null> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_REVIEWS_TABLE_ID}/fields?page_size=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  if (!response.ok || data.code !== 0) return null;
  return new Set(
    (data?.data?.items || [])
      .map((field: any) => field.field_name || field.name)
      .filter(Boolean)
  );
}

function filterFields(fields: Record<string, any>, available: Set<string> | null) {
  const out: Record<string, any> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (available && !available.has(name)) continue;
    out[name] = value;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.FEISHU_REVIEWS_TABLE_ID) {
    return res.status(500).json({ error: "Missing FEISHU_REVIEWS_TABLE_ID" });
  }

  try {
    const token = await getTenantToken();

    if (req.method === "GET") {
      const programId = String(req.query.programId || "");
      const clientId = String(req.query.clientId || "");
      const storeOnly = String(req.query.storeOnly || "") === "1";

      const items = await fetchAllBitableRecords(
        process.env.FEISHU_BASE_APP_TOKEN as string,
        process.env.FEISHU_REVIEWS_TABLE_ID as string,
        token
      );

      const reviews = items
        .map((item: any) => {
          const f = item.fields || {};
          return {
            recordId: item.record_id,
            reviewId: fieldToText(f["Review ID"]),
            clientId: fieldToText(f["Client ID"]),
            clientName: fieldToText(f["Client Name"]),
            programId: fieldToText(f["Program ID"]),
            programName: fieldToText(f["Program Name"]),
            rating: Number(fieldToText(f.Rating)) || 0,
            quote: fieldToText(f.Quote),
            showOnStore: toBool(f["Show On Store"]),
            approved: toBool(f.Approved),
            submittedDate: normalizeDate(f["Submitted Date"]),
          };
        })
        .filter((r: any) => {
          if (programId && r.programId !== programId) return false;
          if (clientId && r.clientId !== clientId) return false;
          if (storeOnly && !(r.showOnStore && r.approved)) return false;
          return true;
        })
        .sort((a: any, b: any) => b.submittedDate.localeCompare(a.submittedDate));

      return res.status(200).json({ reviews });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      recordId,
      clientId,
      clientName,
      programId,
      programName,
      rating,
      quote,
      showOnStore,
      approved,
    } = req.body;

    const available = await getTableFieldNames(token);

    // Coach update (approve / toggle store visibility) on an existing review.
    if (recordId) {
      const updates: Record<string, any> = {};
      if (approved !== undefined) updates.Approved = Boolean(approved);
      if (showOnStore !== undefined) updates["Show On Store"] = Boolean(showOnStore);
      const fields = filterFields(updates, available);
      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      const r = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_REVIEWS_TABLE_ID}/records/${recordId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields }),
        }
      );
      const data = await r.json();
      if (data.code !== 0) {
        return res.status(500).json({ error: "Could not update review", larkResponse: data });
      }
      return res.status(200).json({ success: true, recordId });
    }

    // New review from a client.
    if (!rating) {
      return res.status(400).json({ error: "Missing rating" });
    }

    const candidate: Record<string, any> = {
      "Review ID": `REV-${Date.now()}`,
      "Client ID": clientId ? String(clientId) : undefined,
      "Client Name": clientName ? String(clientName) : undefined,
      "Program ID": programId ? String(programId) : undefined,
      "Program Name": programName ? String(programName) : undefined,
      Rating: Number(rating) || undefined,
      Quote: quote ? String(quote) : undefined,
      "Show On Store": Boolean(showOnStore),
      Approved: false,
      "Submitted Date": toLarkDate(new Date().toISOString().split("T")[0]),
    };
    const fields = filterFields(candidate, available);

    const r = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_REVIEWS_TABLE_ID}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
    const data = await r.json();
    if (data.code !== 0) {
      return res.status(500).json({
        error: "Could not create review",
        larkResponse: data,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({ success: true, recordId: data.data.record.record_id });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
