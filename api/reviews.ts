import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listReviews,
  createReview,
  updateReview,
} from "../server/db/repositories/reviews.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const reviews = await listReviews({
        programId: String(req.query.programId || ""),
        clientId: String(req.query.clientId || ""),
        storeOnly: String(req.query.storeOnly || "") === "1",
      });
      return res.status(200).json({ reviews });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { recordId, rating } = req.body || {};

    // Coach update (approve / toggle store visibility) on an existing review.
    if (recordId) {
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
