import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import {
  listTestLibrary,
  createLibraryTest,
} from "../server/db/repositories/testLibrary.ts";

// Canonical Test Library (physical tests): 1RM tests bound to exercises,
// energy-system tests, jump/speed/mobility tests. Athlete metrics bind to
// these Test IDs; calculations (e1RM, MAS, pace) key off the Calculation field.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Feishu needs its table id; on Postgres the env var is irrelevant.
    if (DATA_BACKEND === "feishu" && !process.env.FEISHU_TEST_LIBRARY_TABLE_ID) {
      return res.status(503).json({
        error: "Not configured",
        message: "Missing FEISHU_TEST_LIBRARY_TABLE_ID",
      });
    }

    // POST: create a canonical test (the coach's "Create Test" builder).
    if (req.method === "POST") {
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
