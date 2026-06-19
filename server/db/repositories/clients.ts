import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/clients.ts";
import type { ClientDTO } from "../dto.ts";

export async function listClients(): Promise<ClientDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/clients.ts");
    return pg.listClients();
  }
  return feishu.listClients();
}
