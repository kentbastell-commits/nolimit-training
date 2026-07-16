import { db } from "../client.ts";
import { programs } from "../schema.ts";
import { str } from "./_util.ts";
import type { ProgramDTO } from "../dto.ts";

type Row = typeof programs.$inferSelect;

export async function listPrograms(): Promise<ProgramDTO[]> {
  const rows = await db.select().from(programs);
  return rows.map(
    (r: Row): ProgramDTO => ({
      recordId: r.programId,
      programId: r.programId,
      // TODO(schema-resync): derive from workout_templates session types.
      sessionType: "",
      programName: str(r.name),
      programNameCn: str(r.nameCn),
      goal: str(r.goal),
      goalCn: str(r.goalCn),
      sport: str(r.sport),
      level: str(r.level),
      durationWeeks: str(r.durationWeeks),
      phase: str(r.phase),
      phaseCn: str(r.phaseCn),
      // TODO(schema-resync): columns added on Feishu after the June snapshot —
      // season, built-for, store category/listing, bundles, compare-at price.
      season: "",
      sessionsPerWeek: str(r.sessionsPerWeek),
      coach: str(r.coachId),
      status: str(r.status),
      builtForClient: "",
      builtForTeam: "",
      storeCategory: "",
      storeCategoryCn: "",
      storeListingType: "",
      bundleProgramIds: "",
      productType: str(r.productType),
      price: r.price == null ? "" : String(Number(r.price)),
      compareAtPrice: "",
      currency: str(r.currency),
      publicStoreVisible: r.publicStoreVisible ?? false,
      purchaseLink: str(r.purchaseLink),
      defaultIntakeFormId: str(r.defaultIntakeFormId),
      accessLengthDays: str(r.accessLengthDays),
      productStatus: str(r.productStatus),
      salesDescription: str(r.salesDescription),
      salesDescriptionCn: str(r.salesDescriptionCn),
      storeUrl: str(r.storeUrl),
      storeDescription: str(r.storeDescription),
      storeDescriptionCn: str(r.storeDescriptionCn),
      productImage: str(r.productImage),
    })
  );
}
