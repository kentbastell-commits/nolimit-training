import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  listTestLibrary,
  createLibraryTest,
} from "../server/db/repositories/testLibrary.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Canonical Test Library (physical tests): 1RM tests bound to exercises,
// energy-system tests, jump/speed/mobility tests. Athlete metrics bind to
// these Test IDs; calculations (e1RM, MAS, pace) key off the Calculation field.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // POST: create a canonical test (the coach's "Create Test" builder).
    if (req.method === "POST") {
      // The library read is public (athlete metrics key off these tests);
      // creating canonical tests is a coach action.
      if (!coachKeyOk(req as never)) {
        return res.status(401).json({ error: "Coach access key required" });
      }
      const body = req.body || {};
      const testName = String(body.testName || "").trim();
      const category = String(body.category || "").trim();
      if (!testName || !category) {
        return res.status(400).json({
          error: "Missing fields",
          message: "testName and category are required",
        });
      }

      const result = await createLibraryTest(body);
      return res.status(result.status).json(result.body);
    }

    const result = await listTestLibrary();
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
