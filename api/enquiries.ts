import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listEnquiries } from "../server/db/repositories/enquiries.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const enquiries = await listEnquiries();
    return res.status(200).json({ enquiries });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
