import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listClients } from "../server/db/repositories/clients.ts";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const clients = await listClients();
    return res.status(200).json({ clients });
  } catch (error: any) {
    return res.status(500).json({ error: "Could not fetch clients", message: error.message });
  }
}
