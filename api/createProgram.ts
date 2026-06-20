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

async function createProgramRecord(
  tableId: string,
  token: string,
  fields: Record<string, any>
) {
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

  return {
    ok: response.ok,
    data: await response.json(),
  };
}

async function updateProgramField(
  tableId: string,
  recordId: string,
  token: string,
  fieldName: string,
  value: any
) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          [fieldName]: value,
        },
      }),
    }
  );

  return {
    ok: response.ok,
    data: await response.json(),
  };
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
      builtForClient,
      builtForTeam,
      storeCategory,
      storeCategoryCn,
      storeListingType,
      bundleProgramIds,
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

    const stableFields = {
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
    };
    const optionalProductFields = {
      "Product Type": productType || "Digital Program",
      Price: price === "" || price === undefined ? "" : Number(price) || 0,
      Currency: currency || "CNY",
      "Public Store Visible": Boolean(publicStoreVisible),
      "Purchase Link": purchaseLink || "",
      "Default Intake Form ID": defaultIntakeFormId || "",
      "Access Length Days": Number(accessLengthDays) || undefined,
      "Product Status": productStatus || "Draft",
      "Sales Description": salesDescription || "",
      "Sales Description CN": salesDescriptionCn || "",
      "Built For Client": builtForClient || "",
      "Built For Team": builtForTeam || "",
      "Store Category": storeCategory || "",
      "Store Category CN": storeCategoryCn || "",
      "Store Listing Type": storeListingType || "",
      "Bundle Program IDs": bundleProgramIds || "",
    };
    const fallbackFields = {
      "Program ID": programId,
      "Program Name": programName,
    };
    const tableId = process.env.FEISHU_PROGRAMS_TABLE_ID as string;
    const availableFieldNames = await getTableFieldNames(
      tableId,
      tokenData.tenant_access_token
    );
    const omittedFields: string[] = [];
    const filterFields = (sourceFields: Record<string, any>) =>
      Object.fromEntries(
        Object.entries(sourceFields).filter(([fieldName]) => {
          const shouldKeep =
            !availableFieldNames || availableFieldNames.has(fieldName);

          if (!shouldKeep) {
            omittedFields.push(fieldName);
          }

          return shouldKeep;
        })
      );
    const fields = filterFields(stableFields);
    const fallbackCreateFields = filterFields(fallbackFields);
    const optionalFields = Object.fromEntries(
      Object.entries(optionalProductFields).filter(([fieldName]) => {
        const shouldKeep = !availableFieldNames || availableFieldNames.has(fieldName);

        if (!shouldKeep) {
          omittedFields.push(fieldName);
        }

        return shouldKeep;
      })
    );

    let createResult = await createProgramRecord(
      tableId,
      tokenData.tenant_access_token,
      fields
    );
    let createData = createResult.data;

    if (!createResult.ok || createData.code !== 0) {
      createResult = await createProgramRecord(
        tableId,
        tokenData.tenant_access_token,
        fallbackCreateFields
      );
      createData = createResult.data;

      if (!createResult.ok || createData.code !== 0) {
        return res.status(500).json({
          error: "Failed to create program record",
          larkResponse: createData,
          fieldsSent: fields,
          fallbackFieldsSent: fallbackCreateFields,
        });
      }
    }

    const programRecordId = createData?.data?.record?.record_id;
    const optionalUpdateErrors: Array<{
      fieldName: string;
      value: any;
      larkResponse: any;
    }> = [];

    if (programRecordId) {
      for (const [fieldName, value] of Object.entries(optionalFields)) {
        const updateResult = await updateProgramField(
          tableId,
          programRecordId,
          tokenData.tenant_access_token,
          fieldName,
          value
        );

        if (!updateResult.ok || updateResult.data.code !== 0) {
          optionalUpdateErrors.push({
            fieldName,
            value,
            larkResponse: updateResult.data,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      programId,
      programRecordId,
      omittedFields,
      optionalUpdateErrors,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
