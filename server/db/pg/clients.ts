import { and, eq, or, isNull } from "drizzle-orm";
import { db } from "../client.ts";
import { clients } from "../schema.ts";
import { fillTranslation } from "../translate.ts";
import { epochToDate, pgErrorMessage, str } from "./_util.ts";
import type { ClientDTO, UpdateClientInput, WriteResult } from "../dto.ts";
import type { CreateClientInput } from "../repositories/clients.ts";

type Row = typeof clients.$inferSelect;

export async function listClients(): Promise<ClientDTO[]> {
  // Stable order: heap order reshuffles as rows update (Feishu returned grid
  // order); same reason on every list read below.
  const rows = await db.select().from(clients).orderBy(clients.clientId);
  return rows.map((r: Row): ClientDTO => {
    const name = r.fullName || "Unnamed Client";
    return {
      id: r.clientId, // business code is the identity on Postgres
      clientCode: r.clientId,
      name,
      initials: name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      activity: epochToDate(r.lastCheckinDate, "--"),
      training: "--",
      program: str(r.programId) || "--",
      status: r.packageType || "Active",
      clientType: str(r.clientType),
      primaryCoach: str(r.primaryCoachId),
      secondaryCoach: str(r.secondaryCoachId),
      package: str(r.package),
      subscriptionStatus: str(r.subscriptionStatus),
      intakeStatus: str(r.intakeStatus),
      paymentStatus: str(r.paymentStatus),
      purchasedProgramId: str(r.purchasedProgramId),
      accessStartDate: epochToDate(r.accessStartDate, "--"),
      accessEndDate: epochToDate(r.accessEndDate, "--"),
      source: str(r.source),
      paymentId: str(r.stripePaymentId),
      email: str(r.email),
      phone: str(r.phone),
      coach: str(r.primaryCoachId) || str(r.coachAssigned),
      notes: str(r.notes),
      notesEn: str(r.notesEn),
      startDate: epochToDate(r.startDate, "--"),
      languagePreference: r.languagePreference || "English",
      masKmhOverride: str(r.mas),
      hrMaxOverride: str(r.hrMax),
      restingHrOverride: str(r.restingHr),
      zone5kPct: str(r.zone5kPct),
      zone10kPct: str(r.zone10kPct),
      zoneThresholdPct: str(r.zoneThresholdPct),
      zoneEasyPct: str(r.zoneEasyPct),
      tags: r.tags ?? [],
      categories: r.categories ?? [],
      lastLogin: r.lastLogin ?? 0,
    };
  });
}

