// Postgres impl for the reviews domain. Client/program references are
// FK-enforced here (Feishu stores plain text): the code stays in the
// clientName/programName text columns either way, the FK is nulled when the
// target row doesn't exist — the review always lands.
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import { reviews, clients, programs } from "../schema.ts";
import { str } from "./_util.ts";
import { epochToDate } from "./_util.ts";
import type {
  ReviewDTO,
  CreateReviewInput,
  UpdateReviewInput,
} from "../repositories/reviews.ts";
import type { WriteResult } from "../dto.ts";

export async function listAllReviews(): Promise<ReviewDTO[]> {
  const rows = await db.select().from(reviews);
  return rows.map((r): ReviewDTO => ({
    recordId: r.reviewId,
    reviewId: r.reviewId,
    clientId: str(r.clientId),
    clientName: str(r.clientName),
    programId: str(r.programId),
    programName: str(r.programName),
    rating: r.rating ?? 0,
    quote: str(r.quote),
    showOnStore: r.showOnStore ?? false,
    approved: r.approved ?? false,
    submittedDate: epochToDate(r.submittedDate),
  }));
}

export async function updateReview(input: UpdateReviewInput): Promise<WriteResult> {
  const set: Partial<typeof reviews.$inferInsert> = {};
  if (input.approved !== undefined) set.approved = Boolean(input.approved);
  if (input.showOnStore !== undefined) set.showOnStore = Boolean(input.showOnStore);
  if (Object.keys(set).length === 0) {
    return { success: false, error: "No fields to update" };
  }
  const updated = await db
    .update(reviews)
    .set(set)
    .where(eq(reviews.reviewId, input.recordId))
    .returning({ reviewId: reviews.reviewId });
  if (!updated.length) {
    return {
      success: false,
      error: "Could not update review",
      message: "Review not found",
    };
  }
  return { success: true, recordId: input.recordId };
}

export async function createReview(input: CreateReviewInput): Promise<WriteResult> {
  const reviewId = `REV-${Date.now()}`;

  const clientCode = input.clientId ? String(input.clientId) : "";
  const programCode = input.programId ? String(input.programId) : "";
  const clientFk =
    clientCode &&
    (
      await db
        .select({ id: clients.clientId })
        .from(clients)
        .where(eq(clients.clientId, clientCode))
    ).length
      ? clientCode
      : null;
  const programFk =
    programCode &&
    (
      await db
        .select({ id: programs.programId })
        .from(programs)
        .where(eq(programs.programId, programCode))
    ).length
      ? programCode
      : null;

  try {
    await db.insert(reviews).values({
      reviewId,
      clientId: clientFk,
      clientName: input.clientName ? String(input.clientName) : null,
      programId: programFk,
      programName: input.programName ? String(input.programName) : null,
      rating: Number(input.rating) || null,
      quote: input.quote ? String(input.quote) : null,
      showOnStore: Boolean(input.showOnStore),
      approved: false,
      submittedDate: Date.now(),
    });
  } catch (e: any) {
    return {
      success: false,
      error: "Could not create review",
      message: e?.message || String(e),
    };
  }
  return { success: true, recordId: reviewId };
}
