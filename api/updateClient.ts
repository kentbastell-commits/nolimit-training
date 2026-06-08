import type { VercelRequest, VercelResponse } from "@vercel/node";

function toLarkDate(value: string) {
  if (!value || value === "--") return undefined;
  return new Date(`${value}T00:00:00`).getTime();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      clientRecordId,
      name,
      email,
      phone,
      coach,
      packageType,
      startDate,
      notes,
    } = req.body;

    if (!clientRecordId) {
      return res.status(400).json({ error: "Missing clientRecordId" });
    }

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

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const fields: Record<string, any> = {};

    if (name !== undefined) fields["Full Name"] = name;
    if (email !== undefined) fields.Email = email;
    if (phone !== undefined) fields["Phone/WeChat"] = phone;
    if (coach !== undefined) fields["Coach Assigned"] = coach;
    if (packageType !== undefined) fields["Package Type"] = packageType;
    if (notes !== undefined) fields.Notes = notes;

    const larkStartDate = toLarkDate(startDate || "");

    if (larkStartDate) {
      fields["Start Date"] = larkStartDate;
    }

    const updateResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_CLIENTS_TABLE_ID}/records/${clientRecordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok || updateData.code !== 0) {
      return res.status(500).json({
        error: "Failed to update client",
        larkResponse: updateData,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      clientRecordId,
      larkResponse: updateData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
