import type { VercelRequest, VercelResponse } from "@vercel/node";

function makeClientId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CL-${random}`;
}

function toLarkDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00`).getTime();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      clientId,
      name,
      email,
      phone,
      coach,
      primaryCoachId,
      secondaryCoachId,
      clientType,
      packageType,
      packageName,
      program,
      subscriptionStatus,
      intakeStatus,
      paymentStatus,
      purchasedProgramId,
      accessStartDate,
      accessEndDate,
      source,
      paymentId,
      languagePreference,
      startDate,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing client name" });
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

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const fields: Record<string, any> = {
      "Client ID": clientId || makeClientId(),
      "Full Name": name,
      Email: email || "",
      "Phone/WeChat": phone || "",
      "Coach Assigned": coach || "Kent Bastell",
      "Package Type": packageType || "Active",
      "Language Preference": languagePreference || "English",
      Notes: notes || "",
    };

    if (clientType) fields["Client Type"] = clientType;
    if (primaryCoachId) fields["Primary Coach"] = [primaryCoachId];
    if (secondaryCoachId) fields["Secondary Coach"] = [secondaryCoachId];
    if (packageName) fields.Package = packageName;
    if (program) fields.Program = program;
    if (subscriptionStatus) fields["Subscription Status"] = subscriptionStatus;
    if (intakeStatus) fields["Intake Status"] = intakeStatus;
    if (paymentStatus) fields["Payment Status"] = paymentStatus;
    if (purchasedProgramId) fields["Purchased Program ID"] = purchasedProgramId;
    if (source) fields.Source = source;
    if (paymentId) fields["Stripe/Payment ID"] = paymentId;

    const larkStartDate = toLarkDate(startDate || "");

    if (larkStartDate) {
      fields["Start Date"] = larkStartDate;
    }

    const larkAccessStartDate = toLarkDate(accessStartDate || "");
    const larkAccessEndDate = toLarkDate(accessEndDate || "");

    if (larkAccessStartDate) fields["Access Start Date"] = larkAccessStartDate;
    if (larkAccessEndDate) fields["Access End Date"] = larkAccessEndDate;

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CLIENTS_TABLE_ID}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create client",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      clientId: fields["Client ID"],
      recordId: createData?.data?.record?.record_id,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
