import { db } from "../client.ts";
import { programs, workoutTemplates } from "../schema.ts";
import { str } from "./_util.ts";
import type { ProgramDTO } from "../dto.ts";

type Row = typeof programs.$inferSelect;

export async function listPrograms(): Promise<ProgramDTO[]> {
  // Session type lives on the program's workout rows (same as Feishu); one
  // grouped query replaces the Feishu background map.
  const [rows, typeRows] = await Promise.all([
    db.select().from(programs),
    db
      .selectDistinct({
        programId: workoutTemplates.programId,
        sessionType: workoutTemplates.sessionType,
      })
      .from(workoutTemplates),
  ]);
  const sessionTypeMap = new Map<string, string>();
  for (const t of typeRows) {
    if (t.programId && t.sessionType && !sessionTypeMap.has(t.programId)) {
      sessionTypeMap.set(t.programId, t.sessionType);
    }
  }
  return rows.map(
    (r: Row): ProgramDTO => ({
      recordId: r.programId,
      programId: r.programId,
      sessionType: sessionTypeMap.get(r.programId) || "",
      programName: str(r.name),
      programNameCn: str(r.nameCn),
      goal: str(r.goal),
      goalCn: str(r.goalCn),
      sport: str(r.sport),
      level: str(r.level),
      durationWeeks: str(r.durationWeeks),
      phase: str(r.phase),
      phaseCn: str(r.phaseCn),
      season: str(r.season),
      sessionsPerWeek: str(r.sessionsPerWeek),
      coach: str(r.coachId),
      status: str(r.status),
      builtForClient: str(r.builtForClient),
      builtForTeam: str(r.builtForTeam),
      storeCategory: str(r.storeCategory),
      storeCategoryCn: str(r.storeCategoryCn),
      storeListingType: str(r.storeListingType),
      bundleProgramIds: str(r.bundleProgramIds),
      productType: str(r.productType),
      price: r.price == null ? "" : String(Number(r.price)),
      compareAtPrice: r.compareAtPrice == null ? "" : String(Number(r.compareAtPrice)),
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
