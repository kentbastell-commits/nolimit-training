import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    const recordsResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_CLIENTS_TABLE_ID}/records?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const recordsData = await recordsResponse.json();

    const clients = recordsData.data.items.map((item: any) => {
      const fields = item.fields || {};
      const name = fields["Full Name"] || "Unnamed Client";
      const clientCode = fields["Client ID"] || "";

      return {
        id: item.record_id,
        clientCode,
        name,
        initials: String(name)
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        activity: fields["Last Check-in Date"] || "--",
        training: "--",
        program: fields["Program ID"] || "--",
        status: fields["Package Type"] || "Active",
        email: fields["Email"] || "",
        phone: fields["Phone/WeChat"] || "",
        coach: fields["Coach Assigned"] || "",
        notes: fields["Notes"] || "",
        startDate: fields["Start Date"] || "",
      };
    });

    return res.status(200).json({ clients });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch clients",
      message: error.message,
    });
  }
}