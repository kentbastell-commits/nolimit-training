import * as pg from "../pg/clients.ts";
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
    await pg.listClients();

  setCached("clients", clients, 10 * 60 * 1000);
  return clients;
}

export async function recordLogin(
  clientRecordId?: string,
  clientCode?: string
): Promise<WriteResult> {
  const result =
    await pg.recordLogin(clientRecordId, clientCode);
  if (result.success) invalidateCache("clients");
  return result;
}

export async function createClient(input: CreateClientInput): Promise<WriteResult> {
  const result =
    await pg.createClient(input);
  if (result.success) {
    invalidateCache("clients");
    invalidateCache("analytics");
  }
  return result;
}

// Portal recovery: exact Phone/WeChat match + fuzzy name check (so a phone
// number alone can't enumerate portals). Returns the client code or "".
export async function findClientByPhoneName(
  phone: string,
  name: string
): Promise<string> {
  return await pg.findClientByPhoneName(phone, name);
}

// Mini program WeChat binding: look up a client by bound openid, or bind an
// openid after the caller has re-verified phone+name via findClientByPhoneName.
export async function findClientByOpenid(openid: string): Promise<string> {
  return await pg.findClientByOpenid(openid);
}

export async function bindClientOpenid(
  clientCode: string,
  openid: string
): Promise<WriteResult> {
  const result =
    await pg.bindClientOpenid(clientCode, openid);
  if (result.success) invalidateCache("clients");
  return result;
}

export async function clientHasProgramAccess(
  clientCode: string,
  programId: string
): Promise<boolean> {
  return await pg.clientHasProgramAccess(clientCode, programId);
}

export async function updateClient(input: UpdateClientInput): Promise<WriteResult> {
  const result =
    await pg.updateClient(input);
  if (result.success) {
    invalidateCache("clients");
    invalidateCache("analytics");
  }
  return result;
}
