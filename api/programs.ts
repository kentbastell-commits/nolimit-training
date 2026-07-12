import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached, invalidateCache } from "./_cache.ts";

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

// Build programId -> Session Type from the workout-templates table and cache it
// (30 min). Runs in the background so /api/programs never blocks on this large
// fetch. Guarded so concurrent misses don't each kick off a fetch.
let sessionTypeRefreshInFlight = false;
async function refreshSessionTypeMap(token: string) {
  if (sessionTypeRefreshInFlight) return;
  sessionTypeRefreshInFlight = true;
  try {
    const templateItems = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string,
      token
    );
    const map: Record<string, string> = {};
    for (const templateItem of templateItems) {
      const f = templateItem.fields || {};
      const type = fieldToText(f["Session Type"]);
      if (!type) continue;
      const pidField = f["Program ID"];
      const keys: string[] = [];
      const pidText = fieldToText(pidField);
      if (pidText) keys.push(pidText);
      const pushIds = (o: any) => {
        if (o && typeof o === "object") {
          if (Array.isArray(o.record_ids)) keys.push(...o.record_ids);
          if (Array.isArray(o.link_record_ids)) keys.push(...o.link_record_ids);
          if (typeof o.record_id === "string") keys.push(o.record_id);
        }
      };
      if (Array.isArray(pidField)) pidField.forEach(pushIds);
      else pushIds(pidField);
      for (const key of keys) {
        if (key && !(key in map)) map[key] = type;
      }
    }
    setCached("programSessionTypes", map, 30 * 60 * 1000);
    invalidateCache("programs"); // re-map programs with types on the next call
  } catch {
    // ignore — retry on the next cache miss
  } finally {
    sessionTypeRefreshInFlight = false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cachedPrograms = getCached("programs");
    if (cachedPrograms) return res.status(200).json({ programs: cachedPrograms });

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

    // A session's type ("Session Type") lives on its workout rows in the (large)
    // templates table, not on the program record. Fetching it inline made this
    // endpoint ~12s, so instead we serve the programId->type map from a
    // long-lived cache and refresh it in the BACKGROUND (the self-hosted server
    // keeps the promise alive after responding). When the refresh finishes it
    // drops the programs cache so the next call re-maps with types.
    const sessionTypeMap =
      getCached<Record<string, string>>("programSessionTypes") || {};
    if (!getCached("programSessionTypes")) {
      void refreshSessionTypeMap(tokenData.tenant_access_token);
    }

    const programs = programItems.map((item: any) => {
      const fields = item.fields || {};
      const programCode = fieldToText(fields["Program ID"]);

      return {
        recordId: item.record_id,
        programId: programCode,
        sessionType:
          sessionTypeMap[programCode] || sessionTypeMap[item.record_id] || "",
        programName: fieldToText(fields["Program Name"]),
        programNameCn: fieldToText(fields["Program Name CN"]),
        goal: fieldToText(fields["Goal"]),
        goalCn: fieldToText(fields["Goal CN"]),
        sport: fieldToText(fields["Sport"]),
        level: fieldToText(fields["Level"]),
        durationWeeks: fieldToText(fields["Duration Weeks"]),
        phase: fieldToText(fields["Phase"]),
        phaseCn: fieldToText(fields["Phase CN"]),
        season: fieldToText(fields["Season"]),
        sessionsPerWeek: fieldToText(fields["Sessions / Week"]),
        coach: fieldToText(fields["Coach"]),
        status: fieldToText(fields["Status"]),
        builtForClient: fieldToText(fields["Built For Client"]),
        builtForTeam: fieldToText(fields["Built For Team"]),
        storeCategory: fieldToText(fields["Store Category"]),
        storeCategoryCn: fieldToText(fields["Store Category CN"]),
        storeListingType: fieldToText(fields["Store Listing Type"]),
        bundleProgramIds: fieldToText(fields["Bundle Program IDs"]),
        productType: fieldToText(fields["Product Type"]),
        price: fieldToText(fields["Price"]),
        compareAtPrice: fieldToText(fields["Compare At Price"]),
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

    setCached("programs", programs, 10 * 60 * 1000);

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
