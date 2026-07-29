import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listCoaches } from "../server/db/repositories/coaches.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const coaches = await listCoaches();
    // Public by design (store "meet your coach" section), so email/phone —
    // needed only by the coach admin roster — are stripped for anyone
    // without the coach key rather than gating the whole endpoint.
    const isCoach = coachKeyOk(req as never);
    const safeCoaches = isCoach
      ? coaches
      : coaches.map(({ email: _email, phoneWechat: _phoneWechat, ...rest }) => rest);
    return res.status(200).json({ coaches: safeCoaches });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch coaches",
      ...(error.larkResponse ? { larkResponse: error.larkResponse } : {}),
      message: error.message,
    });
  }
}
