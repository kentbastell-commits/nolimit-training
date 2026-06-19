import { fieldText, listRecords } from "./client.ts";
import type { ProgramDTO } from "../dto.ts";

export async function listPrograms(): Promise<ProgramDTO[]> {
  const items = await listRecords(process.env.FEISHU_PROGRAMS_TABLE_ID as string);
  return items.map((item: any) => {
    const fields = item.fields || {};
    return {
      recordId: item.record_id,
      programId: fieldText(fields["Program ID"]),
      programName: fieldText(fields["Program Name"]),
      programNameCn: fieldText(fields["Program Name CN"]),
      goal: fieldText(fields["Goal"]),
      goalCn: fieldText(fields["Goal CN"]),
      sport: fieldText(fields["Sport"]),
      level: fieldText(fields["Level"]),
      durationWeeks: fieldText(fields["Duration Weeks"]),
      phase: fieldText(fields["Phase"]),
      phaseCn: fieldText(fields["Phase CN"]),
      sessionsPerWeek: fieldText(fields["Sessions / Week"]),
      coach: fieldText(fields["Coach"]),
      status: fieldText(fields["Status"]),
      productType: fieldText(fields["Product Type"]),
      price: fieldText(fields["Price"]),
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
