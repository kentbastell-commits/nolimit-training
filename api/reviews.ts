import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listReviews,
  createReview,
  updateReview,
} from "../server/db/repositories/reviews.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const storeOnly = String(req.query.storeOnly || "") === "1";
      const clientId = String(req.query.clientId || "");
      // storeOnly (public store) and clientId (a client's own reviews) stay
      // open; the fully-unscoped moderation view — every review including
      // unapproved — is coach-only.
      if (!storeOnly && !clientId && !coachKeyOk(req as never)) {
        return res.status(401).json({ error: "Coach access key required" });
      }
      const reviews = await listReviews({
        programId: String(req.query.programId || ""),
        clientId,
        storeOnly,
      });
      return res.status(200).json({ reviews });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { recordId, rating } = req.body || {};

    // Coach update (approve / toggle store visibility) on an existing review.
    if (recordId) {
      if (!coachKeyOk(req as never)) {
        return res.status(401).json({ error: "Coach access key required" });
      }
      const result = await updateReview(req.body);
      if (!result.success && result.error === "No fields to update") {
        return res.status(400).json({ error: "No fields to update" });
      }
      return res.status(result.success ? 200 : 500).json(result);
    }

    // New review from a client.
    if (!rating) {
      return res.status(400).json({ error: "Missing rating" });
    }

    const result = await createReview(req.body);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
