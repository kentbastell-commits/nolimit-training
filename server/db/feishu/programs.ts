import { fieldText, listRecords } from "./client.ts";
import type { ProgramDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Build programId -> Session Type from the workout-templates table and cache it
// (30 min). Runs in the background so listPrograms never blocks on this large
// fetch. Guarded so concurrent misses don't each kick off a fetch.
let sessionTypeRefreshInFlight = false;
async function refreshSessionTypeMap() {
  if (sessionTypeRefreshInFlight) return;
  sessionTypeRefreshInFlight = true;
  try {
    const templateItems = await listRecords(
      process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string
    );
    const map: Record<string, string> = {};
    for (const templateItem of templateItems) {
      const f = templateItem.fields || {};
      const type = fieldText(f["Session Type"]);
      if (!type) continue;
      const pidField = f["Program ID"];
      const keys: string[] = [];
      const pidText = fieldText(pidField);
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

export async function listPrograms(): Promise<ProgramDTO[]> {
  const items = await listRecords(process.env.FEISHU_PROGRAMS_TABLE_ID as string);

  // A session's type ("Session Type") lives on its workout rows in the (large)
  // templates table, not on the program record. Fetching it inline made this
  // endpoint ~12s, so instead we serve the programId->type map from a
  // long-lived cache and refresh it in the BACKGROUND (the self-hosted server
  // keeps the promise alive after responding). When the refresh finishes it
  // drops the programs cache so the next call re-maps with types.
  const sessionTypeMap =
    getCached<Record<string, string>>("programSessionTypes") || {};
  if (!getCached("programSessionTypes")) {
    void refreshSessionTypeMap();
  }

  return items.map((item: any) => {
    const fields = item.fields || {};
    const programCode = fieldText(fields["Program ID"]);
    return {
      recordId: item.record_id,
      programId: programCode,
      sessionType:
        sessionTypeMap[programCode] || sessionTypeMap[item.record_id] || "",
      programName: fieldText(fields["Program Name"]),
      programNameCn: fieldText(fields["Program Name CN"]),
      goal: fieldText(fields["Goal"]),
      goalCn: fieldText(fields["Goal CN"]),
      sport: fieldText(fields["Sport"]),
      level: fieldText(fields["Level"]),
      durationWeeks: fieldText(fields["Duration Weeks"]),
      phase: fieldText(fields["Phase"]),
      phaseCn: fieldText(fields["Phase CN"]),
      season: fieldText(fields["Season"]),
      sessionsPerWeek: fieldText(fields["Sessions / Week"]),
      coach: fieldText(fields["Coach"]),
      status: fieldText(fields["Status"]),
      builtForClient: fieldText(fields["Built For Client"]),
      builtForTeam: fieldText(fields["Built For Team"]),
      storeCategory: fieldText(fields["Store Category"]),
      storeCategoryCn: fieldText(fields["Store Category CN"]),
      storeListingType: fieldText(fields["Store Listing Type"]),
      bundleProgramIds: fieldText(fields["Bundle Program IDs"]),
      productType: fieldText(fields["Product Type"]),
      price: fieldText(fields["Price"]),
      compareAtPrice: fieldText(fields["Compare At Price"]),
      currency: fieldText(fields["Currency"]),
      publicStoreVisible: Boolean(fields["Public Store Visible"]),
      purchaseLink: fieldText(fields["Purchase Link"]),
      defaultIntakeFormId: fieldText(fields["Default Intake Form ID"]),
      accessLengthDays: fieldText(fields["Access Length Days"]),
      productStatus: fieldText(fields["Product Status"]),
      salesDescription: fieldText(fields["Sales Description"]),
      salesDescriptionCn: fieldText(fields["Sales Description CN"]),
      storeUrl: fieldText(fields["Store URL"]),
      storeDescription: fieldText(fields["Store Description"]),
      storeDescriptionCn: fieldText(fields["Store Description CN"]),
      productImage: fieldText(fields["Product Image"]),
    };
  });
}