function dateMs(value?: string) {
  if (!value || value === "--") return undefined;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function numOrNull(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "--") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Mint the next sequential CL-XXXX code from what's already in the table.
// (Feishu used a random 4-digit code; on Postgres client_id is the PRIMARY KEY,
// so a random pick could collide — sequential max+1 is collision-free.)
async function mintClientId(): Promise<string> {
  const rows = await db.select({ clientId: clients.clientId }).from(clients);
  let max = 0;
  for (const r of rows) {
    const m = /^CL-(\d+)$/.exec(r.clientId || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  const next = Math.max(max + 1, 1);
  return `CL-${String(next).padStart(4, "0")}`;
}

export async function createClient(i: CreateClientInput): Promise<WriteResult> {
  const clientId = i.clientId || (await mintClientId());

  const values: typeof clients.$inferInsert = {
    clientId,
    fullName: i.name,
    email: i.email || "",
    phone: i.phone || "",
    coachAssigned: i.coach || "Kent Bastell",
    packageType: i.packageType || "Active",
    languagePreference: i.languagePreference || "English",
    notes: i.notes || "",
  };

  if (i.clientType) values.clientType = i.clientType;
  if (i.primaryCoachId) values.primaryCoachId = i.primaryCoachId;
  if (i.secondaryCoachId) values.secondaryCoachId = i.secondaryCoachId;
  if (i.packageName) values.package = i.packageName;
  if (i.program) values.programId = i.program;
  if (i.subscriptionStatus) values.subscriptionStatus = i.subscriptionStatus;
  if (i.intakeStatus) values.intakeStatus = i.intakeStatus;
  if (i.paymentStatus) values.paymentStatus = i.paymentStatus;
  if (i.purchasedProgramId) values.purchasedProgramId = i.purchasedProgramId;
  if (i.source) values.source = i.source;
  if (i.paymentId) values.stripePaymentId = i.paymentId;

  const sd = dateMs(i.startDate);
  if (sd) values.startDate = sd;
  const asd = dateMs(i.accessStartDate);
  if (asd) values.accessStartDate = asd;
  const aed = dateMs(i.accessEndDate);
  if (aed) values.accessEndDate = aed;

  try {
    await db.insert(clients).values(values);
  } catch (e: any) {
    // Same failure shape as the Feishu impl (duplicate code, bad FK, ...).
    return {
      success: false,
      error: "Failed to create client",
      message: pgErrorMessage(e),
      fieldsSent: values,
    };
  }
  // Translate-on-write: mirror the intake notes into notes_en (best-effort).
  if (i.notes) {
    void fillTranslation(i.notes, "en", (en) =>
      db
        .update(clients)
        .set({ notesEn: en })
        .where(
          and(
            eq(clients.clientId, clientId),
            or(isNull(clients.notesEn), eq(clients.notesEn, ""))
          )
        )
    );
  }

  // On Postgres the business code IS the record identity, so echo it as both.
  return { success: true, clientId, recordId: clientId };
}

export async function recordLogin(
  clientRecordId?: string,
  clientCode?: string
): Promise<WriteResult> {
  const id = clientRecordId || clientCode;
  if (!id) return { success: false, error: "Missing client id" };
  const r = await db
    .update(clients)
    .set({ lastLogin: Date.now() })
    .where(eq(clients.clientId, id))
    .returning({ clientId: clients.clientId });
  return r.length ? { success: true, recordId: id } : { success: false, error: "Client not found" };
}

export async function updateClient(i: UpdateClientInput): Promise<WriteResult> {
  const set: Partial<typeof clients.$inferInsert> = {};
  if (i.name !== undefined) set.fullName = i.name;
  if (i.email !== undefined) set.email = i.email;
  if (i.phone !== undefined) set.phone = i.phone;
  if (i.coach !== undefined) set.coachAssigned = i.coach;
  if (i.primaryCoachId !== undefined) set.primaryCoachId = i.primaryCoachId || null;
  if (i.secondaryCoachId !== undefined) set.secondaryCoachId = i.secondaryCoachId || null;
  if (i.clientType !== undefined) set.clientType = i.clientType;
  if (i.packageType !== undefined) set.packageType = i.packageType;
  if (i.packageName !== undefined) set.package = i.packageName;
  if (i.program !== undefined) set.programId = i.program || null;
  if (i.subscriptionStatus !== undefined) set.subscriptionStatus = i.subscriptionStatus;
  if (i.intakeStatus !== undefined) set.intakeStatus = i.intakeStatus;
  if (i.paymentStatus !== undefined) set.paymentStatus = i.paymentStatus;
  if (i.purchasedProgramId !== undefined) set.purchasedProgramId = i.purchasedProgramId;
  if (i.source !== undefined) set.source = i.source;
  if (i.paymentId !== undefined) set.stripePaymentId = i.paymentId;
  if (i.notes !== undefined) set.notes = i.notes;
  if (i.languagePreference !== undefined) set.languagePreference = i.languagePreference;

  const sd = dateMs(i.startDate);
  if (sd) set.startDate = sd;
  const lc = dateMs(i.lastCheckInDate);
  if (lc) set.lastCheckinDate = lc;
  const asd = dateMs(i.accessStartDate);
  if (asd) set.accessStartDate = asd;
  const aed = dateMs(i.accessEndDate);
  if (aed) set.accessEndDate = aed;

  const overrides: Array<[keyof typeof clients.$inferInsert, unknown]> = [
    ["mas", i.masKmhOverride],
    ["hrMax", i.hrMaxOverride],
    ["restingHr", i.restingHrOverride],
    ["zone5kPct", i.zone5kPct],
    ["zone10kPct", i.zone10kPct],
    ["zoneThresholdPct", i.zoneThresholdPct],
    ["zoneEasyPct", i.zoneEasyPct],
  ];
  for (const [col, value] of overrides) {
    const v = numOrNull(value);
    if (v !== undefined) (set as Record<string, unknown>)[col] = v;
  }
  if (i.tags !== undefined) set.tags = Array.isArray(i.tags) ? i.tags : [];
  if (i.categories !== undefined) set.categories = Array.isArray(i.categories) ? i.categories : [];

  if (Object.keys(set).length === 0) return { success: true, clientRecordId: i.clientRecordId };
  let r: { clientId: string }[];
  try {
    r = await db
      .update(clients)
      .set(set)
      .where(eq(clients.clientId, i.clientRecordId))
      .returning({ clientId: clients.clientId });
  } catch (e: any) {
    // Decoded instead of a blanket 500: e.g. an unknown program code on the
    // program_id FK fails the whole save — say so.
    return {
      success: false,
      error: "Failed to update client",
      message: pgErrorMessage(e),
    };
  }

  // Translate-on-write (replaces the Feishu AI formula): the mirror must
  // FOLLOW the source — clear it on every notes edit, then refill. The old
  // fill-only-empty rule left a stale translation forever after edits.
  if (r.length && i.notes !== undefined) {
    await db
      .update(clients)
      .set({ notesEn: "" })
      .where(eq(clients.clientId, i.clientRecordId));
    if (i.notes) {
      void fillTranslation(i.notes, "en", (en) =>
        db
          .update(clients)
          .set({ notesEn: en })
          .where(
            and(
              eq(clients.clientId, i.clientRecordId),
              or(isNull(clients.notesEn), eq(clients.notesEn, ""))
            )
          )
      );
    }
  }

  return r.length
    ? { success: true, clientRecordId: i.clientRecordId }
    : { success: false, error: "Client not found" };
}

/* --------------------------- portal recovery ------------------------------ */
// Same semantics as the Feishu impl: exact phone match + fuzzy name check.

function normText(v?: string) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/gi, " ")
    .trim();
}

function textMatches(a?: string, b?: string) {
  const na = normText(a);
  const nb = normText(b);
  return Boolean(na && nb && (na === nb || na.includes(nb) || nb.includes(na)));
}

export async function findClientByPhoneName(
  phone: string,
  name: string
): Promise<string> {
  const rows = await db
    .select({
      clientId: clients.clientId,
      fullName: clients.fullName,
      fullNameCn: clients.fullNameCn,
    })
    .from(clients)
    .where(eq(clients.phone, String(phone).trim()))
    .limit(10);

  const match = rows.find(
    (r) =>
      textMatches(r.fullName || r.fullNameCn || "", String(name)) ||
      textMatches(r.fullNameCn || "", String(name))
  );
  return match?.clientId || "";
}

export async function findClientByOpenid(openid: string): Promise<string> {
  const rows = await db
    .select({ clientId: clients.clientId })
    .from(clients)
    .where(eq(clients.wechatOpenid, String(openid)))
    .limit(1);
  return rows[0]?.clientId || "";
}

export async function bindClientOpenid(
  clientCode: string,
  openid: string
): Promise<WriteResult> {
  const r = await db
    .update(clients)
    .set({ wechatOpenid: String(openid) })
    .where(eq(clients.clientId, String(clientCode)))
    .returning({ clientId: clients.clientId });
  return r.length
    ? { success: true, recordId: clientCode }
    : { success: false, error: "Client not found" };
}
