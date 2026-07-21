import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { checkIns } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { WriteResult } from "../dto.ts";
import type {
  CheckInDTO,
  ReviewCheckInInput,
  CreateCheckInInput,
} from "../repositories/checkIns.ts";

type Row = typeof checkIns.$inferSelect;

// Same date semantics as the Feishu impl: "" -> now, digits -> epoch-ms,
// otherwise anchor on noon UTC so the calendar date survives a round-trip.
function toDateMs(value: any): number {
  const text = value == null ? "" : String(value);
  if (!text) return Date.now();
  if (/^\d+$/.test(text)) return Number(text);
  return new Date(`${text}T12:00:00Z`).getTime();
}

function toNumberOrNull(value: any): number | null {
  if (value === "" || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toTextOrNull(value: any): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

export async function listCheckIns(): Promise<CheckInDTO[]> {
  const rows = await db.select().from(checkIns);
  return rows.map((r: Row): CheckInDTO => {
    const coachResponse = str(r.coachNotes);
    return {
      recordId: r.checkinId, // business code is the identity on Postgres
      checkInId: str(r.checkinId),
      // Fallback: rows whose FK link is NULL (Feishu's retry-without-link
      // fallback wrote only the plain-text Client column, which the ETL put
      // in clientName) would otherwise vanish from per-client views.
      clientId:
        str(r.clientId) ||
        (/^CL-/.test(str(r.clientName)) ? str(r.clientName) : ""),
      clientRecordIds: [], // Feishu duplex-link ids don't exist on Postgres
      submittedDate: epochToDate(r.submittedDate),
      bodyWeight: str(r.bodyWeight),
      sleepHours: str(r.sleepHours),
      sleepQuality: str(r.sleepQuality),
      energy: str(r.energy),
      mood: str(r.mood),
      stress: str(r.stress),
      soreness: str(r.soreness),
      readinessScore: str(r.readinessScore),
      nutritionNotes: str(r.nutritionNotes),
      trainingNotes: str(r.trainingNotes),
      wins: str(r.wins),
      problemsPain: str(r.problemsPain),
      clientNotes: str(r.clientNotes),
      coachResponse,
      // No "Coach Reviewed" column on Postgres: a review always stamps
      // reviewed_date (and usually coach_notes), so derive from those.
      coachReviewed: Boolean(coachResponse.trim()) || r.reviewedDate != null,
      reviewedDate: epochToDate(r.reviewedDate),
      status: str(r.status),
    };
  });
}

export async function reviewCheckIn(input: ReviewCheckInInput): Promise<WriteResult> {
  const set: Partial<typeof checkIns.$inferInsert> = {
    reviewedDate: toDateMs(
      input.reviewedDate || new Date().toISOString().split("T")[0]
    ),
  };
  if (input.coachResponse !== undefined && input.coachResponse !== null) {
    set.coachNotes = String(input.coachResponse);
  }

  const r = await db
    .update(checkIns)
    .set(set)
    .where(eq(checkIns.checkinId, String(input.recordId)))
    .returning({ checkinId: checkIns.checkinId });

  if (!r.length) {
    return { success: false, error: "Could not update check-in" };
  }
  return { success: true, recordId: input.recordId };
}

export async function createCheckIn(input: CreateCheckInInput): Promise<WriteResult> {
  const checkinId = `CHK-${Date.now()}`;
  await db.insert(checkIns).values({
    checkinId,
    // On Postgres the client business code IS the id; the frontend's
    // clientRecordId carries the code in pg mode.
    clientId: String(input.clientId || input.clientRecordId),
    submittedDate: toDateMs(input.submittedDate),
    status: input.status ? String(input.status) : "Submitted",
    bodyWeight: toNumberOrNull(input.bodyWeight),
    sleepHours: toNumberOrNull(input.sleepHours),
    sleepQuality: toNumberOrNull(input.sleepQuality),
    energy: toNumberOrNull(input.energy),
    mood: toTextOrNull(input.mood),
    stress: toNumberOrNull(input.stress),
    soreness: toNumberOrNull(input.soreness),
    readinessScore: toNumberOrNull(input.readinessScore),
    nutritionNotes: toTextOrNull(input.nutritionNotes),
    trainingNotes: toTextOrNull(input.trainingNotes),
    wins: toTextOrNull(input.wins),
    problemsPain: toTextOrNull(input.problemsPain),
    clientNotes: toTextOrNull(input.clientNotes),
    coachNotes: toTextOrNull(input.coachResponse),
    reviewedDate: input.reviewedDate ? toDateMs(input.reviewedDate) : null,
  });
  return { success: true, recordId: checkinId };
}
