// Program reviews (client star ratings/quotes; coach approves + toggles store
// visibility). The old handler never cached reads, so neither does this.
import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/reviews.ts";
import type { WriteResult } from "../dto.ts";

export type ReviewDTO = {
  recordId: string;
  reviewId: string;
  clientId: string;
  clientName: string;
  programId: string;
  programName: string;
  rating: number;
  quote: string;
  showOnStore: boolean;
  approved: boolean;
  submittedDate: string;
};

export type ReviewFilter = {
  programId?: string;
  clientId?: string;
  storeOnly?: boolean;
};

export type CreateReviewInput = {
  clientId?: string;
  clientName?: string;
  programId?: string;
  programName?: string;
  rating: any;
  quote?: string;
  showOnStore?: any;
};

export type UpdateReviewInput = {
  recordId: string;
  approved?: any;
  showOnStore?: any;
};

export async function listReviews(filter: ReviewFilter = {}): Promise<ReviewDTO[]> {
  const all =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/reviews.ts")).listAllReviews()
      : await feishu.listAllReviews();

  return all
    .filter((r) => {
      if (filter.programId && r.programId !== filter.programId) return false;
      if (filter.clientId && r.clientId !== filter.clientId) return false;
      if (filter.storeOnly && !(r.showOnStore && r.approved)) return false;
      return true;
    })
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
}

export async function createReview(input: CreateReviewInput): Promise<WriteResult> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/reviews.ts")).createReview(input)
    : await feishu.createReview(input);
}

export async function updateReview(input: UpdateReviewInput): Promise<WriteResult> {
  return DATA_BACKEND === "postgres"
    ? await (await import("../pg/reviews.ts")).updateReview(input)
    : await feishu.updateReview(input);
}
