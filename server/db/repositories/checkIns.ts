// Check-ins repository — dispatches to the Feishu or Postgres impl.
// The full-table read is cached under "checkIns" (5 min, same key/TTL the old
// api/checkIns.ts handler used) and filtered per request; both write paths
// invalidate that key on success, exactly as the old handler did.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/checkIns.ts";
import type { WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type CheckInDTO = {
  recordId: string;
  checkInId: string;
  clientId: string;
  clientRecordIds: string[];
  submittedDate: string;
  bodyWeight: string;
  sleepHours: string;
  sleepQuality: string;
  energy: string;
  mood: string;
  stress: string;
  soreness: string;
  readinessScore: string;
  nutritionNotes: string;
  trainingNotes: string;
  wins: string;
  problemsPain: string;
  clientNotes: string;
  coachResponse: string;
  coachReviewed: boolean;
  reviewedDate: string;
  status: string;
};

// Coach reviewing/responding to an existing check-in.
export type ReviewCheckInInput = {
  recordId: string;
  coachResponse?: any;
  coachReviewed?: any;
  reviewedDate?: any;
};

// Athlete submitting a new check-in. Values arrive straight from req.body and
// may be strings or numbers; the impls normalize them (numbers typed, empties
// omitted) exactly like the old handler.
export type CreateCheckInInput = {
  clientId?: any;
  clientRecordId?: any;
  submittedDate?: any;
  bodyWeight?: any;
  sleepHours?: any;
  sleepQuality?: any;
  energy?: any;
  mood?: any;
  stress?: any;
  soreness?: any;
  readinessScore?: any;
  nutritionNotes?: any;
  trainingNotes?: any;
  wins?: any;
  problemsPain?: any;
  clientNotes?: any;
  coachResponse?: any;
  reviewedDate?: any;
  status?: any;
};

export async function listCheckIns(clientId = ""): Promise<CheckInDTO[]> {
  let all = getCached<CheckInDTO[]>("checkIns");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/checkIns.ts")).listCheckIns()
        : await feishu.listCheckIns();
    setCached("checkIns", all, 5 * 60 * 1000);
  }
  return all
    .filter((checkIn) => {
      if (!clientId) return true;
      return (
        checkIn.clientId.includes(clientId) ||
        checkIn.clientRecordIds.includes(clientId)
      );
    })
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
}

export async function reviewCheckIn(input: ReviewCheckInInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/checkIns.ts")).reviewCheckIn(input)
      : await feishu.reviewCheckIn(input);
  if (result.success) invalidateCache("checkIns");
  return result;
}

export async function createCheckIn(input: CreateCheckInInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/checkIns.ts")).createCheckIn(input)
      : await feishu.createCheckIn(input);
  if (result.success) invalidateCache("checkIns");
  return result;
}
