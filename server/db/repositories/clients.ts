import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/clients.ts";
import type { ClientDTO, UpdateClientInput, WriteResult } from "../dto.ts";

export async function listClients(): Promise<ClientDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/clients.ts");
    return pg.listClients();
  }
  return feishu.listClients();
}

export async function recordLogin(
  clientRecordId?: string,
  clientCode?: string
): Promise<WriteResult> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/clients.ts");
    return pg.recordLogin(clientRecordId, clientCode);
  }
  return feishu.recordLogin(clientRecordId, clientCode);
}

export async function updateClient(input: UpdateClientInput): Promise<WriteResult> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/clients.ts");
    return pg.updateClient(input);
  }
  return feishu.updateClient(input);
}
