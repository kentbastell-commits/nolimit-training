// Postgres impl for the enquiries domain.
import { db } from "../client.ts";
import { enquiries } from "../schema.ts";
import { str } from "./_util.ts";
import type { EnquiryDTO, CreateEnquiryInput } from "../repositories/enquiries.ts";
import type { WriteResult } from "../dto.ts";

export async function listEnquiries(): Promise<EnquiryDTO[]> {
  const rows = await db.select().from(enquiries);
  return rows
    .map((r): EnquiryDTO => ({
      recordId: r.enquiryId, // business code is the identity on Postgres
      enquiryId: r.enquiryId,
      contactPerson: str(r.contactPerson),
      contact: str(r.contact),
      organization: str(r.organization),
      athletes: str(r.athletes),
      duration: str(r.duration),
      notes: str(r.notes),
      submittedDate: str(r.submittedDate),
      status: str(r.status),
    }))
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<WriteResult> {
  const enquiryId = `ENQ-${Date.now()}`;
  try {
    await db.insert(enquiries).values({
      enquiryId,
      contactPerson: String(input.contactPerson || ""),
      contact: String(input.contact || ""),
      organization: String(input.organization || ""),
      athletes: String(input.athletes || ""),
      duration: String(input.duration || ""),
      notes: String(input.notes || ""),
      submittedDate: new Date().toISOString().split("T")[0], // text column, same as Feishu
      status: "New",
    });
  } catch (e: any) {
    return {
      success: false,
      error: "Could not save enquiry",
      message: e?.message || String(e),
    };
  }
  return { success: true, recordId: enquiryId };
}
