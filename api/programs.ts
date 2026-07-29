import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listPrograms } from "../server/db/repositories/programs.ts";
import { coachKeyOk } from "./_coachAuth.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const programs = await listPrograms();
    // This endpoint is dual-use: the public store browses it AND the coach
    // console lists every 1:1/internal program from it (those are never
    // publicStoreVisible, so they can't just be filtered unconditionally).
    // Without the coach key, strip anything not actually published to the
    // store — draft/unlisted/private programs (price, sales copy, coachId)
    // were otherwise fully readable by anyone who called this directly.
    const visible = coachKeyOk(req as never)
      ? programs
      : programs.filter((p) => p.publicStoreVisible);
    return res.status(200).json({ programs: visible });
  } catch (error: any) {
    if (error.kind === "token") {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: error.larkResponse,
      });
    }
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
