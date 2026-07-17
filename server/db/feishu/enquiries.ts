// Feishu impl for the enquiries domain (in-person training enquiries) — logic
// moved verbatim from api/enquiries.ts / api/inPersonEnquiry.ts.
import { listRecords, createRecord } from "./client.ts";
import type { EnquiryDTO, CreateEnquiryInput } from "../repositories/enquiries.ts";
import type { WriteResult } from "../dto.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : item?.text || item?.name || ""
      )
      .join(", ");
  }
  return value?.text || value?.name || "";
}

export async function listEnquiries(): Promise<EnquiryDTO[]> {
  const items = await listRecords(process.env.FEISHU_ENQUIRIES_TABLE_ID as string);
  return items
    .map((item: any): EnquiryDTO => {
      const f = item.fields || {};
      return {
        recordId: item.record_id,
        enquiryId: fieldToText(f["Enquiry ID"]),
        contactPerson: fieldToText(f["Contact Person"]),
        contact: fieldToText(f["Contact"]),
        organization: fieldToText(f["Organization"]),
        athletes: fieldToText(f["Athletes"]),
        duration: fieldToText(f["Duration"]),
        notes: fieldToText(f["Notes"]),
        submittedDate: fieldToText(f["Submitted Date"]),
        status: fieldToText(f["Status"]),
      };
    })
    .sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
}

export async function createEnquiry(input: CreateEnquiryInput): Promise<WriteResult> {
  const fields: Record<string, any> = {
    "Enquiry ID": `ENQ-${Date.now()}`,
    "Contact Person": String(input.contactPerson || ""),
    Contact: String(input.contact || ""),
    Organization: String(input.organization || ""),
    Athletes: String(input.athletes || ""),
    Duration: String(input.duration || ""),
    Notes: String(input.notes || ""),
    "Submitted Date": new Date().toISOString().split("T")[0],
    Status: "New",
  };

  const data = await createRecord(
    process.env.FEISHU_ENQUIRIES_TABLE_ID as string,
    fields
  );

  if (data.code !== 0) {
    return {
      success: false,
      error: "Could not save enquiry",
      larkResponse: data,
      fieldsSent: fields,
    };
  }

  return { success: true, recordId: data?.data?.record?.record_id };
}
