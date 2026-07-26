// In-person training enquiries (landing-page form → coach console list).
import * as pg from "../pg/enquiries.ts";
import type { WriteResult } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

export type EnquiryDTO = {
  recordId: string;
  enquiryId: string;
  contactPerson: string;
  contact: string;
  organization: string;
  athletes: string;
  duration: string;
  notes: string;
  submittedDate: string;
  status: string;
};

export type CreateEnquiryInput = {
  contactPerson?: string;
  contact?: string;
  organization?: string;
  athletes?: string;
  duration?: string;
  notes?: string;
};

export async function listEnquiries(): Promise<EnquiryDTO[]> {
  const cached = getCached<EnquiryDTO[]>("enquiries");
  if (cached) return cached;

  const rows =
    await pg.listEnquiries();

  setCached("enquiries", rows, 5 * 60 * 1000);
  return rows;
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<WriteResult> {
  const result =
    await pg.createEnquiry(input);
  if (result.success) invalidateCache("enquiries");
  return result;
}
