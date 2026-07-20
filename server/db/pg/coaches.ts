import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { coaches } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { CoachDTO, WriteResult } from "../dto.ts";
import type { UpsertCoachInput } from "../repositories/coaches.ts";

type Row = typeof coaches.$inferSelect;

export async function listCoaches(): Promise<CoachDTO[]> {
  const rows = await db.select().from(coaches);
  return rows.map(
    (r: Row): CoachDTO => ({
      recordId: r.coachId,
      coachId: r.coachId,
      name: r.name || "Unnamed Coach",
      email: str(r.email),
      phoneWechat: str(r.phone),
      role: r.role || "Coach",
      status: r.status || "Active",
      bio: str(r.bio),
      qrCodeUrl: str(r.qrCodeUrl),
      createdAt: epochToDate(r.createdAt),
    })
  );
}

/* ------------------------------- writes ---------------------------------- */

// Same minting scheme as the Feishu impl (random suffix, no sequence).
function makeCoachId(name: string) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "C");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `COACH-${prefix}-${random}`;
}

export async function upsertCoach(i: UpsertCoachInput): Promise<WriteResult> {
  // Feishu writes every column with "" defaults; mirror that exactly.
  const values = {
    name: i.name,
    email: i.email || "",
    phone: i.phoneWechat || "",
    role: i.role || "Coach",
    status: i.status || "Active",
    bio: i.bio || "",
    qrCodeUrl: i.qrCodeUrl || "",
  };

  if (i.recordId) {
    // On Postgres the business code IS the id; the PK is never rewritten on
    // update (a Coach ID rewrite would orphan client references).
    const r = await db
      .update(coaches)
      .set(values)
      .where(eq(coaches.coachId, i.recordId))
      .returning({ coachId: coaches.coachId });
    if (!r.length) {
      return { success: false, error: "Failed to update coach", message: "Coach not found" };
    }
    return {
      success: true,
      coachId: r[0].coachId,
      recordId: r[0].coachId,
      omittedFields: [],
    };
  }

  const coachId = i.coachId || makeCoachId(i.name);
  // A create with an already-existing code becomes an update (codes are unique
  // on pg, unlike Feishu rows).
  await db
    .insert(coaches)
    .values({ coachId, ...values, createdAt: Date.now() })
    .onConflictDoUpdate({ target: coaches.coachId, set: values });
  return { success: true, coachId, recordId: coachId, omittedFields: [] };
}
