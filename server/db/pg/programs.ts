import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../client.ts";
import { programs, workoutTemplates } from "../schema.ts";
import { fillTranslation } from "../translate.ts";
import { str } from "./_util.ts";
import type { ProgramDTO } from "../dto.ts";
import type {
  HandlerResult,
  CreateProgramInput,
  UpdateProgramInput,
  DuplicateProgramInput,
} from "../repositories/programs.ts";

type Row = typeof programs.$inferSelect;

export async function listPrograms(): Promise<ProgramDTO[]> {
  // Session type lives on the program's workout rows (same as Feishu); one
  // grouped query replaces the Feishu background map.
  const [rows, typeRows] = await Promise.all([
    db.select().from(programs).orderBy(programs.programId),
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

/* ---------------------------------- writes -------------------------------- */
// Same result shapes as the Feishu impls (HandlerResult status+body, minus
// larkResponse — there is no Lark). On Postgres the PR-… code IS the id.

type Insert = typeof programs.$inferInsert;

function makeProgramId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PR-${random}`;
}

// numeric(10,2) money columns take strings in drizzle.
function moneyOrNull(value: any): string | null {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(0);
}

export async function createProgram(i: CreateProgramInput): Promise<HandlerResult> {
  // Keep Feishu's PR-XXXX shape but re-mint on the rare PK collision (Feishu
  // had no uniqueness constraint; here a collision would fail the insert).
  let programId = makeProgramId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db
      .select({ programId: programs.programId })
      .from(programs)
      .where(eq(programs.programId, programId));
    if (!clash.length) break;
    programId = makeProgramId();
  }

  const values: Insert = {
    programId,
    name: i.programName,
    nameCn: i.programNameCn || null,
    goal: i.goal || "",
    goalCn: i.goalCn || null,
    sport: i.sport || "",
    level: i.level || "",
    durationWeeks: Number(i.durationWeeks) || 1,
    phase: i.phase || "",
    sessionsPerWeek: Number(i.sessionsPerWeek) || 1,
    coachId: i.coach || "Kent Bastell",
    status: i.status || "Active",
    productType: i.productType || "Digital Program",
    price: moneyOrNull(i.price),
    compareAtPrice: moneyOrNull(i.compareAtPrice),
    currency: i.currency || "CNY",
    publicStoreVisible: Boolean(i.publicStoreVisible),
    purchaseLink: i.purchaseLink || "",
    defaultIntakeFormId: i.defaultIntakeFormId || "",
    accessLengthDays: Number(i.accessLengthDays) || null,
    productStatus: i.productStatus || "Draft",
    salesDescription: i.salesDescription || "",
    salesDescriptionCn: i.salesDescriptionCn || "",
    builtForClient: i.builtForClient || "",
    builtForTeam: i.builtForTeam || "",
    storeCategory: i.storeCategory || "",
    storeCategoryCn: i.storeCategoryCn || "",
    storeListingType: i.storeListingType || "",
    bundleProgramIds: i.bundleProgramIds || "",
    season:
      i.season === "" || i.season === undefined ? null : Number(i.season) || 0,
  };

  try {
    await db.insert(programs).values(values);
  } catch (e: any) {
    return {
      status: 500,
      body: {
        error: "Failed to create program record",
        message: e?.message || String(e),
      },
    };
  }

  // Translate-on-write: mirror name/goal into the CN columns (best-effort,
  // fills empty only — the store shows programNameCn/goalCn).
  const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));
  void fillTranslation(i.programName, "zh", (zh) =>
    db
      .update(programs)
      .set({ nameCn: zh })
      .where(and(eq(programs.programId, programId), emptyOnly(programs.nameCn)))
  );
  if (i.goal) {
    void fillTranslation(i.goal, "zh", (zh) =>
      db
        .update(programs)
        .set({ goalCn: zh })
        .where(and(eq(programs.programId, programId), emptyOnly(programs.goalCn)))
    );
  }

  return {
    status: 200,
    body: {
      success: true,
      programId,
      programRecordId: programId, // business code is the identity on Postgres
      omittedFields: [],
      optionalUpdateErrors: [],
    },
  };
}

export async function updateProgram(i: UpdateProgramInput): Promise<HandlerResult> {
  const set: Partial<Insert> = {};

  if (i.programName !== undefined) set.name = i.programName;
  if (i.goal !== undefined) set.goal = i.goal;
  if (i.sport !== undefined) set.sport = i.sport;
  if (i.level !== undefined) set.level = i.level;
  if (i.durationWeeks !== undefined) set.durationWeeks = Number(i.durationWeeks) || 1;
  if (i.phase !== undefined) set.phase = i.phase;
  if (i.sessionsPerWeek !== undefined) {
    set.sessionsPerWeek = Number(i.sessionsPerWeek) || 1;
  }
  // Empty string = deliberate clear on Postgres (Feishu-era omission kept
  // stale values alive forever; "save as new" honored the clear but in-place
  // edit didn't).
  if (i.season !== undefined) {
    set.season = i.season === "" ? null : Number(i.season) || 0;
  }
  if (i.coach !== undefined) set.coachId = i.coach;
  if (i.status !== undefined) set.status = i.status;
  if (i.productType !== undefined) set.productType = i.productType;
  // Same empty-string omission the Feishu impl applies to typed columns.
  if (i.price !== undefined) set.price = moneyOrNull(i.price);
  if (i.compareAtPrice !== undefined) {
    set.compareAtPrice = moneyOrNull(i.compareAtPrice);
  }
  if (i.currency !== undefined) set.currency = i.currency;
  if (i.publicStoreVisible !== undefined) {
    set.publicStoreVisible = Boolean(i.publicStoreVisible);
  }
  if (i.purchaseLink !== undefined) {
    set.purchaseLink = i.purchaseLink || null;
  }
  if (i.defaultIntakeFormId !== undefined) {
    set.defaultIntakeFormId = i.defaultIntakeFormId;
  }
  if (i.accessLengthDays !== undefined) {
    set.accessLengthDays =
      i.accessLengthDays === "" ? null : Number(i.accessLengthDays) || 0;
  }
  if (i.productStatus !== undefined) set.productStatus = i.productStatus;
  if (i.salesDescription !== undefined) set.salesDescription = i.salesDescription;
  if (i.salesDescriptionCn !== undefined) {
    set.salesDescriptionCn = i.salesDescriptionCn;
  }
  if (i.builtForClient !== undefined) set.builtForClient = i.builtForClient;
  if (i.builtForTeam !== undefined) set.builtForTeam = i.builtForTeam;
  if (i.storeCategory !== undefined) set.storeCategory = i.storeCategory;
  if (i.storeCategoryCn !== undefined) set.storeCategoryCn = i.storeCategoryCn;
  if (i.storeListingType !== undefined) set.storeListingType = i.storeListingType;
  if (i.bundleProgramIds !== undefined) set.bundleProgramIds = i.bundleProgramIds;

  const updated = Object.keys(set).length
    ? await db
        .update(programs)
        .set(set)
        .where(eq(programs.programId, i.programRecordId))
        .returning({ programId: programs.programId })
    : await db
        .select({ programId: programs.programId })
        .from(programs)
        .where(eq(programs.programId, i.programRecordId));

  if (!updated.length) {
    return {
      status: 500,
      body: { error: "Failed to update program", message: "Program not found" },
    };
  }

  // Translate-on-write for renamed programs / changed goals (fills empty only).
  const emptyOnly = (col: any) => or(isNull(col), eq(col, ""));
  if (i.programName !== undefined && i.programName) {
    void fillTranslation(i.programName, "zh", (zh) =>
      db
        .update(programs)
        .set({ nameCn: zh })
        .where(and(eq(programs.programId, i.programRecordId), emptyOnly(programs.nameCn)))
    );
  }
  if (i.goal !== undefined && i.goal) {
    void fillTranslation(i.goal, "zh", (zh) =>
      db
        .update(programs)
        .set({ goalCn: zh })
        .where(and(eq(programs.programId, i.programRecordId), emptyOnly(programs.goalCn)))
    );
  }

  return {
    status: 200,
    body: { success: true, programRecordId: i.programRecordId },
  };
}

// Feishu used 4-digit random codes (no uniqueness constraint there); these are
// PRIMARY KEYS here, so collisions would fail the whole copy — mint unique.
let mintCounter = 0;
function makeId(prefix: string) {
  mintCounter += 1;
  return `${prefix}-${Date.now()}-${mintCounter}`;
}

export async function duplicateProgram(
  i: DuplicateProgramInput
): Promise<HandlerResult> {
  const { programRecordId, mode, fromWeek, toWeek } = i;

  const sourceTemplates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.programId, programRecordId));

  if (mode === "week") {
    const from = Number(fromWeek);
    const to = Number(toWeek);
    if (!from || !to) {
      return { status: 400, body: { error: "fromWeek and toWeek required" } };
    }
    const weekRows = sourceTemplates.filter((t) => t.week === from);
    if (!weekRows.length) {
      return { status: 404, body: { error: `No sessions in week ${from}` } };
    }
    const clones = weekRows.map((t) => ({
      ...t,
      templateId: makeId("WT"),
      week: to,
    }));
    try {
      await db.insert(workoutTemplates).values(clones);
    } catch (e: any) {
      return {
        status: 500,
        body: { error: "Week copy failed", message: e?.message || String(e) },
      };
    }
    return {
      status: 200,
      body: { success: true, copied: clones.length, week: to },
    };
  }

  // mode: program — clone the record, then every template. (Set prescriptions /
  // alternates are not copied — matches Feishu, whose clone skips link rows.)
  const srcRows = await db
    .select()
    .from(programs)
    .where(eq(programs.programId, programRecordId));
  const src = srcRows[0];
  if (!src) return { status: 404, body: { error: "Program not found" } };

  const newProgramId = makeId("PR");
  const progClone: Insert = {
    ...src,
    programId: newProgramId,
    name: `${src.name || "Program"} (Copy)`,
    nameCn: src.nameCn ? `${src.nameCn} (副本)` : src.nameCn,
    // Never let a fresh copy appear in the public store by accident.
    publicStoreVisible: false,
  };
  try {
    await db.insert(programs).values(progClone);
  } catch (e: any) {
    return {
      status: 500,
      body: { error: "Program copy failed", message: e?.message || String(e) },
    };
  }

  const templateClones = sourceTemplates.map((t) => ({
    ...t,
    templateId: makeId("WT"),
    programId: newProgramId,
  }));
  let copied = 0;
  if (templateClones.length) {
    try {
      await db.insert(workoutTemplates).values(templateClones);
      copied = templateClones.length;
    } catch (e: any) {
      return {
        status: 500,
        body: {
          error: "Template copy failed partway",
          copied,
          message: e?.message || String(e),
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      newProgramId,
      newRecordId: newProgramId,
      sessionsCopied: copied,
    },
  };
}
