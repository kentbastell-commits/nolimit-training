import type { VercelRequest, VercelResponse } from "@vercel/node";

const COACHES_TABLE_ID =
  process.env.FEISHU_COACHES_TABLE_ID || "tblzFeZwc4Zby2cr";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");
  if (
    Array.isArray(value?.text_arr) ||
    Object.prototype.hasOwnProperty.call(value, "record_ids") ||
    Object.prototype.hasOwnProperty.call(value, "link_record_ids")
  ) {
    return "";
  }

  return JSON.stringify(value);
}

function formatDate(value: any): string {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const token = await getTenantToken();
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${COACHES_TABLE_ID}/records?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();

    if (!data?.data?.items) {
      return res.status(500).json({
        error: "Could not fetch coaches",
        larkResponse: data,
      });
    }

    const coaches = data.data.items.map((item: any) => {
      const fields = item.fields || {};
      const name = fieldToText(fields["Name"]);
      const coachId = fieldToText(fields["Coach ID"]);
      const email = fieldToText(fields["Email"]);
      const phoneWechat =
        fieldToText(fields["Phone/WeChat"]) ||
        fieldToText(fields["Phone/Wechat"]) ||
        fieldToText(fields["Phone"]) ||
        fieldToText(fields["Wechat"]);
      const bio = fieldToText(fields["Bio"]);

      return {
        recordId: item.record_id,
        coachId: coachId || item.record_id,
        name: name || "Unnamed Coach",
        email,
        phoneWechat,
        role: fieldToText(fields["Role"]) || "Coach",
        status: fieldToText(fields["Status"]) || "Active",
        bio,
        createdAt: formatDate(fields["Created At"]),
        hasRealData: Boolean(name || coachId || email || phoneWechat || bio),
      };
    }).filter((coach: any) => {
      return coach.hasRealData;
    }).map(({ hasRealData, ...coach }: any) => coach);

    return res.status(200).json({ coaches });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch coaches",
      message: error.message,
    });
  }
}
