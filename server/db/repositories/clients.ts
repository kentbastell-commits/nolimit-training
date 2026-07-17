import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/clients.ts";
import type { ClientDTO, UpdateClientInput, WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type CreateClientInput = {
  clientId?: string;
  name: string;
  email?: string;
  phone?: string;
  coach?: string;
  primaryCoachId?: string;
  secondaryCoachId?: string;
  clientType?: string;
  packageType?: string;
  packageName?: string;
  program?: string;
  subscriptionStatus?: string;
  intakeStatus?: string;
  paymentStatus?: string;
  purchasedProgramId?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  source?: string;
  paymentId?: string;
  languagePreference?: string;
  startDate?: string;
  notes?: string;
};

export async function listClients(): Promise<ClientDTO[]> {
  const cached = getCached<ClientDTO[]>("clients");
  if (cached) return cached;

  const clients =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/clients.ts")).listClients()
      : await feishu.listClients();

  setCached("clients", clients, 10 * 60 * 1000);
  return clients;
}

export async function recordLogin(
  clientRecordId?: string,
  clientCode?: string
): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/clients.ts")).recordLogin(clientRecordId, clientCode)
      : await feishu.recordLogin(clientRecordId, clientCode);
  if (result.success) invalidateCache("clients");
  return result;
}

export async function createClient(input: CreateClientInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/clients.ts")).createClient(input)
      : await feishu.createClient(input);
  if (result.success) {
    invalidateCache("clients");
    invalidateCache("analytics");
  }
  return result;
}

export async function updateClient(input: UpdateClientInput): Promise<WriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/clients.ts")).updateClient(input)
      : await feishu.updateClient(input);
  if (result.success) {
    invalidateCache("clients");
    invalidateCache("analytics");
  }
  return result;
}
