import type { VercelRequest, VercelResponse } from "@vercel/node";

function makeProgramId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PR-${random}`;
}

async function getTableFieldNames(tableId: string, token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=200`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (!response.ok || data.code !== 0) {
    return null;
  }

  return new Set(
    (data?.data?.items || [])
      .map((field: any) => field.field_name || field.name)
      .filter(Boolean)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      programName,
      goal,
      sport,
      level,
      durationWeeks,
      phase,
      sessionsPerWeek,
      coach,
      status,
      productType,
      price,
      currency,
      publicStoreVisible,
      purchaseLink,
      defaultIntakeFormId,
      accessLengthDays,
      productStatus,
      salesDescription,
      salesDescriptionCn,
    } = req.body;

    if (!programName) {
      return res.status(400).json({
        error: "Missing Program Name",
      });
    }

    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

    const programId = makeProgramId();

    const rawFields = {
      "Program ID": programId,
      "Program Name": programName,
      Goal: goal || "",
      Sport: sport || "",
      Level: level || "",
      "Duration Weeks": Number(durationWeeks) || 1,
      Phase: phase || "",
      "Sessions / Week": Number(sessionsPerWeek) || 1,
      Coach: coach || "Kent Bastell",
      Status: status || "Active",
      "Product Type": productType || "Digital Program",
      Price: price === "" || price === undefined ? "" : Number(price) || 0,
      Currency: currency || "CNY",
      "Public Store Visible": Boolean(publicStoreVisible),
      "Purchase Link": purchaseLink || "",
      "Default Intake Form ID": defaultIntakeFormId || "",
      "Access Length Days": Number(accessLengthDays) || "",
      "Product Status": productStatus || "Draft",
      "Sales Description": salesDescription || "",
      "Sales Description CN": salesDescriptionCn || "",
    };
    const tableId = process.env.FEISHU_PROGRAMS_TABLE_ID as string;
    const availableFieldNames = await getTableFieldNames(
      tableId,
      tokenData.tenant_access_token
    );
    const omittedFields: string[] = [];
    const fields = Object.fromEntries(
      Object.entries(rawFields).filter(([fieldName]) => {
        const shouldKeep = !availableFieldNames || availableFieldNames.has(fieldName);

        if (!shouldKeep) {
          omittedFields.push(fieldName);
        }

        return shouldKeep;
      })
    );

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields,
        }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create program record",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      programId,
      programRecordId: createData?.data?.record?.record_id,
      omittedFields,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
