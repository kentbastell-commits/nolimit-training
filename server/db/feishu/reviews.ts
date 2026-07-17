// Feishu impl for the reviews domain — logic moved verbatim from api/reviews.ts.
import { listRecords, getFieldNames, createRecord, updateRecord } from "./client.ts";
import type {
  ReviewDTO,
  CreateReviewInput,
  UpdateReviewInput,
} from "../repositories/reviews.ts";
import type { WriteResult } from "../dto.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

function toBool(value: any): boolean {
  return value === true || fieldToText(value).toLowerCase() === "true";
}

function normalizeDate(value: any) {
  const text = fieldToText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

function toLarkDate(value: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  return new Date(`${value}T12:00:00Z`).getTime();
}

function tableId(): string {
  return process.env.FEISHU_REVIEWS_TABLE_ID as string;
}

function filterFields(fields: Record<string, any>, available: Set<string> | null) {
  const out: Record<string, any> = {};
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (available && !available.has(name)) continue;
    out[name] = value;
  }
  return out;
}

// [] from the shared helper means the fields fetch failed — the legacy handler
// treated that as "unknown schema, keep everything" (null Set).
async function availableFields(): Promise<Set<string> | null> {
  const names = await getFieldNames(tableId());
  return names.length ? new Set(names) : null;
}

export async function listAllReviews(): Promise<ReviewDTO[]> {
  const items = await listRecords(tableId());
  return items.map((item: any): ReviewDTO => {
    const f = item.fields || {};
    return {
      recordId: item.record_id,
      reviewId: fieldToText(f["Review ID"]),
      clientId: fieldToText(f["Client ID"]),
      clientName: fieldToText(f["Client Name"]),
      programId: fieldToText(f["Program ID"]),
      programName: fieldToText(f["Program Name"]),
      rating: Number(fieldToText(f.Rating)) || 0,
      quote: fieldToText(f.Quote),
      showOnStore: toBool(f["Show On Store"]),
      approved: toBool(f.Approved),
      submittedDate: normalizeDate(f["Submitted Date"]),
    };
  });
}

// Coach update (approve / toggle store visibility) on an existing review.
export async function updateReview(input: UpdateReviewInput): Promise<WriteResult> {
  const available = await availableFields();
  const updates: Record<string, any> = {};
  if (input.approved !== undefined) updates.Approved = Boolean(input.approved);
  if (input.showOnStore !== undefined) {
    updates["Show On Store"] = Boolean(input.showOnStore);
  }
  const fields = filterFields(updates, available);
  if (Object.keys(fields).length === 0) {
    return { success: false, error: "No fields to update" };
  }
  const data = await updateRecord(tableId(), input.recordId, fields);
  if (data.code !== 0) {
    return { success: false, error: "Could not update review", larkResponse: data };
  }
  return { success: true, recordId: input.recordId };
}

// New review from a client (lands unapproved).
export async function createReview(input: CreateReviewInput): Promise<WriteResult> {
  const available = await availableFields();
  const candidate: Record<string, any> = {
    "Review ID": `REV-${Date.now()}`,
    "Client ID": input.clientId ? String(input.clientId) : undefined,
    "Client Name": input.clientName ? String(input.clientName) : undefined,
    "Program ID": input.programId ? String(input.programId) : undefined,
    "Program Name": input.programName ? String(input.programName) : undefined,
    Rating: Number(input.rating) || undefined,
    Quote: input.quote ? String(input.quote) : undefined,
    "Show On Store": Boolean(input.showOnStore),
    Approved: false,
    "Submitted Date": toLarkDate(new Date().toISOString().split("T")[0]),
  };
  const fields = filterFields(candidate, available);

  const data = await createRecord(tableId(), fields);
  if (data.code !== 0) {
    return {
      success: false,
      error: "Could not create review",
      larkResponse: data,
      fieldsSent: fields,
    };
  }
  return { success: true, recordId: data.data.record.record_id };
}
