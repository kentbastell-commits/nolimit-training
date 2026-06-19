import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";

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
        if (item?.link) return item.link;
        if (item?.url) return item.url;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.link) return value.link;
  if (value?.url) return value.url;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return "";
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
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

    const programItems = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_PROGRAMS_TABLE_ID as string,
      tokenData.tenant_access_token
    );

    const programs = programItems.map((item: any) => {
      const fields = item.fields || {};

      return {
        recordId: item.record_id,
        programId: fieldToText(fields["Program ID"]),
        programName: fieldToText(fields["Program Name"]),
        programNameCn: fieldToText(fields["Program Name CN"]),
        goal: fieldToText(fields["Goal"]),
        goalCn: fieldToText(fields["Goal CN"]),
        sport: fieldToText(fields["Sport"]),
        level: fieldToText(fields["Level"]),
        durationWeeks: fieldToText(fields["Duration Weeks"]),
        phase: fieldToText(fields["Phase"]),
        phaseCn: fieldToText(fields["Phase CN"]),
        sessionsPerWeek: fieldToText(fields["Sessions / Week"]),
        coach: fieldToText(fields["Coach"]),
        status: fieldToText(fields["Status"]),
        productType: fieldToText(fields["Product Type"]),
        price: fieldToText(fields["Price"]),
        currency: fieldToText(fields["Currency"]),
        publicStoreVisible: Boolean(fields["Public Store Visible"]),
        purchaseLink: fieldToText(fields["Purchase Link"]),
        defaultIntakeFormId: fieldToText(fields["Default Intake Form ID"]),
        accessLengthDays: fieldToText(fields["Access Length Days"]),
        productStatus: fieldToText(fields["Product Status"]),
        salesDescription: fieldToText(fields["Sales Description"]),
        salesDescriptionCn: fieldToText(fields["Sales Description CN"]),
        storeUrl: fieldToText(fields["Store URL"]),
        storeDescription: fieldToText(fields["Store Description"]),
        storeDescriptionCn: fieldToText(fields["Store Description CN"]),
        productImage: fieldToText(fields["Product Image"]),
      };
    });

    return res.status(200).json({
      programs,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
