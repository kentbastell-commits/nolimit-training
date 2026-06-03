import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const appId = process.env.LARK_APP_ID;
    const appSecret = process.env.LARK_APP_SECRET;
    const baseToken = process.env.LARK_BASE_APP_TOKEN;
    const tableId = process.env.LARK_CLIENTS_TABLE_ID;

    if (!appId || !appSecret || !baseToken || !tableId) {
      return res.status(500).json({
        error: "Missing environment variables",
      });
    }

    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get tenant access token",
        details: tokenData,
      });
    }

    const recordsResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records?page_size=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const recordsData = await recordsResponse.json();

    if (recordsData.code !== 0) {
      return res.status(500).json({
        error: "Could not fetch clients from Lark Base",
        details: recordsData,
      });
    }

    const clients = recordsData.data.items.map((item: any) => {
      const fields = item.fields || {};

      const name =
        fields["Full Name"] ||
        fields["Client Name"] ||
        fields["Name"] ||
        fields["姓名"] ||
        "Unnamed Client";

      return {
        id: item.record_id,
        name,
        initials: String(name)
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        activity: fields["Last Activity"] || "--",
        training: fields["Last 7d Training"] || "--",
        program:
          fields["Current Program"] ||
          fields["Program"] ||
          fields["Assigned Program"] ||
          "--",
        status: fields["Status"] || "Active",
      };
    });

    return res.status(200).json({ clients });
  } catch (error: any) {
    return res.status(500).json({
      error: "Unexpected server error",
      message: error.message,
    });
  }
}