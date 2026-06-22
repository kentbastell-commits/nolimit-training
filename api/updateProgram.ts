import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

async function getTenantToken() {
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
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      programRecordId,
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

    if (!programRecordId) {
      return res.status(400).json({ error: "Missing programRecordId" });
    }

    const fields: Record<string, string | number> = {};

    if (programName !== undefined) fields["Program Name"] = programName;
    if (goal !== undefined) fields.Goal = goal;
    if (sport !== undefined) fields.Sport = sport;
    if (level !== undefined) fields.Level = level;
    if (durationWeeks !== undefined) {
      fields["Duration Weeks"] = Number(durationWeeks) || 1;
    }
    if (phase !== undefined) fields.Phase = phase;
    if (sessionsPerWeek !== undefined) {
      fields["Sessions / Week"] = Number(sessionsPerWeek) || 1;
    }
    if (coach !== undefined) fields.Coach = coach;
    if (status !== undefined) fields.Status = status;
    if (productType !== undefined) fields["Product Type"] = productType;
    if (price !== undefined) fields.Price = price === "" ? "" : Number(price) || 0;
    if (currency !== undefined) fields.Currency = currency;
    if (publicStoreVisible !== undefined) {
      fields["Public Store Visible"] = Boolean(publicStoreVisible) as any;
    }
    if (purchaseLink !== undefined) fields["Purchase Link"] = purchaseLink;
    if (defaultIntakeFormId !== undefined) {
      fields["Default Intake Form ID"] = defaultIntakeFormId;
    }
    if (accessLengthDays !== undefined) {
      fields["Access Length Days"] =
        accessLengthDays === "" ? "" : Number(accessLengthDays) || 0;
    }
    if (productStatus !== undefined) fields["Product Status"] = productStatus;
    if (salesDescription !== undefined) {
      fields["Sales Description"] = salesDescription;
    }
    if (salesDescriptionCn !== undefined) {
      fields["Sales Description CN"] = salesDescriptionCn;
    }
    if (builtForClient !== undefined) {
      fields["Built For Client"] = builtForClient;
    }
    if (builtForTeam !== undefined) fields["Built For Team"] = builtForTeam;
    if (storeCategory !== undefined) fields["Store Category"] = storeCategory;
    if (storeCategoryCn !== undefined) {
      fields["Store Category CN"] = storeCategoryCn;
    }
    if (storeListingType !== undefined) {
      fields["Store Listing Type"] = storeListingType;
    }
    if (bundleProgramIds !== undefined) {
      fields["Bundle Program IDs"] = bundleProgramIds;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const token = await getTenantToken();
    const updateResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_PROGRAMS_TABLE_ID}/records/${programRecordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok || updateData.code !== 0) {
      return res.status(500).json({
        error: "Failed to update program",
        larkResponse: updateData,
        fieldsSent: fields,
      });
    }

    invalidateCache("programs");

    return res.status(200).json({
      success: true,
      programRecordId,
      larkResponse: updateData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
