import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DATA_BACKEND } from "../server/db/backend.ts";
import { listEnquiries } from "../server/db/repositories/enquiries.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Feishu needs its table id; on Postgres the env var is irrelevant. An
  // unconfigured table has always meant "no enquiries yet", not an error.
  if (DATA_BACKEND === "feishu" && !process.env.FEISHU_ENQUIRIES_TABLE_ID) {
    return res.status(200).json({ enquiries: [] });
  }

  try {
    const enquiries = await listEnquiries();
    return res.status(200).json({ enquiries });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
